# stabilize-admin-gateway-projection-observability

## Why

Admin 已经负责从组织主模型发布 `admin -> gateway organization projection`，并通过 refresh worker 周期续期 freshness。API 侧 projection status、权限矩阵、授权审计和后续导出 readiness 都依赖这条链路稳定可诊断。

当前 publisher 和 refresh worker 已有基础日志，但缺少面向 smoke 和运维排障的稳定只读诊断输出：无法快速确认 publisher 是否启用、refresh interval 是否小于 TTL、最近 refresh/publish 的脱敏状态、skip reason 汇总、freshness 窗口和稳定失败分类。

## What Changes

- 为 admin projection producer 增加 admin-only 运行态观测输出，覆盖 publisher 配置状态、refresh worker 状态、最近 publish audit、最近 refresh run、freshness/lineage 和 skip reason 摘要。
- 补齐 publisher audit 字段，确保 `projectionBatchId`、`orgVersion`、`lineage.sourceVersion`、`generatedAt`、`freshness.expiresAt`、subject counts、skip summary、status/error category、duration 和 idempotency 信号可脱敏排障。
- 补齐 refresh worker 状态诊断，表达 enabled/disabled、interval/TTL 关系、lastRunAt、lastSuccessAt、lastFailureAt、lastFailureCategory 和 nextRunAt。
- 固化 Bruno smoke/runbook，验证 projection observability endpoint、refresh worker enabled/disabled 诊断和 latest publish audit 可见。
- 同步组织边界路线清单中本 runtime-readiness change 的状态。

## Non-Goals

- 不修改 gateway ingestion contract。
- 不修改 API/gateway authorization facts、runtime allow/deny 或权限矩阵。
- 不修改 Insight，也不允许 Insight 本地补算 projection 或 authorization facts。
- 不实现成员诊断详情；成员级诊断由 `improve-admin-organization-tree-member-diagnostics` 负责。
- 不让 API/gateway 消费 admin 管理页面组织树 JSON。
- 不输出 token、Cookie、私有 URL、真实账号、手机号、邮箱、完整组织明细或完整敏感响应体。

## Impact

- 影响 admin 后端 projection publisher、refresh worker 的只读诊断模型和脱敏 audit 摘要。
- 影响 Bruno smoke 集合和 OpenSpec 文档。
- 不影响跨服务 contract，不要求 API/Insight 改代码。
