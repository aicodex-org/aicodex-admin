## Context

Admin gateway projection 已有只读 observability preflight、readiness summary 和 release decision guardrail。当前 `gatewayProjectionReleaseDecision.js` 主要输出 `decision`、alias、readiness handoffs 和边界，但没有协调层可直接复制的 release/hold、local blocker 分类、按 decision 固定的 action guidance 和 `doNotDispatchUntil`。

本 change 必须限定在 Admin owner 的 Bruno/operator 本地资产内，不能查询真实 DB、写 fixture、触发真实 publish/full-success，也不能把 Admin diagnostics 变成 API/Gateway/Insight 授权事实。

## Goals / Non-Goals

**Goals:**

- 复用既有 `evaluateGatewayProjectionReleaseDecision` 分类和 readiness summary，不重写 observability 或 mapping readiness 规则。
- 为每个 decision 输出稳定 owner、next action、最小解除条件和不能外推边界。
- 对敏感字段、空 evidence、未知状态和缺 mapping readiness 继续 fail closed。
- 让 Bruno operator 入口输出可复制 handoff summary，便于协调线程交接。

**Non-Goals:**

- 不新增后端 API、不改数据库、不写真实 fixture、不触发 publish/refresh/mapping confirm。
- 不改变 API、Insight、Gateway owner 边界。
- 不把 `ready-for-controlled-smoke` 扩展为真实 publish、gateway ingestion、authorization facts 或完整 projection 业务成功。

## Decisions

1. **Handoff wrapper 与 decision wrapper 同文件实现。**
   - 原因：本次只增强 release decision 的 operator 输出，不需要新建跨模块抽象。
   - 替代方案：新增独立 `gatewayProjectionReleaseDecisionHandoff.js`。已拒绝，当前写集允许但会让 Bruno 入口多一个 wrapper 层，收益不足。

2. **输出 `release=release_after_report` 仅用于 `ready-for-controlled-smoke`。**
   - 原因：该状态只表示本地 evidence 可交给协调层进入受控 smoke 准备，仍不得外推为 full-success。
   - 其他 decision 统一 `release=hold`，并通过 `doNotDispatchUntil` 写明解除条件。

3. **按 decision 设置 local blocker 分类。**
   - `ready-for-controlled-smoke` -> `none`
   - `blocked-by-source-freshness` -> `admin_source_blocked`
   - `blocked-by-mapping-readiness` -> `admin_mapping_blocked`
   - `blocked-by-contract-or-config` -> `contract_or_config_blocked`
   - `not-checked` -> `local_evidence_not_checked`

4. **敏感输入沿用现有 decision fail-closed。**
   - Handoff 只消费 decision 的脱敏结果，不回显原始 observability、mapping readiness candidates、完整 organizationId 或完整响应体。

## Risks / Trade-offs

- Operator 可能把 `release_after_report` 理解成发布成功 -> 文档、边界和测试要求明确该状态只允许受控 smoke 准备。
- Readiness summary 的 alias 会继续演进 -> handoff 优先复用已有 handoffs，并为 decision 补固定 fallback，避免未知 alias 输出空 owner。
- 覆盖率只能按 Node 脚本文件或测试进程统计 -> 使用 Node 原生 coverage 输出验证改动脚本覆盖情况，并在 verification 记录范围和剩余限制。
