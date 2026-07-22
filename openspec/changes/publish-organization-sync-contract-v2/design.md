## Context

Admin 已经持有 source-neutral 的 `PlatformOrganization`、`PlatformUser`、`PlatformDepartment`、`PlatformMembership`、`SourceConnection`、`ExternalIdentity` 和 `OrgSyncBatch`。企业微信同步还持久化了明确的 `WecomUserDirectLeader`；`PlatformMembership.IsManager` 表达部门负责人，`IsMain` 表达 source-scoped 主部门。现有 export 却只调用 `GetOrganizationSyncSnapshot`，返回 legacy `Group.Users[]` 和单值 `Group.Manager`，Gateway 随后把来源重写为 `custom admin:<organization>`，导致 lineage、生命周期、多部门和显式上下级语义全部丢失。

配套的 `aicodex-api` change 已把 Gateway organization UUID 定义为租户边界，并要求只有 contract v2 的稳定身份和显式关系才能形成 membership、role mapping 或 managed scope。Admin 是 producer，只负责发布 Admin-owned current facts；它不能写 Gateway authorization facts，也不能使用 display metadata 猜测身份或上下级。

## Goals / Non-Goals

**Goals:**

- 通过显式协商发布稳定、可验证、可回退的 organization sync contract v2。
- 保留真实 source connection/type/tenant、source org version/batch、freshness 和 lineage。
- 完整表达成员稳定 external identity、lifecycle/mapping、多部门、source-scoped main、source role/position、department leader 和 direct leader。
- 让冲突、stale、disabled、缺失 identity 等状态保持 fail closed 且可诊断。
- 保持 legacy export 的响应结构和授权边界不变。

**Non-Goals:**

- 不在 Admin 内创建 Gateway membership、tenant role、capability 或 runtime group policy。
- 不从邮箱、手机号、姓名、职位文本、部门父子关系或旧单值 manager 推断身份或上下级。
- 不在本 change 修改 Gateway ingestion；该工作由配套 API change 承担。
- 不删除 `groups/users/manager` legacy 字段和 endpoint。

## Decisions

### 1. 使用 query 协商，默认保持 legacy

`GET /api/organization-sync/export` 在 `contractVersion=v2` 时返回 v2；缺失参数时继续返回现有 legacy response。未知版本返回稳定错误，不回退到 legacy，以免请求 v2 的 Gateway 在字段缺失时继续授权。

采用同一路径是为了复用 key-bound organization 授权、使用审计和部署配置。备选方案是新增 `/v2` 路径；它会复制 router/authz allowlist 并增加迁移维护面，因此不采用。

### 2. 一个 v2 snapshot 只表达一个真实 source connection

请求 MAY 携带 `sourceConnectionId`。若组织只有一个 current active connection，可省略；若存在多个而未明确选择，Admin 失败关闭并返回 `source_connection_selection_required`，不把多个来源合并成虚假的单一 lineage。返回顶层包含：

- `contractVersion=v2`
- `sourceConnectionId/sourceType/sourceTenantId`
- `sourceOrgVersion/batchId`
- `generatedAt/freshnessExpiresAt`
- `lineage.sourceService/sourceVersion/digest`
- organization、departments、memberRelations、departmentLeaderRelations、directLeaderRelations、masked applications

这使 Gateway 可以按真实 source ownership 处理角色撤销和多来源冲突。备选方案是一次返回 `sources[]`；当前 Gateway admin pull 以单批次/单 connection 处理，直接合并会让 authorization version 和 source ownership 变得含糊，因此先使用显式 connection selection。

### 3. v2 只从平台主模型构建

- Department 来自同 organization、同 source connection 的 `PlatformDepartment`。
- Member relation 来自同 source 的 `PlatformMembership`，并连接 `PlatformUser` 与 `ExternalIdentity`。
- active 身份只接受 `ExternalIdentity.MappingStatus=CONFIRMED`；disabled/tombstone 可输出明确 lifecycle，但不能伪造成 active。
- source role/position 只读取已确认 `PlatformApiUserMapping.Lineage.roleIds/positionIds`；缺失时输出空数组，不从职位/display text 猜测。
- department leader 只来自 `PlatformMembership.IsManager=true`。
- direct leader 只来自 enabled 的 `WecomUserDirectLeader`，并通过 confirmed WeCom external identity 解析 leader/subordinate stable subject。

Legacy `Group.Manager` 和 `Group.Users` 仅保留在 legacy response，不进入 v2 authoritative relation。

### 4. current snapshot 与 lineage 必须一致

Builder 先选择 active/fresh `SourceConnection` 和其 `LastSeenBatchId` 对应的 `OrgSyncBatch`。batch 必须属于同 organization/connection，状态为 `SUCCEEDED/PARTIAL`，且 source org version 非空。Department/user/membership 的 `SourceConnectionId` 和 `OrgVersion` 必须与选中 snapshot 一致；不一致记录进入稳定 skipped reason，不混入 current facts。

`lineage.digest` 对排序后的安全 DTO 计算 SHA-256；digest 输入不包含 API Key、secret/config ref、邮箱、手机号或完整来源 payload。`freshnessExpiresAt` 使用 latest batch 完成时间（无完成时间时使用生成时间）加固定短 TTL，且 connection freshness 非 `FRESH` 时 v2 builder 失败关闭。

### 5. 响应字段最小化并稳定排序

Member relation 只输出 stable subject/external identity、department、main、lifecycle/mapping、role/position 和 source version/batch。Department/direct leader relation 只输出稳定 subject，不输出 display name、邮箱、手机号或本地用户主键。所有数组按 natural key 排序并去重，保证相同 snapshot 产生相同 digest 和幂等 payload。

## Risks / Trade-offs

- [组织同时有多个 source connections，旧 pull 未选择] → v2 返回 `source_connection_selection_required`，控制台/配置显式保存 connection；绝不自动取最后一条。
- [旧平台记录缺少 source connection/org version] → 仅 legacy 可读，v2 以稳定 skipped/blocked reason 拒绝授权级输出。
- [企业微信 direct leader 表使用外部 user id] → 必须通过同 connection confirmed `ExternalIdentity` 转换为 stable admin subject；无法唯一解析时跳过并计数。
- [fixed freshness TTL 与来源策略不同] → 初期采用短 TTL 且 fail closed；后续可在显式 contract 字段稳定后配置化。
- [contract v2 响应更大] → 只返回一个 source connection、稳定排序、无完整来源 payload；1000+ member fixture 纳入性能测试。
- [legacy 客户端受影响] → 无 `contractVersion=v2` 时执行原函数和原 DTO，增加回归快照测试。

## Migration Plan

1. 新增 v2 DTO、纯 builder 和 current source snapshot loader，先以 fixture/unit tests 固化字段与脱敏边界。
2. controller 增加 query negotiation；legacy 默认路径保持不变。
3. 与 Gateway 配套 change 联调 v2，验证 unknown/missing contract、多个 source、stale lineage 和关系撤销。
4. Gateway allowlist 组织先显式请求 v2；观测稳定后停止授权级 legacy 消费，但 Admin legacy response 继续只读保留。

回滚时 Gateway 停止请求 v2；Admin legacy endpoint 不变。已经由 v2 形成的 Gateway membership/role 撤销必须继续遵循 Gateway source ownership，不通过回滚 Admin response 删除。

## Open Questions

1. 多 source organization 是否在后续 contract v3 改为单响应 `sources[]`，由 Gateway 原子消费多个 source batch。
2. 非 WeCom provider 的 direct leader 何时统一物化为 source-neutral reporting relation；本 change 只发布已有明确且可验证的关系。
