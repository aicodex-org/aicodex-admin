## MODIFIED Requirements

### Requirement: Organization sync export API
The system SHALL expose a read-only organization sync export API for the key-bound organization. The API MUST preserve the existing legacy response when no contract version is requested and MUST return the versioned source-lineage contract when `contractVersion=v2` is explicitly requested. Unknown versions MUST fail closed and MUST NOT silently fall back to legacy.

#### Scenario: Export bound organization legacy snapshot
- **WHEN** a valid sync API Key calls `GET /api/organization-sync/export` without `contractVersion=v2`
- **THEN** the response contains the existing bound organization, groups, and organization applications shape
- **AND** application secrets are masked according to existing application masking rules
- **AND** the response MUST NOT add v2-only fields that break legacy clients

#### Scenario: Export bound organization v2 snapshot
- **WHEN** a valid sync API Key calls `GET /api/organization-sync/export?contractVersion=v2`
- **THEN** the response MUST declare `contractVersion=v2`
- **AND** MUST contain the real source connection/type/tenant, source org version/batch, generated/freshness fields and lineage digest
- **AND** application secrets MUST remain masked

#### Scenario: Reject unknown contract version
- **WHEN** a valid sync API Key requests an unsupported non-empty `contractVersion`
- **THEN** the system MUST return a stable contract mismatch error
- **AND** MUST NOT return a legacy payload that could be interpreted as authorization-grade v2 data

#### Scenario: Record last usage metadata
- **WHEN** a valid sync API Key successfully authenticates a sync read request
- **THEN** the system records last used time, source IP, and a bounded user-agent summary for the key

## ADDED Requirements

### Requirement: Contract v2 MUST preserve real source lineage
The v2 export MUST represent exactly one selected current source connection and MUST preserve its real `sourceConnectionId`, `sourceType`, `sourceTenantId`, source org version and batch. Admin MUST NOT rewrite a WeCom source into a synthetic `custom admin:<organization>` connection.

#### Scenario: Organization has one current WeCom connection
- **WHEN** the key-bound organization has one active/fresh WeCom `SourceConnection` and a current successful or partial `OrgSyncBatch`
- **THEN** v2 MUST return that connection and current batch lineage
- **AND** lineage MUST include `sourceService=aicodex-admin`, source version and `sha256:<hex>` digest

#### Scenario: Multiple source connections require selection
- **WHEN** the organization has multiple current source connections and the request does not select one
- **THEN** v2 MUST fail with `source_connection_selection_required`
- **AND** MUST NOT merge them or choose a last-written connection

#### Scenario: Source is stale or lineage is incomplete
- **WHEN** the selected connection is stale/disabled, the current batch is missing, or source version/batch lineage cannot be proven
- **THEN** v2 MUST fail closed with a stable reason
- **AND** MUST NOT publish active member or leader relations

### Requirement: Contract v2 MUST publish stable multi-department member relations
The v2 export MUST publish current member relations from `PlatformMembership`, `PlatformUser` and confirmed `ExternalIdentity`. Each relation MUST carry stable subject/external identity, department, source-scoped `isMain`, lifecycle/mapping, source connection/version/batch and explicit source role/position arrays when available. Display name, email, phone and legacy group user strings MUST NOT be join keys.

#### Scenario: User belongs to two departments
- **WHEN** one stable subject has current memberships in D1 and D2 and D1 is main
- **THEN** v2 MUST publish both relations and mark only D1 as main for that source
- **AND** MUST NOT collapse the user to the first, last or main department

#### Scenario: Identity mapping is missing or conflicted
- **WHEN** a membership cannot resolve to exactly one confirmed external identity for the selected source
- **THEN** v2 MUST NOT publish it as an active trusted member relation
- **AND** MUST include a stable skipped/blocked reason count without exposing the raw identity

#### Scenario: Disabled membership is explicit
- **WHEN** a previously current membership has disabled/deleted/stale lifecycle in the selected source snapshot
- **THEN** v2 MAY publish an explicit non-active relation for reconciliation
- **AND** MUST NOT normalize it to active or omit its source ownership/version

### Requirement: Contract v2 MUST publish only explicit leader relations
Department leaders MUST come only from current `PlatformMembership.IsManager`; direct leaders MUST come only from current enabled source relationship records and confirmed stable identities. Admin MUST NOT infer leader relations from position text, department parenthood, co-membership, legacy single manager, display name or email.

#### Scenario: Publish department leader
- **WHEN** a current membership marks U1 as manager of D1
- **THEN** v2 MUST publish an explicit U1→D1 department leader relation with source/version/lifecycle
- **AND** MUST NOT describe U1 as organization manager

#### Scenario: Publish recursive direct-leader inputs
- **WHEN** current WeCom relationships contain U1→U2 and U2→U3 with confirmed stable identities
- **THEN** v2 MUST publish both direct edges independently
- **AND** MUST NOT precompute or widen them into department or organization scope

#### Scenario: Legacy manager text is not authoritative
- **WHEN** a legacy group has a non-empty `manager` display/local string but no current explicit leader relation
- **THEN** the legacy response MAY retain the field for compatibility
- **AND** v2 MUST NOT fabricate a department or direct leader relation from it

### Requirement: Contract v2 MUST be deterministic and secret-safe
For the same current source snapshot, v2 arrays and lineage digest MUST be deterministic. The response, logs and fixtures MUST NOT expose sync API Keys, secret/config references, access tokens, email, phone or complete provider payloads.

#### Scenario: Rebuild the same snapshot
- **WHEN** the same current source facts are exported repeatedly
- **THEN** departments and relations MUST retain stable ordering and deduplication
- **AND** lineage digest MUST remain equal

#### Scenario: Inspect v2 observability
- **WHEN** Admin logs or tests a v2 export
- **THEN** observability MAY include contract/source/version/batch/count/reason summaries
- **AND** MUST NOT include credentials, raw stable external identity values or full member payloads
