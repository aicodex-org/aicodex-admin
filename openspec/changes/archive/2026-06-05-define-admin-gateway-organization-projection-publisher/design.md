## Context

`define-admin-organization-master-model` 已合入 `test`，admin 现在已经有平台组织主模型、WeCom source adapter 投影、SourceConnection、ExternalIdentity、PlatformUser、PlatformDepartment、PlatformMembership、LifecycleEvent、OrgSyncBatch 和 Insight provider fixture。

api 侧 `define-gateway-organization-authorization-projection` 已定义并实现首版 ingestion 入口：

```text
POST /api/gateway-organization-projection/v1/batches
```

请求体核心 contract 来自 `aicodex-api / ai-gateway` 的 `ProjectionBatch`：

- `projectionBatchId`
- `orgVersion`：int64
- `generatedAt`
- `freshness.expiresAt`
- `lineage.sourceService/sourceVersion/digest`
- `subjects[]`
  - `stableSubjectId`
  - `apiSubjectId`
  - `subjectType`
  - `organizationId`
  - `departmentIds`
  - `roleIds`
  - `positionIds`
  - `lifecycleStatus`
  - `projectionVersion`
  - `orgVersion`
  - `freshnessExpiresAt`

当前缺口在 admin：已有 `orgv-*` 字符串版本和 Insight 报表 scope fixture，但没有 gateway projection batch producer，也没有服务间 push client。Insight `apiUserIds` 是报表范围字段，不是 gateway runtime authorization fact；本 change 必须单独定义 gateway projection 输出。

## Goals / Non-Goals

**Goals:**

- 从 admin 平台组织主模型构建 api ingestion 可直接消费的 `ProjectionBatch`。
- 固定 admin 字段到 gateway projection DTO 的映射、版本、新鲜度和 lineage 语义。
- 增加服务间 push client，使用独立 projection token 和 `caller=aicodex-admin`。
- 提供 contract fixture，使 api agent 可以不依赖真实环境先做 ingestion contract test。
- 提供脱敏的本地/测试环境联调脚本，验证 builder 输出、HTTP push、idempotency 和错误分类。
- 在发布失败、映射缺失、lifecycle 不可用或 API 返回拒绝时 fail closed，并留下可审计日志。

**Non-Goals:**

- 不实现 gateway runtime allow/deny。
- 不实现 gateway-owned resource authorization facts。
- 不修改 api ingestion DTO、错误码或存储。
- 不把 Insight report scope、`departments[].apiUserIds` 或 current-user provider 响应当作 gateway 授权事实。
- 不新增 UI 菜单、同步状态页面或人工补偿页面。
- 不引入钉钉、飞书、LDAP、HR、北森或客户自建 adapter 的专用字段。

## Decisions

### 1. 新增独立 projection builder，而不是复用 Insight scope provider

Gateway projection builder 直接读取平台组织主模型：

- `PlatformUser`
- `PlatformDepartment`
- `PlatformMembership`
- `ExternalIdentity`
- `SourceConnection`
- `OrgSyncBatch`

Insight scope provider 仍只服务报表范围。builder 不读取 Insight `scopeType`、`DepartmentScope`、`apiUserIds` 聚合结果，也不复用 insight provider 的授权分支。

原因：

- gateway projection 是 runtime authorization 输入，必须表达完整主体快照和生命周期。
- Insight scope 是当前用户视角的报表查询范围，不能成为 gateway 授权事实。
- 两者可以共享底层身份映射 helper，但不能共享语义输出。

### 2. Gateway `orgVersion` 使用独立 int64 projection version

admin 现有 `PlatformVersionMetadata.OrgVersion` 是 `orgv-*` 字符串哈希，继续作为 admin source snapshot 标识写入 `lineage.sourceVersion`。api ingestion 需要 int64 `orgVersion`，本 change 定义独立的 gateway projection version：

```text
gatewayOrgVersion = projection source batch finishedAt UTC Unix milli
```

规则：

- 优先使用 `OrgSyncBatch.FinishedAt`。
- 如果没有可用 sync batch，使用 projection `generatedAt`。
- `projectionBatchId` 必须包含 organization、source batch、gatewayOrgVersion 或 digest 前缀，保证同一 source snapshot 可幂等重放。
- `lineage.sourceVersion` 写 admin 的 `OrgSyncBatch.OrgVersion` 或 `PlatformVersionMetadata.OrgVersion` 字符串。
- 后续如果需要跨来源乱序重放或人工 rebuild，再引入显式 per-organization projection checkpoint；P0 不先加复杂状态机。

这样可以满足 api 的旧版本拒绝语义，同时避免把 `orgv-*` 字符串强转为数字。

### 3. Subject 映射只发布确定身份

每个 `ProjectedSubject` 只来自确定的 admin user：

| Gateway 字段 | Admin 来源 |
| --- | --- |
| `stableSubjectId` | `PlatformUser.AdminSubject`，缺失时使用稳定 local user id |
| `apiSubjectId` | 明确的 `aicodexApiUserId` / `aicodex_api_user_id` / `apiUserId` 或已确认 resolver 结果 |
| `subjectType` | P0 固定 `user` |
| `organizationId` | admin platform organization id |
| `departmentIds` | active `PlatformMembership.DepartmentId` 去重集合 |
| `roleIds` | P0 从兼容角色映射读取；无确定映射时为空数组 |
| `positionIds` | P0 从兼容 title/position 映射读取；无确定映射时为空数组 |
| `lifecycleStatus` | admin lifecycle 小写映射 |
| `projectionVersion` | subject 输入字段、departmentIds、roleIds、positionIds、lifecycle 和 gatewayOrgVersion 的稳定 digest |
| `orgVersion` | batch 级 gatewayOrgVersion |
| `freshnessExpiresAt` | batch freshness 过期时间 |

缺少 `apiSubjectId`、ExternalIdentity 未确认、mappingStatus 为 `PENDING_REVIEW` / `DUPLICATE` / `CONFLICTED` / `DISABLED`、lifecycle 不可判定的用户不进入 subjects。publisher 必须在审计日志和 summary 中记录 skipped counts 和 reason，不得猜测映射。

### 4. 生命周期映射按 fail-closed 处理

Admin lifecycle 到 gateway lifecycle 的映射：

| Admin | Gateway |
| --- | --- |
| `ACTIVE` | `active` |
| `DISABLED` | `disabled` |
| `DELETED` | `deleted` |
| `CONFLICTED` | `conflicted` |
| `UNKNOWN` / `STALE` / 空值 | `unknown` |

P0 不把 lifecycle 不可判定的主体映射为 active。对于非 active 或 unknown subject，是否发布取决于是否有确定 gateway 主体：

- 如果用户有确定 `apiSubjectId`，可以发布 `disabled/deleted/conflicted/unknown`，使 gateway 失效或拒绝该主体。
- 如果用户缺少确定 `apiSubjectId`，不发布 subject，并记录 `mapping_missing`。

builder 不把 unknown/stale 映射为 active。

### 5. Freshness 和 digest 由 builder 统一生成

`freshness.expiresAt` 和 `subjects[].freshnessExpiresAt` 使用同一个 TTL 策略：

```text
freshnessExpiresAt = generatedAt + configuredFreshnessTTL
```

默认 TTL 由配置提供；测试 fixture 使用固定时间，避免快照不可重复。

`lineage.digest` 使用规范化 JSON 的 sha256：

- 先按 `stableSubjectId` 排序 subjects。
- subject 内 `departmentIds`、`roleIds`、`positionIds` 排序去重。
- digest 输入包含 batch orgVersion、sourceVersion、freshnessExpiresAt 和 subjects。
- 输出格式为 `sha256:<hex>`。

digest 只用于 lineage 和差异诊断，不包含 token、密码、Cookie、手机号、邮箱或真实环境地址。

### 6. Push client 使用独立服务间配置

新增配置项应保持私有值不入库：

- gateway projection endpoint
- projection token
- caller，默认 `aicodex-admin`
- request timeout
- freshness TTL
- enable 开关

HTTP request：

- `Authorization: Bearer <projection-token>`
- `Content-Type: application/json`
- body 顶层包含 `traceId`、`caller` 和 `ProjectionBatch`

client 行为：

- `2xx success=true` 且 `data.accepted=true` 或 `data.idempotent=true` 视为成功。
- `401/403` 视为配置或凭据错误，不自动重试。
- `400` 的 `projection_expired`、`projection_older_org_version`、`projection_lineage_missing` 或 `invalid_argument` 视为 contract/build 错误，不自动重试。
- 网络超时、`5xx` 或 API unavailable 可以有限重试；重试必须幂等，不能生成新的 `projectionBatchId`。

### 7. 触发方式先后端能力优先

P0 实现后端 builder/client 和脚本触发，不新增 UI：

- 同步成功后可以由服务层调用 publisher。
- 提供内部 service 方法和测试脚本用于手动联调。
- 如需定时补偿、状态查询或运维页面，后续单独 change。

### 8. Fixture 是三边 contract 锚点

新增 fixture 目录：

```text
openspec/changes/define-admin-gateway-organization-projection-publisher/fixtures/gateway-projection/
```

建议包含：

- `projection-batch.json`
- `projection-batch-minimal.json`
- `README.md`

fixture 必须：

- 使用脱敏组织和用户标识。
- 不包含真实环境 IP、URL、token、账号或客户数据。
- 明确 `lineage.sourceService=aicodex-admin`。
- 明确 `lineage.sourceVersion` 是 admin 字符串版本，`orgVersion` 是 gateway int64 projection version。

api/insight 如发现 fixture 字段不足，应提出 contract gap，不私自扩展字段。

## Risks / Trade-offs

- [admin 字符串 orgVersion 与 api int64 orgVersion 语义混淆] -> 明确分离：字符串进入 lineage.sourceVersion，int64 只用于 gateway projection version。
- [缺少 apiSubjectId 导致主体不发布] -> fail closed，并在 summary/audit 中记录 skipped counts；不得用昵称、手机号、邮箱或 Insight scope 结果猜测。
- [同步成功但 push 失败] -> 记录失败状态和可重试错误；gateway runtime 不得认为 projection 已就绪。
- [多来源或乱序批次导致旧版本拒绝] -> P0 使用 source batch finishedAt 形成单调版本；复杂 replay/rebuild 后续用 checkpoint change 解决。
- [配置泄漏] -> token、endpoint 和真实环境信息只来自环境变量或本机 secrets；文档、fixture 和验证记录必须脱敏。

## Migration Plan

1. 在 admin 工作分支新增 projection builder、client、fixture 和 tests。
2. 先用 fixture 与 api agent 对齐 contract。
3. 在本地或已批准测试环境用脱敏脚本执行 push smoke，校验 `accepted/idempotent`。
4. 默认不开启自动同步后 push，先通过配置开关灰度。
5. 验证通过后再考虑把成功 WeCom sync 后触发 push 作为默认路径。

## Open Questions

- 无阻塞问题。若 api ingestion DTO、错误码或 freshness/version 语义后续变化，admin 记录 contract gap 并同步调整本 change。
