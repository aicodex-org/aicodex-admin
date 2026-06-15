# admin-gateway-organization-projection-publisher Delta

## ADDED Requirements

### Requirement: Admin 必须提供 cleanup approval audit trail

Admin SHALL provide an admin-owned cleanup approval audit trail or read model for gateway projection publish attempt retention cleanup readiness so operators can review safe pre-execution accountability before any destructive cleanup execution exists.

#### Scenario: Operator requests approval audit trail
- **WHEN** an authorized Admin operator requests cleanup approval audit trail for an organization
- **THEN** Admin SHALL require `organization`
- **AND** Admin SHALL return `storageScope=admin_cleanup_approval_audit_trail.v1`, generated time, summary counts and sanitized records
- **AND** each record SHALL include stable aliases or hashes for action, readiness hash, retention policy version, candidate count, approval state, disabled reasons, safe next action and timestamps
- **AND** Admin SHALL evaluate or record the trail using Admin-owned persisted producer readiness/audit data only
- **AND** Admin SHALL NOT query API, Gateway or Insight internal storage

#### Scenario: Operator records safe approval action
- **WHEN** an Admin operator records a safe action such as `approve`, `reject`, `copy`, `export` or `refresh`
- **THEN** Admin SHALL persist or project only sanitized audit fields
- **AND** Admin SHALL keep `executeGuardrail.enabled=false` and `dryRunOnly=true` for P0
- **AND** Admin SHALL NOT execute cleanup, delete or update publish attempt records, trigger projection publish, write Gateway authorization facts or open a production cleanup gate

#### Scenario: Approval audit trail is redacted
- **WHEN** Admin returns approval audit trail or export payload
- **THEN** the response SHALL NOT include token, Cookie, private URL, raw Gateway response, complete organization tree, complete subject details or resource authorization facts
- **AND** Gateway receipt hints SHALL be described as diagnostics only and SHALL NOT be represented as runtime authorization success

### Requirement: Web admin 必须展示 cleanup approval audit trail

Admin web UI SHALL expose cleanup approval audit trail near the gateway projection publish attempt cleanup execute readiness panel.

#### Scenario: Operator reviews approval audit trail in web admin
- **WHEN** an Admin operator opens the gateway projection publish attempt cleanup readiness area
- **THEN** the UI SHALL display storage scope, approval state, action aliases, readiness hash, retention policy version, candidate count, disabled reasons, safe next action and created/updated time
- **AND** the UI SHALL support copying or exporting sanitized audit JSON
- **AND** the UI SHALL cover loading, empty, error and disabled states without exposing destructive cleanup controls
- **AND** the UI SHALL explain that audit trail is Admin producer diagnostics only and not downstream authorization evidence
