# implement-admin-gateway-projection-observability-source-freshness-diagnostics

## Why

Admin gateway projection producer 已经提供 publisher/refresh 状态、latest publish audit、lineage、subject counts、skip reason 和 `sourceConnectionStatus` 摘要。现有摘要可以说明来源连接是否 active/disabled，但 operator 仍无法直接看到 source connection freshness/trust 分布，例如 `FRESH`、`STALE`、`UNKNOWN`、`UNAVAILABLE` 的数量，以及是否因为 freshness stale/unavailable 影响 projection readiness。

这会让 API/Gateway projection status、export/runtime readiness 和 Insight smoke handoff 在排查 `source_connection_stale`、`source_connection_disabled`、`unknown` 等稳定分类时，需要回到日志或数据库侧交叉确认来源状态。该缺口属于 Admin producer observability 诊断增强，不需要改变 projection ingestion payload 或下游授权事实。

## What Changes

- 在 admin-only projection observability latest publish audit 中增加结构化 source connection diagnostics。
- 保留兼容字段 `sourceConnectionStatus`，新增 status/freshness 分布、连接总数、stale/unavailable/unknown freshness 标记和脱敏 summary。
- 让 `recordGatewayProjectionServiceObservability` 写入 source freshness/trust 摘要，并在 freshness stale/unavailable/unknown 时给出稳定 failure category。
- 更新 Go 测试，覆盖 fresh、stale、unavailable/unknown、disabled 和空 source connection。
- 更新 Bruno smoke 和 README/runbook，增加只读 shape/assertion 和字段解释。
- 同步主规格，明确 source freshness/trust diagnostics 只服务 Admin producer 排障。

## Out of Scope

- 不修改 gateway projection ingestion payload，不新增 payload 顶层 `contractVersion`。
- 不改 API/Gateway provider、authorization facts、permission matrix、runtime allow/deny 或 Insight。
- 不让 API/Insight 消费 Admin observability JSON 作为授权事实或本地补算 projection。
- 不实现 `PlatformApiUserMapping` operator readiness，不修改 mapping 页面/API/测试。
- 不执行 60 fixture 写入、数据库明细写入/清理、真实 gate、生产或类生产操作。

## Impact

- 影响 `admin/object/gateway_organization_projection_observability.go` 的脱敏诊断 DTO 和 latest publish audit 记录。
- 影响 `admin/object/gateway_organization_projection_test.go` 的 projection observability 聚焦测试。
- 影响 Bruno projection observability smoke 和 README/runbook。
- 影响 OpenSpec active change 和主规格。
