## ADDED Requirements

### Requirement: WeCom source controlled smoke preflight MUST fail closed
The system SHALL provide an Admin-owned, local, read-only controlled smoke preflight for WeCom source evidence before any controlled smoke attempt. The preflight SHALL consume only sanitized summary aliases for source readiness, release decision, source connection freshness/state, redaction signal, blocking alias, and operator scope.

#### Scenario: Ready preflight is explicitly bounded
- **WHEN** the preflight receives `sourceReadinessAlias=wecom_source_ready`, `releaseDecisionAlias=wecom_source_ready`, fresh source connection evidence, a redacted signal, no blocking alias, and local read-only operator scope
- **THEN** the preflight status SHALL be `ready-for-wecom-controlled-smoke-preflight`
- **AND** the output SHALL state that this only proves Admin WeCom source controlled smoke preparation, not non-empty organization tree readiness, Gateway/API/Insight success, authorization facts, real WeCom sync success, production readiness, or full-success

#### Scenario: Missing source readiness handoff fails closed
- **WHEN** the preflight does not receive a source readiness alias
- **THEN** the preflight status SHALL be `missing-readiness-handoff`
- **AND** the output SHALL direct the operator to run the Admin-owned Source Readiness Handoff before continuing

#### Scenario: Missing release decision fails closed
- **WHEN** the preflight receives source readiness evidence but no release decision alias
- **THEN** the preflight status SHALL be `missing-release-decision`
- **AND** the output SHALL direct the operator to run the Admin-owned Source Release Decision before continuing

#### Scenario: Stale source freshness blocks controlled smoke preflight
- **WHEN** source connection freshness/state evidence is stale, unknown, missing, disabled, failed, or otherwise not fresh
- **THEN** the preflight status SHALL be `source-not-fresh`
- **AND** the output SHALL direct the operator back to Admin-owned source freshness remediation without querying real databases or downstream stores

#### Scenario: Redaction gaps fail closed
- **WHEN** the input contains unmasked secrets, tokens, cookies, private URLs, account identifiers, phone numbers, emails, full organization trees, full organization IDs, source tenant metadata, raw response bodies, or explicit redaction-required aliases
- **THEN** the preflight status SHALL be `redaction-required`
- **AND** the output SHALL NOT echo sensitive values

#### Scenario: Red line blockers stop preflight
- **WHEN** the input contains a blocking alias, red-line alias, or an operator scope outside local read-only preflight
- **THEN** the preflight status SHALL be `red-line-blocked`
- **AND** the output SHALL provide owner/fallback guidance without triggering sync, writing fixtures, querying real databases, or reading API, Insight, or Gateway data

#### Scenario: Downstream or full-success overclaim is rejected
- **WHEN** the input claims real WeCom sync success, real DB state, non-empty organization tree, Gateway/API/Insight success, authorization facts, fixture readiness, publish success, production readiness, or full-success
- **THEN** the preflight status SHALL be `overclaim-full-success`
- **AND** the output SHALL require removing the overclaim and rerunning with sanitized source-only evidence
