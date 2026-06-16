## ADDED Requirements

### Requirement: Gateway projection controlled smoke evidence readiness MUST fail closed
Admin SHALL provide a local, read-only controlled smoke evidence readiness helper for gateway projection operator coordination. The helper SHALL consume only sanitized evidence aliases and summaries for Admin release decision, controlled-smoke preflight, controlled-smoke release runbook, API diagnostics readiness/release runbook, redaction signal and blocking alias. It SHALL classify the evidence bundle into stable statuses without triggering publish, refresh, fixture writes, database mutations, API/Insight queries, gateway ingestion or gateway authorization fact writes.

#### Scenario: Evidence bundle is ready only for evidence review
- **WHEN** Admin release decision alias is `ready-for-controlled-smoke`
- **AND** controlled smoke preflight alias is `ready-for-controlled-smoke-prep`
- **AND** controlled smoke release runbook status is ready
- **AND** API diagnostics evidence is checked and clear
- **AND** all evidence is sanitized and contains no blocking alias or red-line signal
- **THEN** readiness SHALL return `status=ready-for-controlled-smoke-evidence-review`
- **AND** `release` SHALL be `release_after_report`
- **AND** readiness SHALL state that this only permits controlled smoke evidence review, not real publish success, gateway ingestion success, authorization facts success, API/Gateway/Insight success, production readiness or full-success

#### Scenario: Missing Admin evidence fails closed
- **WHEN** release decision, controlled smoke preflight or controlled smoke release runbook evidence is missing or not ready
- **THEN** readiness SHALL return `status=missing-admin-preflight`
- **AND** readiness SHALL preserve Admin owner handoff, stable blocking alias and minimum unblock condition when available
- **AND** readiness SHALL NOT ask API, Insight or Gateway owners to compute Admin projection locally

#### Scenario: Missing API diagnostics evidence fails closed
- **WHEN** API diagnostics readiness or release runbook evidence is missing, blocked, failed, stale, rejected or unknown
- **THEN** readiness SHALL return `status=missing-api-diagnostics`
- **AND** readiness SHALL direct the operator to the API diagnostics owner using only sanitized alias and minimum unblock condition
- **AND** Admin SHALL NOT query API databases, Insight databases, gateway stores, private URLs or raw API responses to resolve the blocker

#### Scenario: Redaction gaps fail closed
- **WHEN** evidence contains token, Cookie, private endpoint, real account, phone, email, complete organization tree, complete organizationId, source tenant metadata, configRef, secretRef, raw gateway/API response body, full diagnostics response or other credential-like data
- **THEN** readiness SHALL return `status=redaction-required`
- **AND** readiness SHALL expose only stable redaction aliases, owner guidance and minimum unblock conditions
- **AND** readiness SHALL NOT echo the sensitive value or complete response

#### Scenario: Red-line signals and real writes are blocked
- **WHEN** evidence or operator notes contain real publish, gateway ingestion, authorization facts, fixture/DB write, read model rebuild, mapping confirm or other real environment write signals
- **THEN** readiness SHALL return `status=red-line-blocked`
- **AND** readiness SHALL keep `release=hold`
- **AND** readiness SHALL instruct the operator to remove the write signal and recollect read-only sanitized evidence

#### Scenario: Full-success overclaim is blocked separately
- **WHEN** evidence or operator notes claim `full-success`, controlled smoke success, production readiness, API/Gateway/Insight success, real publish success, gateway ingestion success or authorization facts success
- **THEN** readiness SHALL return `status=overclaim-full-success`
- **AND** readiness SHALL keep `release=hold`
- **AND** readiness SHALL state that Admin evidence readiness cannot be used as downstream success proof
