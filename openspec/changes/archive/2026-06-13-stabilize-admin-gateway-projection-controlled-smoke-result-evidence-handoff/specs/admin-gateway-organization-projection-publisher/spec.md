## ADDED Requirements

### Requirement: Admin controlled smoke result evidence handoff 必须 fail closed

系统 SHALL 提供 Admin-owned 本地 controlled smoke result evidence handoff，用脱敏的 execution handoff summary、结果状态、结果 alias、计数摘要、redaction/风险分类和 operator next action 判断执行结果材料是否可交接。该 handoff SHALL NOT 触发真实 publish、Gateway ingestion、endpoint/provider token、fixture/DB 写入、真实 controlled smoke、gate 或 authorization fact 变更。

#### Scenario: Sanitized result evidence is ready for handoff
- **WHEN** execution handoff summary 已是 `ready-for-controlled-smoke-execution`
- **AND** result status 使用稳定的可交接状态，例如 `passed`, `passed-with-observations` 或 `ready-for-handoff`
- **AND** result aliases、sanitized counts 和 risk/redaction 分类一致且无敏感字段
- **THEN** the handoff SHALL return `status=ready-for-result-evidence-handoff`
- **AND** it SHALL include sanitized result aliases, counts summary, risk category, operator actions and owner handoff limits
- **AND** `cannotInferBoundaries` SHALL state that this result evidence handoff does not prove real publish, Gateway ingestion, API/Gateway/Insight success, authorization facts, production readiness, controlled smoke pass or full-success

#### Scenario: Missing, failed or partial result evidence is blocked
- **WHEN** execution handoff summary is missing, not ready, or result status is missing, failed, partial, blocked or unknown
- **THEN** the handoff SHALL return `status=blocked`
- **AND** it SHALL expose stable `blockerAlias`, `remediationAlias`, `operatorActions` and `doNotDispatchUntil`
- **AND** it SHALL request only read-only sanitized evidence collection or Admin owner remediation

#### Scenario: Redaction gaps and real signals are hard red-lines
- **WHEN** input contains token, Cookie, private endpoint, real account, phone, email, complete organization tree, complete organizationId, source tenant metadata, configRef, secretRef, raw gateway/API response body, full diagnostics response, real publish signal, real fixture/DB signal, production-like endpoint or credential-like data
- **THEN** the handoff SHALL return `status=hard-red-line` or `status=blocked`
- **AND** it SHALL expose only stable redaction aliases, owner guidance and minimum unblock conditions
- **AND** it SHALL NOT echo the sensitive value or complete response

#### Scenario: Counts and aliases must be consistent
- **WHEN** result aliases claim success but sanitized counts show failed, blocked, missing, unauthorized, mismatched or unknown result evidence
- **THEN** the handoff SHALL return `status=blocked`
- **AND** `blockerAlias` SHALL identify the count/alias inconsistency
- **AND** operator actions SHALL require replacing or recollecting the sanitized result evidence before rerunning

#### Scenario: Cross-owner success overclaim is blocked
- **WHEN** input claims Gateway allow, API authorization report full-success, Insight success, production readiness, real publish success, Gateway ingestion success, authorization facts success, controlled smoke pass or full-success
- **THEN** the handoff SHALL return `status=hard-red-line`
- **AND** `cannotInferBoundaries` SHALL state that Admin result evidence handoff cannot infer API/Gateway/Insight success, production readiness, controlled smoke pass or full-success
- **AND** the handoff SHALL keep owner handoff limits scoped to Admin-owned sanitized result evidence
