## ADDED Requirements

### Requirement: WeCom source controlled smoke operator decision handoff MUST fail closed
The system SHALL provide an Admin-owned, local, read-only controlled smoke operator decision handoff for WeCom source evidence. The handoff SHALL consume only sanitized preflight, execution, result evidence, operator remediation, operator triage, operator note, and operator metadata summaries, and SHALL output a bounded operator decision package without triggering real WeCom sync, real controlled smoke, real fixture or DB writes, provider token access, Gateway/API/Insight reads, authorization fact changes, production-like gates, or destructive data operations.

#### Scenario: Sanitized ready evidence allows operator decision handoff
- **WHEN** preflight summary has `status=ready-for-wecom-controlled-smoke-preflight`
- **AND** execution handoff summary has `status=ready-for-controlled-smoke-execution-handoff`
- **AND** result evidence handoff summary has `status=passed`
- **AND** operator remediation handoff summary has `status=ready`
- **AND** operator triage handoff summary has `status=ready-for-operator-triage-handoff`
- **AND** all summaries are sanitized, local-only, and free of red-line flags
- **THEN** the handoff status SHALL be `ready-for-operator-decision-handoff`
- **AND** the output SHALL include `decisionStatus=ready-for-operator-release-decision`, decision options, next options, redaction metadata, owner handoff limits, minimum unblock conditions, and non-extrapolation boundaries
- **AND** the output SHALL state that this only proves an Admin WeCom source local decision package can be handed off, not real WeCom sync success, non-empty organization tree readiness, Gateway/API/Insight success, authorization facts, production readiness, controlled smoke pass, or full-success

#### Scenario: Missing decision prerequisites need user action
- **WHEN** the handoff lacks preflight, execution, result evidence, operator remediation, or operator triage summary
- **THEN** the handoff status SHALL be `needs-user-action`
- **AND** it SHALL name the missing prerequisite and direct the operator to the corresponding local-only helper before continuing
- **AND** it SHALL NOT trigger sync, execute controlled smoke, query real databases, write fixtures, or call Gateway/API/Insight

#### Scenario: Non-ready upstream evidence blocks decision handoff
- **WHEN** any upstream summary is blocked, partial, not ready, unknown, or carries a blocker alias
- **THEN** the handoff status SHALL be `blocked` unless the upstream status is `needs-user-action` or `hard-red-line`
- **AND** it SHALL preserve a stable blocker alias, remediation alias, owner handoff limit, and minimum unblock condition for the upstream local-only helper
- **AND** it SHALL NOT downgrade the state to ready or claim controlled smoke success

#### Scenario: Hard red-line inputs stop operator decision handoff
- **WHEN** input summaries, operator note, or metadata contain real WeCom sync, real controlled smoke, real fixture or DB detail, synthetic audit/projection data, Gateway/API/Insight success, authorization facts, production-like endpoint, provider token, real gate, credential-like data, controlled smoke pass, production readiness, or full-success claims
- **THEN** the handoff status SHALL be `hard-red-line`
- **AND** it SHALL include red-line flags and require removing the signal or obtaining owner authorization before any dispatch, publish, fixture, DB, Gateway ingestion, downstream validation, or release decision step

#### Scenario: Sensitive decision evidence is rejected without echoing values
- **WHEN** input contains unmasked secrets, tokens, cookies, private URLs, real account identifiers, phone numbers, emails, full organization trees, full organization IDs, source tenant metadata, raw response bodies, real DB/fixture/audit/projection data, or credential-like fields
- **THEN** the output status SHALL be `blocked`
- **AND** the output SHALL include redaction metadata and `blockerAlias=sanitization_failed`
- **AND** the output SHALL NOT echo the sensitive values or sensitive field names

#### Scenario: Unknown sanitized aliases remain blocked
- **WHEN** sanitized input contains an unrecognized preflight, execution, result, remediation, triage, blocker, or owner handoff alias
- **THEN** the handoff status SHALL be `blocked`
- **AND** the output SHALL require replacing the unknown alias with a stable Admin WeCom source handoff alias before operator decision handoff can be marked ready
