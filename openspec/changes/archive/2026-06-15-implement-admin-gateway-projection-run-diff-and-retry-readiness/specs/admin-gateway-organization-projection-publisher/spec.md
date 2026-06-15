## ADDED Requirements

### Requirement: Admin 必须提供 projection run diff 与 retry readiness
Admin SHALL provide an admin-only read-only gateway projection run diff and retry readiness summary for the latest publish run, and MAY validate an operator supplied `traceId` or `projectionBatchId` against the current latest run reference.

#### Scenario: Operator reviews latest run readiness
- **WHEN** an authorized Admin operator requests run readiness for an organization
- **THEN** Admin SHALL build a current Admin-owned projection dry-run for that organization without publishing
- **AND** Admin SHALL compare the current source/projection summary with the latest Admin recorded publish attempt when available
- **AND** Admin SHALL return source org/version, target contractVersion status, subject projectionVersion summary, subject counts, active/tombstone/unmapped/invalid counts, last failure alias and retry readiness
- **AND** Admin SHALL NOT invent a payload `contractVersion`; when the gateway contract has no explicit field, Admin SHALL expose that absence as a diagnostic status only
- **AND** Admin SHALL NOT read API/Gateway/Insight runtime stores or treat downstream authorization facts as input

#### Scenario: Retry is classified as safe only for stable transient failures
- **WHEN** the latest run failed with a retryable transient publisher/gateway failure and the current Admin dry-run source/projection counts have not changed from the latest run
- **THEN** Admin SHALL return `retry.readiness=safe_retry` or equivalent stable action
- **AND** Admin SHALL include operator guidance that retry only republishes Admin producer input and does not prove Gateway/API/Insight authorization success

#### Scenario: Retry waits for source refresh when source is stale
- **WHEN** source freshness is stale/unavailable, source connection is disabled/missing, or current Admin source version differs from the latest run source version
- **THEN** Admin SHALL return `retry.readiness=wait_source_refresh`
- **AND** Admin SHALL keep guidance scoped to Admin-owned source refresh/remediation

#### Scenario: Retry is blocked by mapping or subject invalid data
- **WHEN** current dry-run contains unmapped, untrusted, lifecycle-invalid or source-data-invalid subjects, or the latest failure alias maps to those categories
- **THEN** Admin SHALL return `retry.readiness=fix_mapping_or_subject`
- **AND** Admin SHALL include only aggregate counts and stable categories, not raw subject details

#### Scenario: Run readiness response is sanitized
- **WHEN** Admin returns run diff and retry readiness
- **THEN** the response SHALL NOT contain projection token, Authorization header, Cookie, private URL, phone, email, full organization tree, raw gateway response body or complete subject details
- **AND** if no durable run history exists, Admin SHALL explicitly mark the run reference as latest in-process observability rather than pretending to provide historical audit

#### Scenario: Contract version status follows the existing gateway contract
- **WHEN** the current Admin-to-gateway projection payload has no explicit `contractVersion`
- **THEN** run readiness SHALL return a diagnostic contract version status such as `not_declared_by_gateway_contract`
- **AND** Admin SHALL NOT add a synthetic `contractVersion` to the publish payload or mark missing contractVersion as a local build failure

### Requirement: Web admin 必须展示 projection run retry readiness 摘要
Admin web UI SHALL expose a projection run retry readiness area near the existing Platform API mapping/readiness/manual publish context.

#### Scenario: Operator sees retry action and diff counts
- **WHEN** operator opens the mapping/projection console for an organization
- **THEN** the UI SHALL load the run readiness summary
- **AND** the UI SHALL display retry action, last failure alias, source/projection versions and aggregate diff/count tags
- **AND** the UI SHALL avoid sensitive raw payloads and explain that readiness is Admin producer diagnosis only
