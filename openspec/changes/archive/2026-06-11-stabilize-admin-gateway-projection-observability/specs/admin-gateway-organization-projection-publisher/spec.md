## ADDED Requirements

### Requirement: Admin MUST expose sanitized projection producer observability

Admin SHALL expose an admin-only diagnostic surface for gateway organization projection producer runtime readiness. The diagnostic surface SHALL summarize publisher config readiness, refresh worker readiness, latest publish audit, latest refresh run, freshness window, lineage, subject counts and skip reason summary without exposing credentials or raw downstream responses.

#### Scenario: Projection observability returns sanitized readiness summary

- **WHEN** an authorized admin operator requests projection producer observability
- **THEN** the response SHALL include whether publisher and refresh worker are enabled
- **AND** the response SHALL include refresh interval, freshness TTL and whether interval is less than TTL
- **AND** the response SHALL include latest publish `projectionBatchId`, `orgVersion`, `lineage.sourceVersion`, `generatedAt`, `freshness.expiresAt`, subject counts, skip reason summary, status, stable error category, attempts, idempotency signal and `durationMs` when available
- **AND** the response SHALL include latest refresh `lastRunAt`, `nextRunAt` or interval, `lastSuccessAt`, `lastFailureAt`, `lastFailureCategory`, published/failed/skipped counts and current freshness window when available
- **AND** the response SHALL NOT include projection token, Authorization header, Cookie, private URL, phone number, personal email, raw gateway response body or full organization details

#### Scenario: Projection observability stays within owner boundaries

- **WHEN** projection observability is queried by Admin UI, smoke script or runbook
- **THEN** Admin SHALL only report producer diagnostics for admin-owned projection publishing
- **AND** Admin SHALL NOT write or infer gateway resource authorization facts
- **AND** Admin SHALL NOT expose admin management organization tree JSON as an API/gateway authorization input
- **AND** Insight SHALL NOT use this diagnostic output to locally calculate projection or authorization facts

### Requirement: Projection publish and refresh failures MUST use stable diagnostic categories

Admin SHALL map publisher, builder, source and refresh worker failures to stable sanitized categories for smoke and handoff diagnostics.

#### Scenario: Failure category mapping is stable

- **WHEN** publisher config is missing, gateway is unavailable, gateway rejects contract input, source data is stale or disabled, mapping is untrusted, lifecycle is untrusted, lineage is invalid, no publishable subjects exist, or an unknown error occurs
- **THEN** diagnostics SHALL report one of `projection_token_missing`, `gateway_unavailable`, `gateway_contract_mismatch`, `source_connection_stale`, `source_connection_disabled`, `mapping_untrusted`, `lifecycle_untrusted`, `lineage_invalid`, `no_publishable_subjects` or `unknown`
- **AND** logs and diagnostic responses SHALL retain only sanitized code/category, status and counts
- **AND** logs and diagnostic responses SHALL NOT include raw credentials, private endpoints or full sensitive payloads

### Requirement: Projection observability smoke MUST be repeatable and sanitized

Admin SHALL provide a repeatable smoke asset or runbook for projection observability readiness.

#### Scenario: Smoke validates readiness without leaking environment data

- **WHEN** a test operator runs the projection observability smoke against the approved test environment
- **THEN** the smoke SHALL validate service health, projection observability response shape, publisher/refresh enabled state, interval-vs-TTL diagnostic, latest audit visibility when available and sanitized field absence
- **AND** the smoke SHALL treat disabled/missing config or missing latest audit as a runtime gap rather than a false success
- **AND** verification records SHALL use environment aliases and variable names instead of concrete environment addresses, credentials or real organization details
