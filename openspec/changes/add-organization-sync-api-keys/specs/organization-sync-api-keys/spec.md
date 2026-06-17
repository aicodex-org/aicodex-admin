## ADDED Requirements

### Requirement: Organization sync API Key lifecycle
The system SHALL allow an authorized administrator to create, list, disable, delete, and rotate API Keys that are dedicated to organization-structure synchronization for exactly one non-built-in organization.

#### Scenario: Create sync API Key for target organization
- **WHEN** a global administrator or target organization administrator creates a sync API Key for a non-built-in organization
- **THEN** the system persists the key metadata bound to that organization
- **AND** returns the plaintext secret only in that create response
- **AND** stores only a hash, prefix, state, optional expiration time, creator, and audit metadata in the database

#### Scenario: Reject built-in organization key
- **WHEN** an administrator attempts to create or rotate a sync API Key for `built-in`
- **THEN** the system rejects the request because built-in is not a syncable business organization

#### Scenario: Rotate sync API Key
- **WHEN** an authorized administrator rotates an existing active or disabled sync API Key
- **THEN** the system replaces the stored hash and prefix with a newly generated secret
- **AND** returns the new plaintext secret only in the rotate response
- **AND** keeps the key bound to the same organization

#### Scenario: List sync API Keys without plaintext
- **WHEN** an authorized administrator lists sync API Keys
- **THEN** the response includes metadata such as organization, name, display name, state, prefix, expiration time, and last used fields
- **AND** it does not include plaintext secrets or secret hashes

### Requirement: Organization sync API Key authorization
The system SHALL validate organization sync API Keys independently from ordinary OAuth access tokens and SHALL NOT create a browser session or grant general administrator privileges for those keys.

#### Scenario: Valid sync API Key reads bound organization data
- **WHEN** a request supplies `Authorization: Bearer <sync-api-key>` for an active, unexpired key
- **THEN** the system authenticates a sync principal bound to the key organization
- **AND** permits only organization synchronization read APIs for that organization

#### Scenario: Invalid sync API Key is rejected safely
- **WHEN** a request supplies a missing, unknown, disabled, expired, or malformed sync API Key
- **THEN** the system rejects the request with a stable authentication error
- **AND** the response does not expose the plaintext key, stored hash, or unrelated token data

#### Scenario: Sync API Key cannot access write APIs
- **WHEN** a valid sync API Key is used on organization, group, application, user, or key mutation APIs
- **THEN** the system rejects the request as unauthorized

#### Scenario: Organization mismatch is denied
- **WHEN** a valid sync API Key bound to one organization requests groups or applications for a different organization
- **THEN** the system rejects the request as unauthorized

### Requirement: Organization sync export API
The system SHALL expose a read-only organization sync export API that returns the organization summary, groups, and applications needed by gateway synchronization for the key-bound organization.

#### Scenario: Export bound organization snapshot
- **WHEN** a valid sync API Key calls `GET /api/organization-sync/export`
- **THEN** the response contains the bound organization, its groups, and its organization applications
- **AND** application secrets are masked according to existing application masking rules

#### Scenario: Record last usage metadata
- **WHEN** a valid sync API Key successfully authenticates a sync read request
- **THEN** the system records last used time, source IP, and a bounded user-agent summary for the key

### Requirement: Legacy organization read API compatibility
The system SHALL allow existing gateway synchronization clients to use organization sync API Keys against the current organization read endpoints while preserving the key-bound organization boundary.

#### Scenario: Legacy organizations endpoint returns bound organization only
- **WHEN** a valid sync API Key calls `GET /api/get-organizations?owner=admin`
- **THEN** the system returns only the organization bound to that key
- **AND** the response includes `data2=1` as the total count

#### Scenario: Legacy groups endpoint returns bound groups only
- **WHEN** a valid sync API Key calls `GET /api/get-groups?owner=<organization>`
- **THEN** the system returns groups only when `<organization>` matches the key-bound organization
- **AND** when `p` and `pageSize` are supplied, the system returns only the requested page
- **AND** the pagination follows the legacy paginator defaults for invalid, non-positive, or out-of-range values
- **AND** the response includes `data2` with the total bound-group count

#### Scenario: Legacy applications endpoint returns bound applications only
- **WHEN** a valid sync API Key calls `GET /api/get-organization-applications?owner=admin&organization=<organization>`
- **THEN** the system returns applications only when `<organization>` matches the key-bound organization
- **AND** when `p` and `pageSize` are supplied, the system returns only the requested page
- **AND** the pagination follows the legacy paginator defaults for invalid, non-positive, or out-of-range values
- **AND** the response includes `data2` with the total bound-application count
