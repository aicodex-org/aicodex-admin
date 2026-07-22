## Why

当前 `GET /api/organization-sync/export` 仍以 legacy `organization + groups + applications` 输出字符串成员和单值 manager，虽然 Admin 已持有 `SourceConnection`、`ExternalIdentity`、`PlatformMembership`、部门负责人和直属上级事实，却在 Gateway pull 时丢失真实来源 lineage、多部门、生命周期和显式关系。`aicodex-api` 的配套多租户 change 已定义并接受 organization sync contract v2，因此需要由 Admin 作为 producer 输出该契约，同时保留旧客户端只读兼容。

## What Changes

- 为组织同步 export 增加显式 `contractVersion=v2` 协商；未请求 v2 的客户端继续获得现有 legacy response，不做静默破坏性切换。
- v2 snapshot 输出真实 `sourceConnectionId/sourceType/sourceTenantId`、source org version/batch、generated/freshness 与 lineage digest，不再把企业微信来源折叠为 `custom admin:<organization>`。
- 从 Admin 主模型输出稳定 external identity、成员 lifecycle/mapping、全部 active/非 active department relations、source-scoped `isMain`、来源 role/position，以及显式 `departmentLeaderRelations[]`。
- 对企业微信输出显式 `directLeaderRelations[]`，每条关系携带 leader/subordinate 稳定主体、source connection/version/batch 与 lifecycle；不从职位、部门层级、同部门或 display name 推断。
- v2 只接受同组织、current source lineage 下可解释的主模型事实；冲突、缺失稳定身份或来源不可信的数据以稳定 blocked/skipped reason 表达，不伪造成 active 授权事实。
- 响应和测试保证不输出 API Key、secret、配置引用、邮箱、手机号或完整来源 payload；日志只记录 contract/source/version/count/reason 摘要。

## Capabilities

### New Capabilities

无。

### Modified Capabilities

- `organization-sync-api-keys`: 将 key-bound export 从仅有 legacy 组织/群组读取扩展为可协商的 contract v2 source-lineage、稳定身份、多部门、负责人和直属上级快照，同时保持 legacy response 只读兼容。

## Impact

- Admin 后端：`admin/object/organization_sync_api_key.go`、平台组织主模型查询、企业微信显式关系读取与脱敏 helper。
- API：`GET /api/organization-sync/export?contractVersion=v2` 返回新的版本化 DTO；省略参数时响应保持原样。
- 测试：object/controller/route contract tests，覆盖多部门、main、department/direct leader、disabled lifecycle、identity conflict、真实 source lineage、legacy 兼容和敏感字段扫描。
- 下游：与 `aicodex-api` change `establish-tenant-membership-rbac-and-isolation` 的 Gateway admin pull contract negotiation 配对实施。
