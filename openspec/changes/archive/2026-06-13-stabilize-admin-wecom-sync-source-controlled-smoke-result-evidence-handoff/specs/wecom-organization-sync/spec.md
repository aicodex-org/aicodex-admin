## ADDED Requirements

### Requirement: WeCom source controlled smoke result evidence handoff MUST fail closed
The system SHALL provide an Admin-owned, local, read-only controlled smoke result evidence handoff for WeCom source result evidence. The handoff SHALL consume only sanitized execution handoff summary, result aliases/counts, deployment summary, authorization summary, redaction signal, and risk category, and SHALL NOT execute real controlled smoke or write real evidence.

#### Scenario: Passed result evidence handoff is explicitly bounded
- **WHEN** the handoff receives a sanitized execution handoff with `ready-for-controlled-smoke-execution-handoff`, a result status of `passed` or `passed-with-observations`, stable passed result aliases, matching passed counts, deployed and authorized summary aliases, a redacted signal, local read-only result evidence scope, and handoff-only result mode
- **THEN** the handoff status SHALL be `passed`
- **AND** the output SHALL include `release=release_after_report`, result aliases/counts, empty missing prerequisites, owner handoff limits, operator actions, and non-extrapolation boundaries
- **AND** the output SHALL state that this only proves Admin WeCom source controlled-smoke result evidence handoff readiness, not real WeCom sync success, non-empty organization tree readiness, Gateway/API/Insight success, authorization facts, production readiness, or full-success

#### Scenario: Partial result evidence remains limited
- **WHEN** the handoff receives sanitized result evidence with `partial-handoff` or partial counts but no failed, blocked, missing, or unauthorized counts
- **THEN** the handoff status SHALL be `partial-handoff`
- **AND** the output SHALL preserve the partial alias and direct the operator to either collect missing local evidence or hand off with explicit owner limits

#### Scenario: Missing result prerequisites need user action
- **WHEN** the handoff lacks execution handoff summary, result status, result aliases, result counts, deployment summary, authorization summary, redaction signal, or risk category
- **THEN** the handoff status SHALL be `needs-user-action`
- **AND** the output SHALL name the missing prerequisite and direct the operator to the matching local-only WeCom source helper or Admin owner evidence preparation step before continuing

#### Scenario: Undeployed or unauthorized result evidence blocks handoff
- **WHEN** deployment summary is not deployed, authorization summary is not authorized, result aliases are unknown, or result counts include failed, blocked, missing, unauthorized, or inconsistent passed totals
- **THEN** the handoff status SHALL be `blocked`
- **AND** the output SHALL include stable blocker alias, owner handoff limits, and minimum unblock conditions without triggering sync, writing fixtures, querying real databases, or reading API, Insight, or Gateway data

#### Scenario: Sensitive result evidence is rejected without echoing values
- **WHEN** the input contains unmasked secrets, tokens, cookies, private URLs, real account identifiers, phone numbers, emails, full organization trees, full organization IDs, source tenant metadata, raw response bodies, real DB/fixture/audit/projection data, or credential-like fields
- **THEN** the output status SHALL be `blocked`
- **AND** the output SHALL NOT echo the sensitive values

#### Scenario: Hard red-line result claims stop handoff
- **WHEN** the input claims real WeCom sync success, real DB state, real fixture or synthetic audit/projection data, non-empty organization tree, Gateway/API/Insight success, authorization facts, publish success, production readiness, full-success, or contains a real execution/write signal
- **THEN** the handoff status SHALL be `blocked`
- **AND** it SHALL include red-line flags and require removing the signal or obtaining owner authorization before any controlled smoke, publish, fixture, DB, Gateway ingestion, or downstream validation step
