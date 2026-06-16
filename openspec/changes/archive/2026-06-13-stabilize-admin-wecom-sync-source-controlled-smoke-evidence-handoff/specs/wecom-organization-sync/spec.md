## ADDED Requirements

### Requirement: WeCom source controlled smoke evidence handoff MUST fail closed
The system SHALL provide an Admin-owned, local, read-only controlled smoke evidence handoff for WeCom source evidence. The handoff SHALL consume only sanitized readiness, release decision, and controlled smoke preflight summaries and SHALL NOT execute real controlled smoke.

#### Scenario: Ready evidence handoff is explicitly bounded
- **WHEN** the handoff receives sanitized source readiness evidence with `wecom_source_ready`, release decision evidence with `wecom_source_ready` or `ready_for_org_tree_readiness`, preflight evidence with `ready-for-wecom-controlled-smoke-preflight`, a redacted signal, no blocking alias, and local read-only evidence handoff scope
- **THEN** the handoff status SHALL be `ready-for-controlled-smoke-evidence-handoff`
- **AND** the output SHALL include operator next actions, empty missing prerequisites, redaction checks, hard red-line flags, and do-not-proceed reasons
- **AND** the output SHALL state that this only proves Admin WeCom source controlled-smoke evidence handoff readiness, not non-empty organization tree readiness, Gateway/API/Insight success, authorization facts, real WeCom sync success, production readiness, or full-success

#### Scenario: Missing readiness summary fails closed
- **WHEN** the handoff does not receive a source readiness summary
- **THEN** the handoff status SHALL be `missing-readiness-summary`
- **AND** the output SHALL direct the operator to run the Admin-owned Source Readiness Handoff before continuing

#### Scenario: Missing release summary fails closed
- **WHEN** the handoff receives source readiness evidence but no release decision summary
- **THEN** the handoff status SHALL be `missing-release-summary`
- **AND** the output SHALL direct the operator to run the Admin-owned Source Release Decision before continuing

#### Scenario: Missing preflight summary fails closed
- **WHEN** the handoff receives source readiness and release decision evidence but no controlled smoke preflight summary
- **THEN** the handoff status SHALL be `missing-preflight-summary`
- **AND** the output SHALL direct the operator to run the Admin-owned Controlled Smoke Preflight before continuing

#### Scenario: Redaction gaps fail closed
- **WHEN** the input contains unmasked secrets, tokens, cookies, private URLs, account identifiers, phone numbers, emails, full organization trees, full organization IDs, source tenant metadata, raw response bodies, or explicit redaction-required aliases
- **THEN** the handoff status SHALL be `redaction-required`
- **AND** the output SHALL NOT echo sensitive values

#### Scenario: Hard red-line signals stop handoff
- **WHEN** the input contains a blocking alias, red-line alias, real environment write signal, or an operator scope outside local read-only evidence handoff
- **THEN** the handoff status SHALL be `hard-red-line-blocked`
- **AND** the output SHALL provide owner/fallback guidance without triggering sync, writing fixtures, querying real databases, or reading API, Insight, or Gateway data

#### Scenario: Downstream or full-success overclaim is rejected
- **WHEN** the input claims real WeCom sync success, real DB state, non-empty organization tree, Gateway/API/Insight success, authorization facts, fixture readiness, publish success, production readiness, or full-success
- **THEN** the handoff status SHALL be `overclaim-full-success`
- **AND** the output SHALL require removing the overclaim and rerunning with sanitized source-only evidence
