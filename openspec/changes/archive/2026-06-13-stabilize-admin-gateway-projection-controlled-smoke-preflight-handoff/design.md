## Context

Admin 仓库已有三层只读本地 helper：projection observability preflight、gateway projection readiness summary 和 release decision handoff。它们覆盖 Admin-owned runtime shape、source freshness、mapping readiness 和 release decision guardrail，但本次协调需要一个更小的 controlled smoke preflight handoff，作为真正进入受控 smoke 准备前的 owner 边界汇总。

该 helper 只能消费调用方提供的脱敏 evidence。API diagnostics decision evidence 来自 API owner 或协调层的私有脱敏变量，Admin 侧不得查询 API/Insight/Gateway 数据库，也不得根据 Admin diagnostics 推断 gateway authorization facts。

## Goals / Non-Goals

**Goals:**
- 输出稳定 controlled smoke preflight decision 和 alias，便于协调层分派 owner。
- 保留 owner handoff、minimum unblock condition、`doNotDispatchUntil` 和不能外推边界。
- 对缺 evidence、敏感字段、未知 alias、API diagnostics blocked、Admin release decision blocked、source freshness blocked 和 mapping readiness blocked 均 fail closed。
- 复用现有 Admin release decision/readiness summary 结果，避免引入 runtime publish 或数据库依赖。

**Non-Goals:**
- 不触发 publish、refresh、mapping confirm、fixture 写入或真实 DB 查询。
- 不修改 API、Insight、Gateway 仓库或跨 owner contract。
- 不把任何本地 preflight/readiness 结果描述为真实 publish、gateway ingestion、authorization facts 或完整 projection 业务成功。

## Decisions

1. 新增独立 `gatewayProjectionControlledSmokePreflightHandoff.js`，而不是改写 release decision helper。
   - 理由：release decision 已归档并服务现有 Bruno 入口；controlled smoke prep 是更高一层协调汇总，独立 helper 能降低回归面。
   - 取舍：两个 helper 都会输出 handoff 字段；通过 README 明确前者是 release guardrail，后者是受控 smoke 准备前交接。

2. API diagnostics evidence 只接受脱敏 decision/alias/status，不接受完整 API response。
   - 理由：Admin owner 不能查询 API/Insight/Gateway DB，也不能保存完整响应体或私有 URL。
   - 取舍：Admin helper 只能判断 API diagnostics 是否 reported clear/blocked/not checked，不能替 API owner 诊断真实 ingestion。

3. 决策优先级采用 fail-closed 顺序：redaction/contract -> missing required evidence -> API diagnostics -> Admin release decision -> Admin source/mapping blockers -> ready。
   - 理由：敏感输入和未知 contract 必须先阻断；跨 owner blocker 不应被 Admin 本地 ready 覆盖。

## Risks / Trade-offs

- [Risk] 调用方误传完整 response 或敏感字段。→ helper 对敏感字段名和值 fail closed，并且输出不回显原始 evidence。
- [Risk] `ready-for-controlled-smoke-prep` 被误解为成功发布。→ 输出 `doNotDispatchUntil` 和 boundaries，README/spec 反复声明只能进入受控 smoke 准备。
- [Risk] API diagnostics alias 随 API owner 演进。→ 未知 alias 归类为 `blocked-by-contract-or-redaction`，等待 API owner 提供稳定脱敏 decision。
