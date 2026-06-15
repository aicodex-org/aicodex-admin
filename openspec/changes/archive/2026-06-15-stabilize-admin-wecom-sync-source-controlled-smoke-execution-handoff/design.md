# Design

## Goals

- 在 Admin owner 边界内生成真实 controlled smoke 前的执行交接证据。
- 输入只允许脱敏 preflight、evidence handoff 和 operator remediation handoff summary，不允许真实环境值、完整响应体、完整组织树或下游成功断言。
- 输出必须 fail-closed，给出 operator 下一步、引用摘要、阻塞原因、硬红线 flags、最小解除条件和不能外推边界。

## Inputs

helper 接受一个对象，字段语义如下：

- `preflightSummary`：来自 `Controlled Smoke Preflight` 的脱敏摘要，至少包含 `status`、`reasonAlias`、`evidenceShapeVersion`。
- `evidenceHandoff`：来自 `Controlled Smoke Evidence Handoff` 的脱敏摘要，至少包含 `status`、`reasonAlias`、`redactionChecks`、`hardRedLineFlags`。
- `remediationHandoff`：来自 `Operator Remediation Handoff` 的脱敏摘要，至少包含 `status`、`reasonAlias`、`remediations`、`redLineFlags`。
- `redactionSignal`：operator 对 execution handoff 输入的脱敏检查 alias，例如 `redacted`。
- `operatorScope`：operator 执行范围 alias，只允许本地只读 execution handoff scope。
- `executionModeAlias`：必须是 handoff-only/local-only 模式，避免误触发真实 smoke。
- `blockingAlias`：上游或 operator 明确阻断 alias。

## Decisions

- 只有 preflight ready、evidence handoff ready、operator remediation ready、redaction=redacted、无 blocking alias、operator scope 为本地只读、execution mode 为 handoff-only 时返回 `ready-for-controlled-smoke-execution-handoff`。
- 缺少 preflight、evidence handoff 或 remediation handoff summary 时分别返回 `missing-controlled-smoke-preflight-summary`、`missing-controlled-smoke-evidence-handoff-summary`、`missing-operator-remediation-handoff-summary`。
- 前置 summary 中仍有 `missingPrerequisites`、`remediations`、`redLineFlags` 或非 ready 状态时返回 `blocked-prerequisite`，并输出稳定 blocker alias、owner、nextAction 和最小解除条件。
- 输入包含 token、secret、Cookie、私有 URL、真实账号、手机号、邮箱、完整组织树、完整响应体或 source tenant 明细时返回 `redaction-required`，输出不得 echo 敏感值。
- 输入包含真实执行、真实同步、真实 DB、fixture、Gateway/API/Insight、authorization facts、组织树非空、生产就绪或 full-success 迹象时返回 `hard-red-line-blocked` 或 `overclaim-full-success`。

## Read-only Boundary

Bruno 入口只加载本地 helper 和 Bruno 变量，不发 HTTP 请求，不调用真实同步接口，不访问真实 DB，不读取 Gateway/API/Insight 数据。helper 不依赖网络、数据库、环境密钥或外部服务。

## Verification

- 先写 focused Node 测试并确认 RED。
- 实现 helper 后运行 focused `node --test`。
- 使用 Node 原生 coverage 覆盖新增 helper，line/branch/function 均不低于 85%。
- 运行相关 WeCom source helper tests、OpenSpec strict validate 和 diff whitespace 检查。
