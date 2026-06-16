# Design

## 目标

本 change 的目标是让后续 60 验证可以明确区分两类结果：

1. producer observability 可诊断：接口可访问，publisher/refresh/latest audit 可见。
2. publishable subject fixture 就绪：latest audit 至少包含一个可发布 subject，并且 active/tombstone count 与受控 fixture 预期一致。

## 非目标

- 不自动写入 60 数据库 fixture。
- 不增加 API/Insight 逻辑。
- 不新增 gateway authorization facts、权限矩阵或 runtime audit 写入。
- 不让 API/Insight 消费 admin 管理页面组织树 JSON 或 observability JSON。
- 不使用 `displayName`、手机号、邮箱、旧 lineage、Insight report scope 或部门报表 `apiUserIds` 猜测 `apiSubjectId`。

## 决策

### active subject readiness

active subject 必须同时满足：

- `PlatformUser.OrganizationId` 指向目标组织。
- `PlatformUser.AdminSubject` 稳定且非空；如果缺失，只能由现有代码从平台本地 ID 生成稳定主体，不能用展示名作为 join key。
- `PlatformUser.LifecycleStatus=ACTIVE`。
- `PlatformUser.MappingStatus=CONFIRMED`。
- 存在同 `organizationId + adminSubject` 的 `PlatformApiUserMapping`。
- `PlatformApiUserMapping.MappingStatus=CONFIRMED`。
- `PlatformApiUserMapping.ApiUserId` 非空。
- 组织快照存在可用 `OrgSyncBatch.OrgVersion/FinishedAt` 或其他可用 source version，保证 lineage/sourceVersion 可判定。

### tombstone subject readiness

tombstone subject 用于显式撤销或收敛 gateway runtime 覆盖，不用于扩大 active 授权范围。它必须满足：

- `PlatformUser.LifecycleStatus` 为 `DISABLED`、`DELETED`、`CONFLICTED`、`UNKNOWN` 或 `STALE`。
- `PlatformUser.MappingStatus` 对该 lifecycle 可信；`DISABLED` 可用于非 active tombstone。
- 存在同 `organizationId + adminSubject` 的 `PlatformApiUserMapping.ApiUserId`。
- `PlatformApiUserMapping.MappingStatus` 为 `CONFIRMED` 或 `DISABLED`。

### 60 fixture 验证方式

仓库只提供 operator checklist 和可选 smoke 断言，不提交真实 fixture 数据。60 写入或数据库明细查询必须由用户明确授权，并在私有运维上下文执行。

Bruno smoke 默认仍是只读 readiness；只有私有环境显式设置变量时才强制断言：

- `gatewayProjectionRequireLatestAudit=true`
- `gatewayProjectionMinSubjectCount=1`
- `gatewayProjectionMinTombstoneSubjectCount=1`，仅在准备 tombstone fixture 时设置

## 风险和缓解

- 风险：没有真实 60 写入授权时，无法证明 60 当前已有 publishable subject。
  - 缓解：verification 明确记录“未执行写入”，并提供 operator checklist。
- 风险：后续 agent 误把旧 lineage 或展示字段当 join key。
  - 缓解：主规格和 README 明确 runtime 只消费一等 `PlatformApiUserMapping`。
