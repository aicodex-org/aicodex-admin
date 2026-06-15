## ADDED Requirements

### Requirement: Gateway projection operator remediation handoff MUST map blockers to safe owner actions
Admin SHALL provide a local, read-only operator remediation handoff wrapper for gateway projection diagnostics. The wrapper SHALL consume only sanitized readiness summary, release decision, controlled smoke preflight/runbook/evidence readiness and source freshness aliases. It SHALL map common blocker aliases to stable remediation categories, owners, action lists, minimum unblock conditions and non-extrapolation boundaries without triggering publish, refresh, fixture writes, database mutations, mapping confirmation, API/Insight queries, gateway ingestion or gateway authorization fact writes.

#### Scenario: Mapping blockers route to Admin mapping operator
- **WHEN** sanitized evidence contains `mapping_missing`, `mapping_untrusted`, `source_metadata_unavailable`, `lineage_freshness_unavailable` or `lifecycle_not_publishable`
- **THEN** the handoff SHALL include a mapping remediation category
- **AND** owner SHALL be `admin_mapping_operator` or `admin_source_owner` according to the alias
- **AND** minimum unblock conditions SHALL require first-class `PlatformApiUserMapping.ApiUserId`, trusted mapping statuses, lifecycle readiness or Admin-owned source metadata
- **AND** the handoff SHALL NOT suggest display name, phone, email, legacy lineage or user properties as runtime projection join keys

#### Scenario: Source freshness blockers route to Admin source owner
- **WHEN** sanitized evidence contains `source_connection_stale`, `source_connection_unavailable` or `source_connection_unknown`
- **THEN** the handoff SHALL include a source freshness remediation category
- **AND** owner SHALL be `admin_source_owner`
- **AND** minimum unblock conditions SHALL require Admin-owned source connection freshness, source snapshot, `OrgSyncBatch` or source version/freshness evidence
- **AND** the handoff SHALL NOT ask API, Insight or Gateway owners to compute projection locally

#### Scenario: Deploy, refresh and contract blockers route to Admin runtime owners
- **WHEN** sanitized evidence contains publisher disabled, refresh disabled, stale deployment shape, contract mismatch, version mismatch or unavailable observability aliases
- **THEN** the handoff SHALL include deploy/runtime or contract remediation categories
- **AND** owner SHALL be `admin_deploy_owner`, `admin_runtime_owner` or `admin_contract_owner`
- **AND** the handoff SHALL instruct operators to redeploy/fix config/contract using read-only diagnostics before rerunning readiness
- **AND** it SHALL NOT trigger publish, refresh, read model rebuild, gateway ingestion or authorization facts

#### Scenario: Fixture prerequisites stay scoped to fixture owner
- **WHEN** sanitized evidence contains `no_publishable_subjects`, `active_fixture_missing`, `tombstone_fixture_missing` or equivalent empty subject gate aliases
- **THEN** the handoff SHALL include fixture remediation
- **AND** owner SHALL be `fixture_owner`
- **AND** minimum unblock conditions SHALL require an authorized controlled active/tombstone subject fixture before rerunning read-only checks
- **AND** the handoff SHALL state that empty subject evidence is not full projection business success

#### Scenario: Controlled smoke prerequisites stay evidence-scoped
- **WHEN** sanitized evidence contains controlled smoke preflight, release runbook or evidence readiness missing/blocking aliases
- **THEN** the handoff SHALL include controlled smoke evidence remediation
- **AND** owner SHALL be `admin_operator` or `api_diagnostics_owner` according to the missing evidence
- **AND** the handoff SHALL request only sanitized release decision, preflight, runbook or API diagnostics evidence
- **AND** it SHALL NOT record controlled smoke as passed or production-ready

#### Scenario: Sensitive or overclaimed evidence fails closed
- **WHEN** input contains token, Cookie, private endpoint, real account, phone, email, complete organization tree, complete organizationId, raw response body, real fixture/DB details, real write signals or full-success/API/Gateway/Insight success claims
- **THEN** the handoff SHALL return a blocked remediation status such as `redaction-required`, `red-line-blocked` or `overclaim-full-success`
- **AND** it SHALL NOT echo sensitive values or complete responses
- **AND** it SHALL keep `release=hold`

#### Scenario: Unknown blockers remain safe and actionable
- **WHEN** sanitized evidence contains an unrecognized blocker alias
- **THEN** the handoff SHALL include `unknown-admin-remediation`
- **AND** owner SHALL be `admin_operator`
- **AND** the action SHALL direct operators back to Admin projection readiness/runbook evidence collection
- **AND** the handoff SHALL NOT infer API, Insight or Gateway authorization facts
