## ADDED Requirements

### Requirement: Gateway projection controlled smoke preflight handoff MUST aggregate sanitized owner evidence
Admin SHALL provide a local, read-only controlled smoke preflight handoff for gateway projection operator coordination. The handoff SHALL aggregate sanitized Admin release decision evidence, Admin readiness/source freshness/mapping readiness evidence and API diagnostics decision evidence into stable decisions without triggering publish, refresh, fixture writes, database mutations, API/Insight queries or gateway authorization fact writes.

#### Scenario: Controlled smoke prep is explicitly bounded
- **WHEN** Admin release decision evidence is ready, Admin readiness/source freshness/mapping readiness evidence has no blocking alias, API diagnostics evidence is checked and clear, and all inputs are sanitized
- **THEN** the handoff SHALL return `decision=ready-for-controlled-smoke-prep`
- **AND** `release` SHALL be `release_after_report`
- **AND** the handoff SHALL state that this only permits controlled smoke preparation
- **AND** the handoff SHALL NOT describe the result as real publish success, gateway ingestion success, authorization facts success or full projection business success

#### Scenario: Admin release decision blocks controlled smoke prep
- **WHEN** Admin release decision evidence is `blocked`, `hold` or any decision other than the accepted controlled smoke readiness alias
- **THEN** the handoff SHALL return `decision=blocked-by-admin-release-decision`
- **AND** `ownerHandoffs` SHALL preserve the Admin release decision owner, alias and minimum unblock condition when available
- **AND** the handoff SHALL NOT ask API, Insight or Gateway owners to compute Admin projection locally

#### Scenario: Admin source freshness blocks controlled smoke prep
- **WHEN** Admin readiness evidence contains source freshness aliases such as `source_connection_stale`
- **THEN** the handoff SHALL return `decision=blocked-by-admin-source-freshness`
- **AND** the minimum unblock condition SHALL require Admin-owned source connection freshness, source snapshot, `OrgSyncBatch` or source version/freshness evidence to be clear
- **AND** the handoff SHALL NOT use API/Insight/gateway store data as substitute source freshness evidence

#### Scenario: Mapping readiness blocks controlled smoke prep
- **WHEN** Admin readiness evidence contains `mapping_missing`, `mapping_untrusted`, `source_metadata_unavailable`, `lineage_freshness_unavailable`, `lifecycle_not_publishable` or equivalent mapping readiness aliases
- **THEN** the handoff SHALL return `decision=blocked-by-mapping-readiness`
- **AND** the minimum unblock condition SHALL require first-class `PlatformApiUserMapping.ApiUserId`, trusted mapping statuses, lifecycle readiness or Admin source metadata readiness
- **AND** the handoff SHALL NOT suggest display name, phone, email, legacy lineage or user properties as runtime projection join keys

#### Scenario: API diagnostics blocks controlled smoke prep
- **WHEN** API diagnostics decision evidence reports a blocked, failed, stale, rejected or unknown diagnostics state
- **THEN** the handoff SHALL return `decision=blocked-by-api-diagnostics`
- **AND** `ownerHandoffs` SHALL direct the operator to the API diagnostics owner using only sanitized alias and minimum unblock condition
- **AND** Admin SHALL NOT query API databases, Insight databases, gateway stores, private URLs or raw API responses to resolve the blocker

#### Scenario: Contract or redaction problems fail closed
- **WHEN** required evidence is missing, contains unknown alias, contains token, Cookie, private endpoint, real account, phone, email, complete organization tree, complete organizationId, source tenant metadata, configRef, secretRef, raw gateway response body, full API diagnostics response or other credential-like data
- **THEN** the handoff SHALL return `decision=blocked-by-contract-or-redaction` or `decision=not-checked` according to the missing/invalid evidence type
- **AND** the output SHALL expose only stable aliases, sanitized owner guidance, minimum unblock conditions, `doNotDispatchUntil` and non-extrapolation boundaries
- **AND** the output SHALL NOT echo the sensitive value or complete response

#### Scenario: Not checked evidence provides read-only next action
- **WHEN** operator has not provided required Admin release decision, Admin readiness or API diagnostics evidence
- **THEN** the handoff SHALL return `decision=not-checked`
- **AND** `release` SHALL remain `hold`
- **AND** the next action SHALL request only read-only sanitized evidence collection
- **AND** the handoff SHALL NOT query real databases, write fixtures, publish projection, refresh projection or create gateway authorization facts
