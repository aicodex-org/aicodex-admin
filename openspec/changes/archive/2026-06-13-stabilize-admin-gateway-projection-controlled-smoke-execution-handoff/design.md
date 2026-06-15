## Context

当前 Admin gateway projection 的受控 smoke 前置链路已经能分别产出 release decision、controlled smoke preflight、release runbook、evidence readiness、operator remediation handoff 和 remediation result evidence handoff。执行前仍需要一个更小的 Admin owner 本地交接包，汇总这些只读脱敏结果，告诉 operator 是否可以进入受控 smoke 执行准备，或必须停在稳定 blocker/remediation alias 对应的最小解除条件。

## Goals / Non-Goals

**Goals:**

- 汇总 preflight、evidence readiness、release runbook、operator remediation handoff 和 remediation result evidence handoff 的脱敏摘要。
- 输出稳定字段：`status`、`blockerAlias`、`remediationAlias`、`missingPrerequisites`、`operatorActions`、`ownerHandoffLimits`、`redLineFlags`、`cannotInferBoundaries` 和 `evidencePackageMetadata`。
- 对缺少脱敏确认、敏感值、真实执行/写入意图和 Gateway/API/Insight/full-success 外推 fail closed。
- 保持 local-only，不触发真实 endpoint、publish、gateway ingestion、authorization facts、fixture/DB 或生产/类生产操作。

**Non-Goals:**

- 不执行真实 controlled smoke，不声明执行成功。
- 不改变 API diagnostics、Gateway ingestion、Insight consumer、fixture owner 或 Admin mapping/source/deploy owner 边界。
- 不把 `subjectCount>=1`、Gateway allow、API authorization report full-success、Insight success 或生产 readiness 写成已证明。

## Decisions

- Decision: 使用 CommonJS 纯函数 helper，并沿用现有 Bruno local-only pre-request abort pattern。
  Rationale: 相邻 Admin gateway projection handoff 均使用该形态，focused `node:test` 可覆盖 fail-closed 规则，Bruno 入口不会发起网络请求。
- Decision: execution handoff 返回 bounded status，而不是真实 smoke 状态。
  Rationale: 本 change 只做执行前交接，`ready-for-controlled-smoke-execution` 仅表示脱敏前置摘要可交给 operator 进入受控执行准备。
- Decision: `ownerHandoffLimits` 和 `cannotInferBoundaries` 始终输出。
  Rationale: 防止 operator 将 Admin 本地证据外推为 API/Gateway/Insight 成功、authorization facts 生效、生产就绪或 full-success。
- Decision: 硬红线优先级高于缺失前置条件。
  Rationale: 一旦输入含真实写入、真实 gate、fixture/DB、生产/类生产或 full-success 断言，必须先停止传播并要求重新收集脱敏只读证据。

## Risks / Trade-offs

- Risk: operator 将 `ready-for-controlled-smoke-execution` 当成真实 smoke 已通过。
  Mitigation: 输出 `cannotInferBoundaries`、`ownerHandoffLimits` 和 `doNotDispatchUntil`，README/spec 明确不能外推。
- Risk: 上游 handoff 新增 alias 后本 helper 不识别。
  Mitigation: 未知 alias fail closed 为 `blocked`，要求替换为稳定 Admin owner execution alias。
- Risk: 敏感字段藏在 operator metadata 中。
  Mitigation: 对字段名和字符串值做递归 redaction 检查，输出只保留稳定 alias，不回显原始值。
