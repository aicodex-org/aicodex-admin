## ADDED Requirements

### Requirement: Admin controlled smoke release summary handoff 必须 fail closed

系统 SHALL 提供 Admin-owned 本地 controlled smoke release summary handoff，用脱敏的 result evidence handoff summary、release summary status、release summary aliases、计数摘要、redaction/风险分类和 operator next action，将操作者提供的 controlled-smoke result/evidence summary 分类为 `release-summary`、`blocked`、`needs-user-action` 或 `hard-red-line`。该 handoff SHALL NOT 触发真实 publish、Gateway ingestion、endpoint/provider token、fixture/DB 写入、真实 controlled smoke、gate、mapping confirm 或 authorization fact 变更。

#### Scenario: Sanitized release summary is ready for handoff
- **WHEN** result evidence handoff summary 已是 `ready-for-result-evidence-handoff`
- **AND** release summary status 使用稳定的可交接状态，例如 `ready-for-handoff`、`summary-ready` 或 `release-summary-ready`
- **AND** release summary aliases、sanitized counts 和 risk/redaction 分类一致且无敏感字段
- **THEN** the handoff SHALL return `status=ready-for-release-summary-handoff`
- **AND** `classification` SHALL be `release-summary`
- **AND** it SHALL include sanitized release summary aliases, counts summary, risk category, operator actions, owner handoff limits and minimum unblock conditions
- **AND** `cannotInferBoundaries` SHALL state that this release summary handoff does not prove real publish, Gateway ingestion, API/Gateway/Insight success, authorization facts, production readiness, controlled smoke pass or full-success

#### Scenario: Missing or blocked result evidence remains blocked
- **WHEN** result evidence handoff summary is missing, not ready, blocked, failed, partial or unknown
- **THEN** the handoff SHALL return `status=blocked`
- **AND** `classification` SHALL be `blocked`
- **AND** it SHALL preserve stable upstream blocker/remediation aliases, owner handoff and minimum unblock condition when available
- **AND** it SHALL request only read-only sanitized evidence collection or Admin owner remediation

#### Scenario: Needs user action is preserved
- **WHEN** release summary status or aliases indicate `needs-user-action`
- **THEN** the handoff SHALL return `status=needs-user-action`
- **AND** it SHALL preserve stable `blockerAlias`, `remediationAlias`, owner handoff and minimum unblock condition
- **AND** it SHALL NOT downgrade the state to release-ready or claim controlled smoke success

#### Scenario: Redaction gaps and real signals are blocked
- **WHEN** input contains token, Cookie, private endpoint, real account, phone, email, complete organization tree, complete organizationId, source tenant metadata, configRef, secretRef, raw gateway/API response body, full diagnostics response, real publish signal, Gateway ingestion signal, authorization facts signal, real fixture/DB signal, production-like endpoint or credential-like data
- **THEN** the handoff SHALL return `status=blocked` or `status=hard-red-line`
- **AND** it SHALL expose only stable redaction aliases, owner guidance and minimum unblock conditions
- **AND** it SHALL NOT echo the sensitive value or complete response

#### Scenario: Counts and aliases must be consistent
- **WHEN** release summary aliases claim ready but sanitized counts show blocked, needs-user-action, hard-red-line, missing, mismatched or unknown release summary sections
- **THEN** the handoff SHALL return `status=blocked`
- **AND** `blockerAlias` SHALL identify the count/alias inconsistency
- **AND** operator actions SHALL require replacing or recollecting the sanitized release summary before rerunning

#### Scenario: Cross-owner success overclaim is hard red-line
- **WHEN** input claims Gateway allow, API authorization report full-success, Insight success, production readiness, real publish success, Gateway ingestion success, authorization facts success, controlled smoke pass or full-success
- **THEN** the handoff SHALL return `status=hard-red-line`
- **AND** `classification` SHALL be `hard-red-line`
- **AND** `cannotInferBoundaries` SHALL state that Admin release summary handoff cannot infer API/Gateway/Insight success, production readiness, controlled smoke pass or full-success
- **AND** the handoff SHALL keep owner handoff limits scoped to Admin-owned sanitized release summary evidence

#### Scenario: Unknown release summary aliases remain safe
- **WHEN** sanitized release summary contains an unrecognized alias
- **THEN** the handoff SHALL keep the result blocked
- **AND** owner SHALL be `admin_operator`
- **AND** minimum unblock conditions SHALL require replacing the unknown alias with a stable Admin owner release summary alias
- **AND** the handoff SHALL NOT infer API, Insight or Gateway authorization facts
