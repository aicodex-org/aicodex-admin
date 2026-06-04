## MODIFIED Requirements

### Requirement: WeCom organization sync configuration
The system SHALL allow an authorized administrator to configure one active WeCom organization sync source for a target organization, including `corpId`, a self-built application secret with readable address book scope, target organization, sync enablement, and soft-disable behavior; the configuration SHALL be represented as or linked to an admin SourceConnection for the target platform organization.

#### Scenario: Save valid sync configuration
- **WHEN** an authorized administrator saves a configuration with required WeCom credentials and target organization
- **THEN** the system persists the configuration and masks sensitive secret values in subsequent responses
- **AND** the system creates or reuses a stable SourceConnection with `sourceType=wecom` and `sourceTenantId` derived from the Corp ID

#### Scenario: Bind configuration to authorized target organization
- **WHEN** an administrator saves, reads, tests, runs, or inspects WeCom organization sync data
- **THEN** the system resolves exactly one target organization from request parameters or authenticated organization context and verifies the caller is allowed to manage that organization
- **AND** the system keeps the platform organization identity separate from the WeCom Corp ID

#### Scenario: Reject incomplete sync configuration
- **WHEN** an authorized administrator saves a configuration without required WeCom credentials or target organization
- **THEN** the system rejects the request with a validation error that identifies the missing fields

#### Scenario: Bind Corp ID to business organization
- **WHEN** a global administrator saves a WeCom sync configuration from the built-in organization context with a valid Corp ID
- **THEN** the system derives or finds a stable business organization such as `wecom-<CorpID短码>`
- **AND** persists the sync configuration against that business organization instead of `built-in`
- **AND** returns the resolved organization in the API response
- **AND** records the Corp ID as SourceConnection metadata instead of treating it as the platform organization ID

#### Scenario: Reject built-in sync execution
- **WHEN** a sync run is requested for a configuration whose target organization is `built-in`
- **THEN** the system rejects the run before creating or executing a sync task

### Requirement: WeCom sync mapping persistence
The system SHALL persist WeCom-specific department and user mapping data outside the core Group and User fields, SHALL persist authorization-relevant relationships in queryable relationship records instead of serialized text arrays, and SHALL write normalized platform organization master data for cross-service provider consumption.

#### Scenario: Persist department mapping
- **WHEN** a WeCom department is synced
- **THEN** the system stores its corp ID, department ID, local group owner/name, parent department mapping, primary manager cache, enabled state, last seen run, and `last_synced_at` timestamp in a WeCom department mapping record
- **AND** the system creates or updates the corresponding PlatformDepartment record with SourceConnection lineage

#### Scenario: Persist user mapping
- **WHEN** a WeCom user is synced
- **THEN** the system stores its corp ID, userid, local user owner/name, external ID, main department ID, status, enabled state, last seen run, and `last_synced_at` timestamp in a WeCom user mapping record
- **AND** the system creates or updates ExternalIdentity using `sourceConnectionId + userid`
- **AND** the system maps the ExternalIdentity to the stable PlatformUser when matching is confirmed

#### Scenario: Persist user department relationships
- **WHEN** a WeCom user belongs to one or more departments
- **THEN** the system stores each user-department relationship with organization, corp ID, userid, department ID, local user owner/name, local group owner/name, main-department flag, leader-in-department flag, enabled state, last seen run, and `last_synced_at`
- **AND** the system creates or updates the corresponding Membership records with source lineage and lifecycle status

#### Scenario: Persist department manager relationships
- **WHEN** a WeCom department has one or more managers or leader users
- **THEN** the system stores each department-manager relationship with organization, corp ID, department ID, local group owner/name, leader userid, leader user owner/name, primary flag, enabled state, last seen run, and `last_synced_at`
- **AND** the system projects the relationship into platform Membership or manager relationship records used by report scope calculation

#### Scenario: Persist direct leader relationships
- **WHEN** a WeCom user response includes direct leader userids
- **THEN** the system stores each user-direct-leader relationship with organization, corp ID, userid, local user owner/name, leader userid, leader user owner/name, enabled state, last seen run, and `last_synced_at`
- **AND** the system records lineage so later source-neutral scope calculation does not need to read WeCom raw semantics

#### Scenario: Preserve core object compatibility
- **WHEN** WeCom-specific mapping data is updated
- **THEN** the system keeps Group and User compatible with existing local behavior and does not require Group to store arbitrary WeCom properties
- **AND** the system treats WeCom-specific tables as adapter internal state, migration input, or compatibility cache rather than cross-service authority
