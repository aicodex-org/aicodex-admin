# admin-gateway-organization-projection-publisher Delta

## ADDED Requirements

### Requirement: Admin 必须提供 cleanup execute readiness

Admin SHALL provide an admin-only cleanup execute readiness for gateway projection publish attempt retention cleanup so operators can review approval gates before any destructive cleanup execution exists.

#### Scenario: Operator requests execute readiness
- **WHEN** an authorized Admin operator requests cleanup execute readiness for an organization
- **THEN** Admin SHALL require `organization`
- **AND** Admin SHALL evaluate readiness from Admin-owned publish attempt history and cleanup dry-run plan only
- **AND** Admin SHALL support safe filters such as `source`, `status`, `failureCategory`, `olderThan` and `limit`
- **AND** Admin SHALL NOT query API, Gateway or Insight internal storage

#### Scenario: Readiness envelope is returned
- **WHEN** Admin returns cleanup execute readiness
- **THEN** the response SHALL include `readiness`, `safeNextAction`, `disabledReasons`, `dryRunId`, `dryRunHash`, `retentionPolicyVersion`, `lastDryRunFreshness`, candidate and blocked counts, diagnostic completeness, receipt hint availability, operator approval requirements and a sanitized export payload
- **AND** the response SHALL NOT include token, Cookie, private URL, raw Gateway response, complete organization tree, complete subject details or resource authorization facts
- **AND** Gateway receipt hints SHALL be described as diagnostics only and SHALL NOT be represented as runtime authorization success

#### Scenario: Readiness blocks unsafe execution
- **WHEN** cleanup dry-run is stale, has no candidates, has blocked attempts, has missing diagnostic summary, has missing receipt hints or lacks required approval evidence
- **THEN** Admin SHALL return a non-ready readiness alias and stable `disabledReasons`
- **AND** Admin SHALL return a conservative `safeNextAction`
- **AND** Admin SHALL keep `executeGuardrail.enabled=false` and `dryRunOnly=true` for P0

#### Scenario: Readiness remains read-only
- **WHEN** operator requests cleanup execute readiness
- **THEN** Admin SHALL NOT delete or update publish attempt records
- **AND** Admin SHALL NOT trigger projection publish
- **AND** Admin SHALL NOT write Gateway authorization facts
- **AND** Admin SHALL NOT write approval records or open a production cleanup gate

### Requirement: Web admin 必须展示 cleanup execute readiness

Admin web UI SHALL expose cleanup execute readiness near the gateway projection publish attempt retention cleanup dry-run panel.

#### Scenario: Operator reviews execute readiness in web admin
- **WHEN** an Admin operator opens the gateway projection publish attempt area
- **THEN** the UI SHALL display readiness, safe next action, disabled reasons, dry-run id/hash, freshness, candidate and blocked counts, diagnostic completeness, receipt hint availability and approval requirements
- **AND** the UI SHALL support copying or exporting sanitized readiness JSON
- **AND** the UI SHALL cover loading, empty, error and disabled states without exposing destructive cleanup controls
- **AND** the UI SHALL explain that readiness is Admin producer diagnostics only and not downstream authorization evidence
