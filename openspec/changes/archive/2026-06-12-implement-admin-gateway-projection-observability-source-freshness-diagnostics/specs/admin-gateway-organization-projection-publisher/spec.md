## ADDED Requirements

### Requirement: Projection observability MUST expose source freshness diagnostics
Admin SHALL expose sanitized source connection status/freshness diagnostics in projection producer observability so operators can distinguish source trust and freshness gaps without querying API, Insight, gateway stores, or raw source data.

#### Scenario: Latest publish reports source status and freshness distribution
- **WHEN** admin records latest gateway projection publish observability
- **THEN** diagnostics SHALL keep the existing `sourceConnectionStatus` compatibility field
- **AND** diagnostics SHALL include a structured source connection summary with total connection count
- **AND** diagnostics SHALL include status counts keyed by source connection `Status`
- **AND** diagnostics SHALL include freshness counts keyed by source connection `Freshness`
- **AND** diagnostics SHALL indicate whether stale, unavailable, or unknown freshness is present

#### Scenario: Source diagnostics stay sanitized
- **WHEN** operator, smoke, or runbook reads projection observability
- **THEN** source diagnostics SHALL include only counts, status/freshness enum values, stable category codes, and boolean summary signals
- **AND** diagnostics SHALL NOT include `sourceTenantId`, `metadata`, `configRef`, `secretRef`, projection token, Authorization header, Cookie, private endpoint, real account, phone, email, complete organization tree, or raw gateway response body

#### Scenario: Source freshness maps to stable diagnostic categories
- **WHEN** latest publish depends on disabled source connections
- **THEN** diagnostics SHALL prefer `source_connection_disabled`
- **WHEN** latest publish depends on stale or unavailable source freshness
- **THEN** diagnostics SHALL expose `source_connection_stale` unless a more direct publish result failure already exists
- **WHEN** latest publish has missing or unknown source freshness and no more specific category exists
- **THEN** diagnostics SHALL expose `unknown` rather than describing the projection as fully fresh

#### Scenario: Source diagnostics remain producer-only
- **WHEN** API/Gateway, Insight, smoke, or runbook consumers inspect Admin observability
- **THEN** source freshness diagnostics SHALL be treated only as Admin producer diagnostics
- **AND** Admin SHALL NOT write gateway authorization facts from these diagnostics
- **AND** API/Insight SHALL NOT consume Admin observability JSON to locally compute projection, authorization facts, report scope, or runtime allow/deny
