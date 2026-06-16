## ADDED Requirements
### Requirement: WeCom source controlled smoke execution handoff MUST fail closed
The system SHALL provide an Admin-owned, local, read-only controlled smoke execution handoff for WeCom source evidence before any real controlled smoke execution. The handoff SHALL consume only sanitized controlled smoke preflight, controlled smoke evidence handoff, and operator remediation handoff summaries, and SHALL NOT execute real controlled smoke.

#### Scenario: Ready execution handoff is explicitly bounded
- **WHEN** the handoff receives sanitized preflight evidence with `ready-for-wecom-controlled-smoke-preflight`, evidence handoff evidence with `ready-for-controlled-smoke-evidence-handoff`, operator remediation evidence with `ready`, a redacted signal, no blocking alias, local read-only execution handoff scope, and handoff-only execution mode
- **THEN** the handoff status SHALL be `ready-for-controlled-smoke-execution-handoff`
- **AND** the output SHALL include `decision=handoff-ready`, reference summaries, empty blocker reasons, empty minimum unblock conditions, operator next actions, and non-extrapolation boundaries
- **AND** the output SHALL state that this only proves Admin WeCom source controlled-smoke execution handoff readiness, not real WeCom sync success, non-empty organization tree readiness, Gateway/API/Insight success, authorization facts, production readiness, or full-success

#### Scenario: Missing execution prerequisites fail closed
- **WHEN** the handoff lacks controlled smoke preflight, controlled smoke evidence handoff, or operator remediation handoff summary
- **THEN** the output status SHALL name the missing prerequisite summary
- **AND** the output SHALL direct the operator to run the matching local-only WeCom source helper before continuing

#### Scenario: Unresolved prerequisite blockers stop execution handoff
- **WHEN** the preflight, evidence handoff, or remediation handoff summary contains missing prerequisites, remediations, red-line flags, or a non-ready status
- **THEN** the output status SHALL be `blocked-prerequisite`
- **AND** it SHALL preserve the blocker as stable alias evidence with owner, next action, and minimum unblock condition

#### Scenario: Redaction gaps fail closed
- **WHEN** the input contains unmasked secrets, tokens, cookies, private URLs, account identifiers, phone numbers, emails, full organization trees, full organization IDs, source tenant metadata, raw response bodies, or explicit redaction-required aliases
- **THEN** the handoff status SHALL be `redaction-required`
- **AND** the output SHALL NOT echo the sensitive values

#### Scenario: Hard red-line signals stop execution handoff
- **WHEN** the input contains a real execution signal, blocking alias, red-line alias, or an operator scope outside local read-only execution handoff
- **THEN** the handoff status SHALL be `hard-red-line-blocked`
- **AND** the output SHALL provide owner/fallback guidance without triggering sync, executing controlled smoke, writing fixtures, querying real databases, or reading API, Insight, or Gateway data

#### Scenario: Downstream or full-success overclaim is rejected
- **WHEN** the input claims real WeCom sync success, real DB state, non-empty organization tree, Gateway/API/Insight success, authorization facts, fixture readiness, publish success, production readiness, or full-success
- **THEN** the handoff status SHALL be `overclaim-full-success`
- **AND** the output SHALL require removing the overclaim and rerunning with sanitized source-only evidence
