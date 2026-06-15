# admin-gateway-organization-projection-publisher Delta

## ADDED Requirements

### Requirement: Admin 必须提供 publish attempt retention metadata

Admin SHALL expose sanitized retention metadata for gateway projection publish attempts so operators can understand record lifecycle without performing destructive cleanup.

#### Scenario: Attempt history includes retention metadata
- **WHEN** an authorized Admin operator lists or reads publish attempts for an organization
- **THEN** Admin SHALL include retention metadata such as retention window, `expiresAt`, `cleanupEligible` and `cleanupReason`
- **AND** cleanup eligibility SHALL be a read-only diagnostic signal and SHALL NOT delete or mutate attempt records
- **AND** the response SHALL NOT include raw payload, downstream credentials, private endpoints, full organization tree or complete subject details

#### Scenario: Retention readiness summarizes cleanup candidates
- **WHEN** an authorized Admin operator queries publish attempt retention readiness for an organization
- **THEN** Admin SHALL return aggregate counts for total attempts, cleanup-eligible attempts, blocked attempts and stable reason aliases
- **AND** Admin SHALL fail closed when organization is missing
- **AND** Admin SHALL NOT execute cleanup, delete database rows, trigger publish or write gateway authorization facts

### Requirement: Admin 必须提供 publish attempt receipt query hint

Admin SHALL provide sanitized receipt query hints that correlate Admin producer attempts with Gateway owner ingestion status queries.

#### Scenario: Attempt detail exposes receipt hint
- **WHEN** an attempt has projection lineage fields such as `projectionBatchId`, gateway `orgVersion` or `sourceVersion`
- **THEN** Admin SHALL include a receipt query hint with organization, latest flag and available projection identifiers
- **AND** the hint SHALL be marked unavailable when required query keys are missing
- **AND** the hint SHALL NOT be treated as Gateway receipt success, API authorization success or Insight report success

#### Scenario: Web admin links attempt to ingestion status query
- **WHEN** an operator opens a publish attempt detail
- **THEN** the UI SHALL display retention status and receipt query hint
- **AND** when the hint is available, the UI MAY trigger the existing read-only Gateway ingestion status query using the hint fields
- **AND** the UI SHALL explain that Gateway receipt/status is downstream owner evidence only and not runtime authorization success
