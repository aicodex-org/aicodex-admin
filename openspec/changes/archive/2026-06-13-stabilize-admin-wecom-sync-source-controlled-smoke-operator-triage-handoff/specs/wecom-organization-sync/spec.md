## ADDED Requirements

### Requirement: WeCom source controlled smoke operator triage handoff MUST fail closed

The system SHALL provide an Admin-owned, local, read-only controlled smoke operator triage handoff for WeCom source evidence. The handoff SHALL consume only sanitized result evidence handoff summary, operator remediation handoff summary, operator note, and operator metadata, and SHALL output an operator-executable triage package without triggering real WeCom sync, real fixture or DB writes, provider token access, Gateway/API/Insight reads, authorization fact changes, production-like gates, or destructive data operations.

#### Scenario: Sanitized result and remediation evidence allow operator triage handoff
- **WHEN** result evidence handoff summary has `status=passed`
- **AND** operator remediation handoff summary has `status=ready`
- **AND** input contains only sanitized status, stable alias, counts, owner handoff limits, risk/redaction categories, and non-extrapolation boundaries
- **THEN** the handoff SHALL return `status=ready-for-operator-triage-handoff`
- **AND** it SHALL include `nextSteps`, `ownerHandoffLimits`, `minimumUnblockConditions`, `triagePackageMetadata`, `doNotDispatchUntil`, and `cannotInferBoundaries`
- **AND** `cannotInferBoundaries` SHALL state that this triage package does not prove real WeCom sync success, non-empty organization tree readiness, Gateway/API/Insight success, authorization facts, production readiness, controlled smoke pass, or full-success

#### Scenario: Blocked or partial result evidence remains blocked
- **WHEN** result evidence handoff summary is missing, `partial-handoff`, blocked, failed, unknown, or otherwise not `passed`
- **THEN** the handoff SHALL return `status=blocked`
- **AND** it SHALL preserve stable upstream alias, owner handoff, and minimum unblock condition when available
- **AND** it SHALL request only local sanitized result evidence collection or Admin owner remediation

#### Scenario: Needs user action is preserved for operator
- **WHEN** result evidence handoff or operator remediation handoff indicates missing prerequisites or `needs-user-action`
- **THEN** the handoff SHALL return `status=needs-user-action`
- **AND** it SHALL preserve stable `blockerAlias`, `remediationAlias`, owner handoff, and minimum unblock condition
- **AND** it SHALL NOT downgrade the state to ready or claim controlled smoke success

#### Scenario: Hard red-line inputs stop operator triage
- **WHEN** input summaries, operator note, or metadata contain real WeCom sync, real controlled smoke, real fixture or DB detail, synthetic audit/projection data, Gateway/API/Insight success, authorization facts, production-like endpoint, provider token, real gate, credential-like data, or full-success claims
- **THEN** the handoff SHALL return `status=hard-red-line`
- **AND** `redLineFlags` SHALL include stable aliases such as `real_sync_signal`, `real_controlled_smoke_signal`, `real_fixture_signal`, `real_db_write_signal`, `synthetic_audit_projection_signal`, `downstream_success_overclaim`, `authorization_facts_overclaim`, `production_readiness_overclaim`, or `full_success_overclaim`
- **AND** the handoff SHALL NOT trigger any real network request, sync run, fixture/DB write, gate, Gateway ingestion, API/Insight/Gateway read, provider token access, or authorization fact change

#### Scenario: Sensitive values are never echoed
- **WHEN** input contains token, Cookie, private endpoint, real account, phone, email, complete organization tree, complete organizationId, source tenant metadata, configRef, secretRef, raw response body, full diagnostics response, or other credential-like data
- **THEN** the handoff SHALL return `status=blocked` or `status=hard-red-line`
- **AND** it SHALL expose only stable redaction aliases, owner guidance, and minimum unblock conditions
- **AND** it SHALL NOT echo the sensitive value or complete response

#### Scenario: Unknown triage aliases remain owner scoped
- **WHEN** sanitized input contains an unrecognized result evidence, remediation, blocker, or owner handoff alias
- **THEN** the handoff SHALL keep the result blocked
- **AND** owner SHALL be `admin_operator`
- **AND** minimum unblock conditions SHALL require replacing the unknown alias with a stable Admin WeCom source handoff alias
- **AND** the handoff SHALL NOT infer organization tree readiness, Gateway/API/Insight authorization facts, production readiness, or full-success
