## Context

Admin 侧现有 gateway projection operator 资产包括：

- `gatewayProjectionReleaseDecision.js`: 将本地 observability/readiness evidence 归类为 release decision 和 operator handoff。
- `gatewayProjectionControlledSmokePreflightHandoff.js`: 聚合 Admin release decision、Admin readiness 和 API diagnostics decision，判断是否可进入受控 smoke 准备。
- Bruno `50-Gateway Projection 观测/**`: 提供只读 operator 入口，不触发 publish、refresh、fixture 写入或数据库变更。

本 change 在这些资产之后补一层 release runbook/guardrail。它不读取真实环境、不查询 API/Insight/Gateway、不执行 smoke，只消费调用方显式提供的脱敏摘要和 alias。

## Goals / Non-Goals

**Goals:**

- 输出可复制、可审计的 controlled-smoke release runbook 摘要。
- 用稳定 `status/reason` 和 red-line flags 表达是否只能继续只读收集、是否可进入 controlled smoke 准备。
- 对缺 evidence、缺 release/preflight alias、真实写入信号、敏感字段和 full-success 外推 fail closed。
- 保留 owner handoff、最小解除条件和 redacted evidence hints，帮助 operator 修复缺失前置条件。

**Non-Goals:**

- 不触发真实 publish、gateway ingestion、authorization facts、read model rebuild、fixture 写入或 DB 查询。
- 不修改 Admin 后端 API、API、Insight、Gateway 仓库或跨 owner contract。
- 不声明 controlled smoke、full-success、API/Gateway/Insight 业务路径成功。

## Decisions

1. 新增独立 `gatewayProjectionControlledSmokeReleaseRunbook.js`。
   - 理由：release runbook 是比 preflight handoff 更小的 operator 摘要层，独立 helper 能避免扩大既有 release/preflight helper 回归面。
   - 取舍：会新增一个 Bruno 入口，但能让 operator 明确区分 preflight handoff 与最终 runbook 摘要。

2. 输入只接受脱敏摘要和 alias，不接受完整响应体。
   - 理由：runbook 面向协调层复制，必须降低敏感信息外泄和跨 owner 外推风险。
   - 取舍：helper 不能替 operator 判断真实环境状态，只能分类调用方提供的 evidence shape。

3. fail-closed 优先级为：敏感/真实写入/full-success 红线 -> 缺 release/preflight/evidence -> blocking release/preflight alias -> ready runbook。
   - 理由：红线输入必须先阻断；ready 只允许进入受控 smoke 准备，不能覆盖任何红线或缺失 evidence。

## Risks / Trade-offs

- [Risk] operator 误传完整 response 或真实账号。→ helper 对敏感字段名和值 fail closed，输出只保留 red-line alias，不回显输入。
- [Risk] `release_after_report` 被理解为发布成功。→ helper 输出 boundaries、hard red-line flags 和 `doNotDispatchUntil`，测试覆盖 full-success overclaim。
- [Risk] 上游 alias 演进。→ 未知 blocking alias 归入 missing/blocking prerequisites，等待 owner 提供稳定脱敏 alias。
