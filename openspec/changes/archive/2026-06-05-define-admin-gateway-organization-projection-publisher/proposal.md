## Why

`define-admin-organization-master-model` 已经把 admin 侧组织主数据、SourceConnection、ExternalIdentity、lifecycle、orgVersion/scopeVersion 和 Insight provider fixture 合入 `test`，但它尚未产出 `aicodex-api / ai-gateway` ingestion 可直接消费的 projection batch。

api 侧 `define-gateway-organization-authorization-projection` 已实现 `/api/gateway-organization-projection/v1/batches` 的 ingestion DTO、幂等校验、freshness 校验和服务间鉴权；下一步需要 admin 作为 producer/publisher，把平台组织主模型转换为 gateway 授权投影批次，才能进入端到端联调。

## What Changes

- 新增 admin-to-gateway organization projection publisher 能力，负责从平台组织主模型构建 gateway projection batch。
- 定义 admin 字段到 api `ProjectionBatch` / `ProjectedSubject` 的稳定映射：
  - `projectionBatchId`
  - 数值型 `orgVersion`
  - `generatedAt`
  - `freshness.expiresAt`
  - `lineage.sourceService/sourceVersion/digest`
  - `subjects[].stableSubjectId/apiSubjectId/subjectType/organizationId/departmentIds/roleIds/positionIds/lifecycleStatus/projectionVersion/orgVersion/freshnessExpiresAt`
- 新增 projection push client，使用独立服务间 Bearer token 调用 `POST /api/gateway-organization-projection/v1/batches`，请求体固定 `caller=aicodex-admin`。
- 新增 contract fixture 和可重复联调脚本，用于 api agent 对 admin producer 输出做 contract test。
- 新增 publisher 审计、错误分类和 retry/fail-closed 语义，确保 projection 未发布或发布失败时不会被误判为 gateway 授权事实已就绪。
- 明确本 change 不新增 UI 菜单入口；如后续需要同步状态运维页，另开 change。

## Capabilities

### New Capabilities

- `admin-gateway-organization-projection-publisher`: 定义 admin 从平台组织主模型构建并推送 gateway organization projection batch 的契约、字段映射、版本/新鲜度、服务间鉴权、fixture 和验证边界。

### Modified Capabilities

- 无。现有 `admin-organization-master-model`、`wecom-organization-sync`、`organization-management-scope`、`insight-admin-provider-wrapper` 和 `wecom-usage-identity-mapping` 的长期语义不在本 change 中修改；本 change 只消费这些能力已合入的主模型和 provider 前提。

## Impact

- 影响 admin 后端组织模型投影层、gateway projection client、配置项、审计日志、测试 fixture 和 OpenSpec 文档。
- 依赖 `aicodex-api / ai-gateway` 已定义的 projection ingestion contract；如果 api 字段、错误码或 freshness/version 语义变化，admin 必须先记录 contract gap，不私自发明字段。
- 需要新增服务间配置项，例如 gateway projection endpoint、projection token、caller、timeout、freshness TTL 和可选 enable 开关；真实 token 不得提交到仓库。
- 不影响 Insight report scope provider，不把 `apiUserIds` 报表范围当 gateway 授权事实。
- 不实现 gateway runtime allow/deny、resource authorization facts、授权审计展示或 api 侧 ingestion 存储。
