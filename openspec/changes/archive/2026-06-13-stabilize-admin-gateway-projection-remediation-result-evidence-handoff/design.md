## Context

Gateway Projection operator remediation handoff 已能把 blocker alias 映射为 owner、动作清单和最小解除条件。operator 完成 mapping/source/deploy/fixture/evidence blocker 处理后，需要把处理结果以脱敏 alias/count/status 摘要交回 Admin owner，由 Admin 判断下一步是否只允许进入 controlled smoke evidence review / preflight，或继续 blocked。

## Goals

- 汇总 mapping remediation、source freshness remediation、deploy/runtime shape、fixture/`subjectCount>=1` 授权缺口、controlled smoke evidence 前置结果。
- 只输出稳定字段：`status`、`reason`、`evidenceAliases`、`ownerHandoffs`、`minimumUnblockConditions`、`nextSafeAction`、`doNotDispatchUntil`、`nonExtrapolation`。
- 对敏感字段、完整响应体、真实写入信号和 full-success 外推 fail closed。
- 明确 ready 只表示可以进入下一轮 controlled smoke evidence review / preflight，不是 publish、gateway ingestion、authorization facts、API/Insight 成功或 full-success。

## Non-Goals

- 不连接真实 Admin/API/Insight/Gateway 环境。
- 不创建或修改 fixture、DB、mapping、gateway authorization facts。
- 不读取完整组织树、真实账号、私有 URL、token、Cookie 或原始响应体。
- 不改变 API diagnostics、Gateway ingestion、Insight consumer、fixture owner 或 Admin mapping/source/deploy owner 边界。

## Decisions

- Decision: 使用 CommonJS 纯函数 helper，并沿用现有 Bruno local-only scripts 的 fail-closed pattern。
  Rationale: Gateway Projection 现有 wrapper 均以 Node `require` 和 `node:test` 验证，保持一致能降低维护成本。
- Decision: 结果 handoff 不复用上一轮 remediation handoff 的 `remediations` 结构，而是输出更小的 `ownerHandoffs` 和 `minimumUnblockConditions`。
  Rationale: 本 change 交接的是 operator 处理结果证据，不是重新生成动作清单。
- Decision: `ready-for-controlled-smoke-evidence-review` 只在 mapping/source/deploy/evidence 均已解除且 fixture/subject gate 已授权满足时返回。
  Rationale: prompt 要求 fixture 或 `subjectCount>=1` 授权缺口仍必须 blocked，不能把空 subject 或未授权 fixture 当作通过。

## Risks / Trade-offs

- Risk: operator 将结果 handoff 当成真实 smoke 或 publish 成功。
  Mitigation: 输出 `doNotDispatchUntil` 与 `nonExtrapolation`，并在 README/spec 中明确不能外推。
- Risk: 新 alias 没有显式映射。
  Mitigation: fallback 到 `unknown_remediation_result_alias`，owner 为 `admin_operator`，要求回到上一轮 operator remediation handoff 或 owner result evidence。
- Risk: API/Insight blocker 被 Admin 单侧处理。
  Mitigation: API diagnostics/evidence alias 只作为脱敏结果输入；需要 API owner 的项仍指向 `api_diagnostics_owner`，Admin 不查询 API/Insight/Gateway 私有库。
