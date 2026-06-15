## ADDED Requirements

### Requirement: Gateway projection release decision MUST provide operator handoff guidance
Admin SHALL provide a local, read-only operator handoff summary for gateway projection release decisions. The handoff SHALL be derived from sanitized release decision evidence and SHALL expose stable next actions, owner boundaries, minimum unblock conditions and non-extrapolation boundaries without triggering publish, refresh, fixture writes or database mutations.

#### Scenario: Ready decision only releases controlled smoke preparation
- **WHEN** release decision is `ready-for-controlled-smoke`
- **THEN** handoff SHALL return `release=release_after_report`
- **AND** handoff SHALL state that the next action is controlled smoke preparation only
- **AND** handoff SHALL NOT describe the result as real publish success, gateway ingestion success, authorization facts success, or full projection business success

#### Scenario: Source freshness decision hands off to Admin source owner
- **WHEN** release decision is `blocked-by-source-freshness`
- **THEN** handoff SHALL direct the operator to the Admin source/freshness owner
- **AND** the minimum unblock condition SHALL require fresh Admin-owned source connection status, source snapshot, `OrgSyncBatch` or equivalent source version/freshness evidence
- **AND** handoff SHALL NOT ask API, Insight or Gateway owners to compute projection locally

#### Scenario: Mapping readiness decision hands off to Admin mapping owner
- **WHEN** release decision is `blocked-by-mapping-readiness`
- **THEN** handoff SHALL direct the operator to the Admin mapping operator or Admin source owner according to the alias
- **AND** the minimum unblock condition SHALL require first-class `PlatformApiUserMapping.ApiUserId`, trusted mapping statuses, lifecycle readiness or source metadata readiness
- **AND** handoff SHALL NOT suggest using display name, phone, email, legacy lineage or user properties as runtime projection join keys

#### Scenario: Contract and config decision fails closed
- **WHEN** release decision is `blocked-by-contract-or-config`
- **THEN** handoff SHALL keep `release=hold`
- **AND** handoff SHALL preserve stable aliases, owner guidance and minimum unblock conditions for stale deployment shape, missing latest audit, subject fixture gates, unavailable response, unknown alias or sanitization failure
- **AND** handoff SHALL NOT include token, Cookie, private endpoint, real account, phone, email, complete organization tree, complete organizationId, source tenant metadata, configRef, secretRef or raw gateway response body

#### Scenario: Not checked decision provides read-only next action
- **WHEN** release decision is `not-checked`
- **THEN** handoff SHALL keep `release=hold`
- **AND** handoff SHALL provide the next read-only action to collect sanitized observability, readiness summary and mapping readiness evidence
- **AND** handoff SHALL NOT query real databases, write fixtures, publish projection, refresh projection or create gateway authorization facts
