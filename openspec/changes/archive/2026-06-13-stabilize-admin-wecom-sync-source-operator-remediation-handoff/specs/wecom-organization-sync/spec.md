# wecom-organization-sync Specification Delta

## ADDED Requirements

### Requirement: WeCom source operator remediation handoff MUST fail closed
The system SHALL provide an Admin-owned, local, read-only operator remediation handoff for WeCom source readiness and controlled smoke preparation evidence. The handoff SHALL consume only sanitized readiness, release decision, controlled smoke preflight, and evidence handoff summaries, and SHALL output stable remediation aliases, owner-scoped next actions, missing prerequisites, red-line flags, minimum unblock conditions, and non-extrapolation boundaries.

#### Scenario: Blocked source evidence maps to owner remediation
- **WHEN** the handoff receives sanitized source summaries containing stable blockers such as `wecom_config_missing`, `wecom_credential_not_verified`, `wecom_latest_run_failed`, `wecom_no_recent_success`, or `wecom_run_active`
- **THEN** the output status SHALL be `blocked`
- **AND** it SHALL preserve the blocker as a stable remediation alias with owner, next action, missing prerequisite, and minimum unblock condition
- **AND** it SHALL NOT trigger real WeCom sync, write fixtures, query real databases, or read API, Insight, or Gateway data

#### Scenario: Missing prerequisite summaries need user action
- **WHEN** the handoff lacks source readiness, release decision, controlled smoke preflight, or evidence handoff summary
- **THEN** the output status SHALL be `needs-user-action`
- **AND** it SHALL name the missing prerequisite and direct the operator to the matching local-only WeCom source helper before continuing

#### Scenario: Hard red-line evidence stops remediation handoff
- **WHEN** the input contains a real environment write signal, non-local operator scope, downstream success assertion, full-success assertion, real fixture or DB detail, publish, gateway ingestion, authorization facts, or a hard red-line alias
- **THEN** the output status SHALL be `hard-red-line`
- **AND** it SHALL include red-line flags and require removing the signal or obtaining owner authorization before any controlled smoke or manual execution

#### Scenario: Sensitive evidence is rejected without echoing values
- **WHEN** the input contains unmasked secrets, tokens, cookies, private URLs, real account identifiers, phone numbers, emails, full organization trees, full organization IDs, source tenant metadata, or raw response bodies
- **THEN** the output status SHALL be `hard-red-line`
- **AND** the output SHALL NOT echo the sensitive values

#### Scenario: Ready remediation handoff remains bounded
- **WHEN** all sanitized summaries are ready, no blocking alias is present, redaction is confirmed, and operator scope is local read-only
- **THEN** the output status SHALL be `ready`
- **AND** it SHALL state that readiness only means the operator remediation handoff is clear, not that controlled smoke passed, organization tree is non-empty, Gateway/API/Insight succeeded, authorization facts are active, production is ready, or full-success exists
