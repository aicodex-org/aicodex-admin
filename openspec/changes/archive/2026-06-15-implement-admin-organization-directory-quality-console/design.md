## Goals

- 让 operator 在 Admin 内只读定位组织目录质量问题，最小闭环包括列表、筛选、详情和修复提示。
- 复用 Admin 已有平台组织主模型和 quality readiness aliases，使汇总与明细解释一致。
- 将目录质量明细限定为 producer diagnostics，不把结果包装成 Gateway 或 Insight 的运行时事实。

## Non-Goals

- 不触发 gateway projection publish，不调用 Gateway ingestion 写接口。
- 不读取 API、Gateway 或 Insight 内部数据库，也不推断下游授权状态。
- 不新增飞书或企业微信同步能力，不写真实租户 fixture，不落库真实组织 payload。
- 不改 publish attempt history 存储、列表或已完成控制台。

## Backend Design

新增 `OrganizationDirectoryQualityService`，输入为 `OrganizationDirectoryQualityQuery`：

- `OrganizationId` 必填；空 organization 返回空列表和 `ready`/empty summary，不跨组织扫描。
- `EntityType` 支持 `department`、`user`、`membership`，默认 `department`。
- 筛选支持 `Keyword`、`SourceType`、`SourceConnectionIdHash`、`QualityStatus`、`ReasonCode`、`LifecycleStatus`、`Page`、`PageSize`。

service 从 Admin-owned store 读取：

- `PlatformDepartment`、`PlatformUser`、`PlatformMembership`
- `SourceConnection`、`OrgSyncBatch`
- `ExternalIdentity`、`PlatformApiUserMapping`（用于用户映射质量提示）

每条记录生成：

- `entityType`、`entityId`、`displayName`、`organizationId`
- `sourceType`、`sourceConnectionIdHash`、`externalIdHash`
- `syncBatchId`、`orgVersion`、`sourceVersion`
- `lifecycleStatus`、`qualityStatus=ready|warning|blocked`
- `reasonCodes` 和 `remediationHints`
- `detail` 中的脱敏关系摘要，例如 parent department、本用户 membership counts、membership 的 user/department 存在性。

质量状态按 fail-closed 风险分层：

- Department blocked：来源连接缺失/禁用/不可用、重复来源 key、active 部门缺少来源 key。
- Department warning：orphan parent、stale source、非 active lifecycle。
- User blocked：active user 缺少 admin subject、重复 admin subject、缺少/不可信 API user mapping、lineage freshness unavailable。
- User warning：非 active lifecycle、mapping disabled/tombstone、来源 stale。
- Membership blocked：active membership 缺少 active user 或 active department、来源连接缺失/禁用/不可用。
- Membership warning：非 active lifecycle、source stale、非阻断的部门缺口。

blocked 优先级高于 warning；没有 reason code 时为 ready。reason code 使用现有 readiness alias 命名，必要时只新增目录明细专属的稳定 code。

## API Design

新增：

`GET /api/organization-master-data-quality/directory`

Query params：

- `organization`
- `entityType`
- `keyword`
- `sourceType`
- `sourceConnectionIdHash`
- `qualityStatus`
- `reasonCode`
- `lifecycleStatus`
- `p`
- `pageSize`

响应通过现有 `ResponseOk` 包装，核心 data：

- `organizationId`
- `entityType`
- `generatedAt`
- `page`、`pageSize`、`total`
- `summary`：ready/warning/blocked/total 计数
- `items[]`
- `reasonAliases[]`

错误处理：

- store 读取失败返回现有 controller error 响应。
- 无匹配记录返回 `items=[]`、`total=0`，不是错误。
- 未知 `entityType`、`qualityStatus`、分页参数越界等非法参数返回现有 controller error 响应，避免 operator 把输入错误误判为无质量问题。
- 所有查询必须带入 organization scope；空 organization 仅返回空结果，不跨组织扫描。

## Frontend Design

新增 `OrganizationDirectoryQualityPage`，放入 Admin 管理工具菜单，入口文案为“组织目录质量”。

页面结构：

- 顶部组织选择/输入和刷新按钮。
- 紧凑筛选条：实体类型、质量状态、reason code、生命周期、来源类型、keyword。
- 表格：状态、类型、名称/本地 ID、来源、版本/批次、reason codes、更新时间或摘要。
- 详情 Drawer：脱敏来源摘要、关系摘要、reason codes、修复提示。
- 空态和错误态清楚区分：无数据、无匹配、接口错误。

UI 不展示完整组织树、不展示手机号/邮箱、不展示原始外部 profile。

## Verification Strategy

- OpenSpec：target change strict、all changes strict、all specs strict。
- Go：service tests 覆盖 department/user/membership 分类、筛选、分页、脱敏、empty/error；controller/router focused tests 覆盖 API 查询和错误路径。
- Frontend：backend wrapper URL 参数测试、页面列表/筛选/详情/空态测试、build。
- 覆盖率：记录受影响 Go package 和前端测试覆盖情况；若仓库工具无法给出 changed-file coverage，记录 package/module coverage 和剩余风险。
