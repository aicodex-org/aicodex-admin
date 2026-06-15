## ADDED Requirements

### Requirement: Admin 必须提供 gateway projection manual publish console
Admin SHALL provide an admin-only manual publish console for gateway organization projection so an operator can trigger one controlled refresh/publish attempt after source, mapping and freshness readiness are reviewed.

#### Scenario: Operator triggers controlled manual publish
- **WHEN** an authorized Admin operator triggers manual publish for an organization
- **THEN** Admin SHALL call the existing `GatewayProjectionService.BuildAndPublishOrganization` flow
- **AND** Admin SHALL use the configured service-to-service gateway projection publisher
- **AND** Admin SHALL NOT write gateway resource authorization facts, permission matrix rows or runtime authorization audit
- **AND** Admin SHALL NOT use Insight/API data stores, Admin management tree JSON or observability JSON as authorization input

#### Scenario: Manual publish returns stable result envelope
- **WHEN** manual publish completes or fails
- **THEN** Admin SHALL return a sanitized result envelope containing `accepted`, `idempotent`, `retryable`, `projectionBatchId`, `orgVersion`, `sourceVersion`, subject counts, `skippedByReason`, `failureCategory`, `durationMs`, `freshnessExpiresAt` and sourceConnection readiness summary
- **AND** the response SHALL include stable disabled reasons when publish cannot be safely triggered
- **AND** the response SHALL NOT contain projection token, Authorization header, Cookie, private URL, phone, email, full organization tree, raw gateway response body or complete organization details

#### Scenario: Manual publish fails closed on missing readiness
- **WHEN** publisher config is missing, source freshness is stale/unavailable, source connection is disabled, lineage is invalid or the build result contains no publishable subjects because mapping/lifecycle readiness is incomplete
- **THEN** Admin SHALL return `status=error` or equivalent blocked result with a stable `failureCategory`
- **AND** Admin SHALL NOT mark the attempt as accepted or idempotent unless the gateway publisher result explicitly reports it
- **AND** Admin SHALL keep the operator guidance scoped to Admin-owned remediation

### Requirement: Web admin 必须展示 projection manual publish 操作区
Admin web UI SHALL expose a projection manual publish operator area near the existing Platform API mapping/readiness/observability context.

#### Scenario: Operator reviews readiness and latest attempt
- **WHEN** operator opens the mapping/projection console for an organization
- **THEN** the UI SHALL show publisher/source/readiness summary, manual publish disabled reasons, trigger button and latest attempt result
- **AND** the UI SHALL display stable categories and counts rather than sensitive raw payloads
- **AND** the UI SHALL explain that manual publish only publishes gateway organization projection input and does not prove API/Gateway/Insight authorization success

#### Scenario: UI blocks unsafe trigger when readiness is incomplete
- **WHEN** readiness summary indicates publisher disabled, source freshness not ready, source metadata missing or no active/tombstone subject is publishable
- **THEN** the UI SHALL disable or warn before manual publish
- **AND** the backend SHALL still enforce fail-closed behavior if the operator sends the request
