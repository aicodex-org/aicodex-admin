## ADDED Requirements

### Requirement: Admin 必须提供组织主数据质量 readiness
Admin SHALL provide a read-only organization master data quality readiness summary for operators before gateway projection publish or projection diagnostics workflows.

#### Scenario: Operator reads quality readiness
- **WHEN** an authorized Admin operator requests quality readiness for an organization
- **THEN** Admin SHALL evaluate Admin-owned `PlatformDepartment`, `PlatformMembership`, `PlatformUser`, `PlatformApiUserMapping`, `SourceConnection` and `OrgSyncBatch` snapshot data
- **AND** Admin SHALL return `status`, `generatedAt`, quality counts, stable `reasonAliases`, source freshness/trust summary and sync batch lineage summary
- **AND** Admin SHALL NOT query API/Gateway/Insight internal databases or trigger gateway projection publish

#### Scenario: Quality readiness returns stable status
- **WHEN** source lineage is missing, source connection is disabled/stale/unavailable, duplicate source keys exist, active membership references a missing active user, or no publishable active/tombstone subject exists
- **THEN** Admin SHALL return `status=blocked` with stable reason aliases
- **WHEN** non-blocking data quality gaps exist such as orphan departments, disabled/tombstone/unknown/conflicted/stale subjects, unmapped subjects, untrusted mappings or memberships referencing missing departments
- **THEN** Admin SHALL return `status=warning`
- **WHEN** source lineage is usable and no blocked or warning aliases exist
- **THEN** Admin SHALL return `status=ready`

#### Scenario: Quality readiness remains sanitized and owner-scoped
- **WHEN** quality readiness is returned, logged, documented or shown in web-admin
- **THEN** Admin SHALL expose only counts, status, aliases and remediation summary
- **AND** Admin SHALL NOT expose token, Cookie, private URL, phone, email, full organization tree, raw source response, complete user detail or complete organization structure
- **AND** the readiness summary SHALL be treated as Admin producer diagnostics, not gateway authorization facts

### Requirement: Web admin 必须展示组织主数据质量 readiness
Admin web UI SHALL expose a compact organization master data quality readiness area near Platform API mapping and gateway projection manual publish context.

#### Scenario: Operator reviews quality before publish
- **WHEN** operator opens the mapping/projection console for an organization
- **THEN** the UI SHALL show quality `status`, stable reason aliases, source/sync summary and key counts
- **AND** the UI SHALL provide a refresh action for the read-only quality readiness
- **AND** the UI SHALL explain that quality readiness is an Admin-owned preflight signal and does not prove API/Gateway/Insight authorization success
