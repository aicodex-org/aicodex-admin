# Design

## Goals

- 让 operator 能从 `/api/gateway-projection/observability` 直接判断最近一次 publish 依赖的 source connection status/freshness 分布。
- 保留现有 `sourceConnectionStatus` 字符串兼容字段，同时新增结构化、脱敏的 source diagnostics。
- 将 stale/unavailable/unknown freshness 映射到稳定 failure category，避免 smoke/runbook 只能看到 `unknown`。
- 保持 Admin/API/Gateway/Insight owner 边界，不把 diagnostics 变成 gateway authorization facts。

## Non-Goals

- 不改 `GatewayProjectionBatchRequest`、`GatewayProjectionBatch` 或 gateway ingestion contract。
- 不新增数据库表，不持久化 source diagnostics 历史。
- 不从 Insight、API 或 gateway projection store 回读 source freshness。
- 不触碰 `PlatformApiUserMapping` implementation 文件。
- 不执行真实测试数据写入或清理。

## Existing Behavior

`GatewayProjectionLatestPublishObservability` 当前包含 `SourceConnectionStatus string`。它由 `summarizeGatewayProjectionSourceConnections(sourceConnections)` 生成，只汇总 status，空连接返回 `missing`。`recordGatewayProjectionServiceObservability` 会在 status 包含 `DISABLED` 时设置 `source_connection_disabled`，随后再回退到 build skip reason 分类。

`SourceConnection` 已有 `Status` 和 `Freshness` 字段，freshness 枚举包括 `FRESH`、`STALE`、`UNKNOWN`、`UNAVAILABLE`。这些字段是 Admin-owned source metadata，适合用于 producer diagnostics，但不能作为下游授权输入。

## Proposed Shape

新增结构化 DTO，例如：

- `sourceConnectionSummary.total`
- `sourceConnectionSummary.statusCounts`
- `sourceConnectionSummary.freshnessCounts`
- `sourceConnectionSummary.hasStaleFreshness`
- `sourceConnectionSummary.hasUnavailableFreshness`
- `sourceConnectionSummary.hasUnknownFreshness`

字段只包含 counts、status/freshness 枚举和布尔摘要，不包含 `sourceTenantId`、`metadata`、`configRef`、`secretRef`、token、endpoint、账号、手机号、邮箱或完整组织结构。

## Failure Category Policy

分类优先级保持保守：

1. 若 publish result 已有 failure category，保留该分类。
2. 若 source connection status 包含 `DISABLED`，分类为 `source_connection_disabled`。
3. 若 source freshness 包含 `STALE` 或 `UNAVAILABLE`，分类为 `source_connection_stale`。
4. 其余情况回退到既有 build failure category，例如 `mapping_untrusted` 或 `no_publishable_subjects`。
5. 若 source freshness 缺失或为 `UNKNOWN`，且 publish/build 都没有更具体分类，兜底为 `unknown`。

该分类只用于 Admin producer diagnostics 和 smoke/runbook，不改变 gateway allow/deny 行为。

## Compatibility

- 保留 `sourceConnectionStatus`，旧 smoke 不受影响。
- 新字段在 latest publish audit 存在时返回；没有 latest audit 时不伪造成功状态。
- Bruno smoke 默认只验证 response shape，不要求真实 latest audit 必然存在。

## Verification Strategy

- TDD：先补 Go 聚焦测试，确认新字段缺失时 RED，再实现。
- Go 聚焦验证覆盖 `GatewayProjectionServiceObservability` 和 `GatewayProjectionFailureCategory` 相关测试。
- 覆盖率以 `admin/object` 受影响实现文件的 changed-file/function 覆盖为准，目标 85%。
- Bruno 只做静态/只读 shape 验证；无私有 env 时不执行 60。
- OpenSpec validate、diff check 和归档前 review 必须通过。
