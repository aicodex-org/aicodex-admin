# admin-gateway-organization-projection-publisher Delta

## ADDED Requirements

### Requirement: Admin 必须记录 gateway projection publish attempt history

Admin SHALL record a sanitized gateway projection publish attempt history for Admin-owned projection producer operations. The history SHALL cover manual publish attempts and scheduled publish attempts that use the shared Admin projection producer flow.

#### Scenario: Manual publish records blocked attempt
- **WHEN** an authorized Admin operator triggers manual publish
- **AND** publisher config, source freshness, source connection, lineage, lifecycle or mapping readiness causes the publish to fail closed before gateway ingestion
- **THEN** Admin SHALL record a publish attempt with `source=manual`
- **AND** the attempt SHALL include `status=error` or equivalent blocked status, stable `failureCategory`, subject counts, skipped reason counts when available, `createdAt`, `durationMs`, `traceId` and organization-scoped metadata
- **AND** the attempt SHALL NOT contain projection token, Authorization header, Cookie, private URL, full projection payload, raw gateway response body, phone, email, full organization tree or complete subject details

#### Scenario: Manual publish records publisher result
- **WHEN** manual publish reaches the configured gateway projection publisher
- **THEN** Admin SHALL record a publish attempt with sanitized publisher result fields including `accepted`, `idempotent`, `retryable`, `projectionBatchId`, gateway `orgVersion`, `sourceVersion`, subject counts, `skippedByReason`, `failureCategory`, `durationMs` and `createdAt`
- **AND** the history record SHALL NOT be treated as gateway authorization facts or API/Insight success evidence

#### Scenario: Scheduled publish records attempt
- **WHEN** WeCom sync trigger, refresh worker or another scheduled Admin producer path calls the shared projection publish flow
- **THEN** Admin SHALL record a publish attempt with `source=scheduled`
- **AND** the record SHALL use the same sanitized field semantics as manual attempt history
- **AND** attempt history write failure SHALL NOT create, update or delete gateway authorization facts

### Requirement: Admin 必须提供 publish attempt history 查询

Admin SHALL provide admin-only read APIs for gateway projection publish attempt history so operators can review recent attempts without reading logs or downstream databases.

#### Scenario: Operator lists publish attempts
- **WHEN** an authorized Admin operator queries publish attempts for an organization
- **THEN** Admin SHALL return attempts ordered by newest `createdAt`
- **AND** the query SHALL support source, status, time range and limit filters
- **AND** the response SHALL include only sanitized producer diagnostic fields
- **AND** the response SHALL NOT include raw payload, downstream credentials, private endpoints, full organization tree or complete subject details

#### Scenario: Operator reads publish attempt detail
- **WHEN** an authorized Admin operator queries an attempt by stable attempt id
- **THEN** Admin SHALL return the sanitized attempt detail for that organization-scoped producer attempt
- **AND** missing or unauthorized records SHALL fail closed without leaking whether sensitive downstream data exists

### Requirement: Web admin 必须展示 publish attempt history

Admin web UI SHALL expose recent gateway projection publish attempts near the existing Platform API mapping and manual publish console.

#### Scenario: Operator reviews recent attempts
- **WHEN** operator opens the mapping/projection console for an organization
- **THEN** the UI SHALL display recent attempts with source, status, failure category, accepted/idempotent/retryable, projection/source versions, subject counts, duration and created time
- **AND** the UI SHALL support source/status/time filtering or equivalent low-risk controls
- **AND** the UI SHALL provide a sanitized detail view for skipped reason counts and producer diagnostic metadata
- **AND** the UI SHALL explain through labels or context that attempt history is Admin producer diagnosis only and not gateway authorization facts

#### Scenario: Manual publish refreshes history
- **WHEN** manual publish completes, fails or is blocked
- **THEN** the UI SHALL refresh the recent attempts list
- **AND** the operator SHALL be able to inspect the recorded attempt without exposing raw payload or credentials
