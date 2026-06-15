## Context

现有 Admin projection operator 能力包括：

- `GatewayProjectionPublisherConfig`：Admin 到 Gateway projection ingestion 的服务间 endpoint/token/timeout/retry 配置。
- `GatewayProjectionRunReadinessService`：Admin-only dry-run、run diff 和 retry readiness，不读取下游 runtime facts。
- `PlatformApiMappingPage`：展示 mapping readiness、run readiness 和 manual publish console。

API/Gateway 已提供 `GET /api/gateway-organization-projection/v1/ingestion-status`。本 change 在 Admin 内新增只读 client 和 operator envelope，避免 operator 离开 Admin 控制台才能确认 Gateway owner receipt/status。

## Decisions

### 1. Status 查询只读且 fail closed

Admin ingestion status API 只调用 Gateway ingestion-status endpoint，不调用 publish endpoint，不写 Admin mapping/source，不写 Gateway facts。缺少 endpoint/token、Gateway 不可达、响应不可解析时返回 `provider_unavailable` 或 `invalid_response` 分类，不伪造成 `applied`。

### 2. Endpoint 来源

新增可选配置 `gatewayOrganizationProjectionStatusEndpoint`。若未配置，则从现有 `gatewayOrganizationProjectionEndpoint` 派生：

- publish endpoint 路径以 `/batches` 结尾时替换为 `/ingestion-status`。
- 否则在路径末尾追加 `/ingestion-status`。

配置值和派生后的完整 URL 均不出现在 API 响应、验证记录或前端页面中。

### 3. Query 与响应 envelope

Admin API 接收：

- `organization`
- `latest`
- `projectionBatchId`
- `orgVersion`
- `sourceVersion`

Admin 对 Gateway response 做稳定映射：

- Gateway owner 状态：`accepted`、`applied`、`stale`、`conflict`、`lineage_invalid`、`unmapped_subjects`、`not_found`
- Admin transport/config 状态：`provider_unavailable`、`invalid_config`、`invalid_response`

返回 envelope 只包含 query summary、status/statusAlias、failureCategory/reasonCode、freshness、lineage、subject counts、receivedAt/appliedAt/durationMs，不包含 raw gateway response、endpoint/token 或 subject 明细。

### 4. UI 放在现有 Gateway projection operator 区域

`PlatformApiMappingPage` 已展示 readiness、run readiness 和 manual publish。本 change 在同一区域增加 ingestion status 区块，默认查询 latest，也允许用最近 run 的 projectionBatchId/sourceVersion 进行只读查询。UI 只展示状态 tag、聚合计数和时间，不展示敏感原文。

## Risks

- Gateway ingestion-status contract 仍属于 API/Gateway owner。Admin 只按稳定字段做宽松 decode；未知状态映射为 `unknown`/`invalid_response`，不得推断成功。
- 如果 status endpoint 未配置且 publish endpoint 不是标准 `/batches` 路径，派生规则可能需要运维显式配置 `gatewayOrganizationProjectionStatusEndpoint`。
- Gateway `applied` 只表示 Gateway owner ingestion 状态，不代表 Insight/API 授权查询已经成功。
