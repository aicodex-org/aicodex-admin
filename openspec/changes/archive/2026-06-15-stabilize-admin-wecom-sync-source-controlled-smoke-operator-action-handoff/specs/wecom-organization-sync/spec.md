## ADDED Requirements

### Requirement: WeCom source controlled smoke operator action handoff MUST fail closed
The system SHALL provide an Admin-owned, local, read-only controlled smoke operator action handoff for WeCom source evidence. The handoff SHALL consume only a sanitized operator decision handoff summary, sanitized operator metadata, and sanitized operator notes, and SHALL output a bounded operator action package without triggering real WeCom sync, real controlled smoke, real fixture or DB writes, provider token access, Gateway/API/Insight reads, authorization fact changes, production-like gates, organization tree rebuilds, or destructive data operations.

#### Scenario: Sanitized ready decision allows operator action handoff
- **WHEN** operator decision handoff summary has `status=ready-for-operator-decision-handoff`
- **AND** `release=release_after_report`
- **AND** all inputs are sanitized, local-only, and free of red-line flags
- **THEN** the handoff action status SHALL be `ready-for-operator-action`
- **AND** the output SHALL include `nextAction`, stable blocker/remediation aliases, owner handoff limits, minimum unblock conditions, action package metadata, and non-extrapolation boundaries
- **AND** the output SHALL state that this only proves an Admin WeCom source local action package can be handed off, not real WeCom sync success, non-empty organization tree readiness, Gateway/API/Insight success, authorization facts, production readiness, controlled smoke pass, or full-success

#### Scenario: Missing or non-ready decision remains blocked
- **WHEN** the handoff lacks operator decision handoff summary or the summary is blocked, partial, not ready, unknown, or has `release=hold`
- **THEN** the handoff action status SHALL be `blocked` unless the upstream status is `needs-user-action` or `hard-red-line`
- **AND** it SHALL preserve a stable blocker alias, remediation alias, owner handoff limit, and minimum unblock condition for the upstream local-only helper
- **AND** it SHALL NOT downgrade the state to ready or claim controlled smoke success

#### Scenario: Needs user action is preserved
- **WHEN** the operator decision handoff summary indicates `needs-user-action`
- **THEN** the handoff action status SHALL be `needs-user-action`
- **AND** it SHALL preserve the upstream blocker/remediation alias and direct the operator to collect only sanitized local action evidence

#### Scenario: Hard red-line inputs stop operator action handoff
- **WHEN** input summaries, operator note, or metadata contain real WeCom sync, real controlled smoke, real fixture or DB detail, synthetic audit/projection data, Gateway/API/Insight success, authorization facts, production-like endpoint, provider token, real gate, organization tree rebuild, credential-like data, controlled smoke pass, production readiness, or full-success claims
- **THEN** the handoff action status SHALL be `hard-red-line`
- **AND** it SHALL include red-line flags and require removing the signal or obtaining owner authorization before any dispatch, publish, fixture, DB, Gateway ingestion, downstream validation, organization tree rebuild, or release action step

#### Scenario: Sensitive action evidence is rejected without echoing values
- **WHEN** input contains unmasked secrets, tokens, cookies, private URLs, real account identifiers, phone numbers, emails, full organization trees, full organization IDs, source tenant metadata, raw response bodies, real DB/fixture/audit/projection data, or credential-like fields
- **THEN** the output action status SHALL be `blocked`
- **AND** the output SHALL include `blockerAlias=sanitization_failed`
- **AND** the output SHALL NOT echo the sensitive values or sensitive field names

#### Scenario: Unknown sanitized aliases remain blocked
- **WHEN** sanitized input contains an unrecognized decision, blocker, remediation, result, or owner handoff alias
- **THEN** the handoff action status SHALL be `blocked`
- **AND** the output SHALL require replacing the unknown alias with a stable Admin WeCom source handoff alias before operator action handoff can be marked ready
