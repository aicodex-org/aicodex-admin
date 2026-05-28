# wecom-organization-sync Specification

## Purpose
定义企业微信通讯录组织架构同步能力，包括同步配置、业务组织绑定、部门/成员/关系映射、同步执行审计、软禁用策略和后台管理接口。

## Requirements
### Requirement: WeCom organization sync configuration
The system SHALL allow an authorized administrator to configure one active WeCom organization sync source for a target organization, including `corpId`, a self-built application secret with readable address book scope, target organization, sync enablement, and soft-disable behavior.

#### Scenario: Save valid sync configuration
- **WHEN** an authorized administrator saves a configuration with required WeCom credentials and target organization
- **THEN** the system persists the configuration and masks sensitive secret values in subsequent responses

#### Scenario: Bind configuration to authorized target organization
- **WHEN** an administrator saves, reads, tests, runs, or inspects WeCom organization sync data
- **THEN** the system resolves exactly one target organization from request parameters or authenticated organization context and verifies the caller is allowed to manage that organization

#### Scenario: Reject incomplete sync configuration
- **WHEN** an authorized administrator saves a configuration without required WeCom credentials or target organization
- **THEN** the system rejects the request with a validation error that identifies the missing fields

#### Scenario: Bind Corp ID to business organization
- **WHEN** a global administrator saves a WeCom sync configuration from the built-in organization context with a valid Corp ID
- **THEN** the system derives or finds a stable business organization such as `wecom-<CorpID短码>`
- **AND** persists the sync configuration against that business organization instead of `built-in`
- **AND** returns the resolved organization in the API response

#### Scenario: Reject built-in sync execution
- **WHEN** a sync run is requested for a configuration whose target organization is `built-in`
- **THEN** the system rejects the run before creating or executing a sync task

### Requirement: WeCom business organization initialization
The system SHALL initialize or reuse a non-built-in business organization for WeCom organization sync based on the stable WeCom Corp ID.

#### Scenario: Create organization from Corp ID
- **WHEN** no business organization exists for the Corp ID
- **THEN** the system creates an `Organization` with owner `admin`, stable name `wecom-<CorpID短码>`, and a safe display name
- **AND** the system creates a stable default application such as `app-wecom-<CorpID短码>` for that organization

#### Scenario: Repair missing default application
- **WHEN** an existing Corp ID bound business organization has no default application
- **THEN** saving the sync configuration or starting a sync run creates the stable default application and assigns it to the organization

#### Scenario: Bind synced user to default application
- **WHEN** a WeCom user is inserted or updated without a local signup application
- **THEN** the system assigns the Corp ID bound default application to that user

#### Scenario: Upload synced user avatar with application context
- **WHEN** an administrator uploads an avatar for a WeCom synced user
- **THEN** the upload uses the synced user's local signup application to resolve the Storage Provider
- **AND** it SHALL NOT fall back to `app-built-in` unless that is the user's actual application
- **AND** local file system storage SHALL use a persistent host mount for `/files`

#### Scenario: Update auto display name from root department
- **WHEN** a full sync successfully fetches a root WeCom department name for the bound business organization
- **THEN** the system may update an automatically generated display name to that root department name
- **AND** it SHALL NOT change the stable organization name

#### Scenario: Preserve manually edited organization display name
- **WHEN** an administrator has already changed the business organization display name away from the auto-generated value
- **THEN** later full sync runs SHALL NOT overwrite that manual display name

### Requirement: WeCom sync mapping persistence
The system SHALL persist WeCom-specific department and user mapping data outside the core Group and User fields, and SHALL persist authorization-relevant relationships in queryable relationship records instead of serialized text arrays.

#### Scenario: Persist department mapping
- **WHEN** a WeCom department is synced
- **THEN** the system stores its corp ID, department ID, local group owner/name, parent department mapping, primary manager cache, enabled state, last seen run, and `last_synced_at` timestamp in a WeCom department mapping record

#### Scenario: Persist user mapping
- **WHEN** a WeCom user is synced
- **THEN** the system stores its corp ID, userid, local user owner/name, external ID, main department ID, status, enabled state, last seen run, and `last_synced_at` timestamp in a WeCom user mapping record

#### Scenario: Persist user department relationships
- **WHEN** a WeCom user belongs to one or more departments
- **THEN** the system stores each user-department relationship with organization, corp ID, userid, department ID, local user owner/name, local group owner/name, main-department flag, leader-in-department flag, enabled state, last seen run, and `last_synced_at`

#### Scenario: Persist department manager relationships
- **WHEN** a WeCom department has one or more managers or leader users
- **THEN** the system stores each department-manager relationship with organization, corp ID, department ID, local group owner/name, leader userid, leader user owner/name, primary flag, enabled state, last seen run, and `last_synced_at`

#### Scenario: Persist direct leader relationships
- **WHEN** a WeCom user response includes direct leader userids
- **THEN** the system stores each user-direct-leader relationship with organization, corp ID, userid, local user owner/name, leader userid, leader user owner/name, enabled state, last seen run, and `last_synced_at`

#### Scenario: Preserve core object compatibility
- **WHEN** WeCom-specific mapping data is updated
- **THEN** the system keeps Group and User compatible with existing local behavior and does not require Group to store arbitrary WeCom properties

### Requirement: WeCom organization sync persistence schema
The system SHALL define Xorm-managed persistence objects for WeCom organization sync configuration, sync runs, department mappings, user mappings, and core relationship tables with typed timestamp fields for audit and sync times.

#### Scenario: Create sync configuration table
- **WHEN** the application initializes database tables
- **THEN** it can create or update a `wecom_organization_sync_config` table that stores target organization, corp ID, self-built application secret, enablement, soft-disable behavior, last run, and `last_synced_at`

#### Scenario: Create sync run audit table
- **WHEN** the application initializes database tables
- **THEN** it can create or update a `wecom_organization_sync_run` table that stores trigger type, actor, status, stage, `started_at`, `finished_at`, `heartbeat_at`, `lease_expires_at`, count fields, and safe error summaries

#### Scenario: Create department mapping table
- **WHEN** the application initializes database tables
- **THEN** it can create or update a `wecom_department_mapping` table that stores the stable organization, corp ID, department ID, local group reference, parent department, primary manager, enabled state, last seen run metadata, and `last_synced_at`

#### Scenario: Create user mapping table
- **WHEN** the application initializes database tables
- **THEN** it can create or update a `wecom_user_mapping` table that stores the stable organization, corp ID, WeCom userid, local user reference, external ID, main department, status, enabled state, last seen run metadata, and `last_synced_at`

#### Scenario: Create user department relationship table
- **WHEN** the application initializes database tables
- **THEN** it can create or update a `wecom_user_department` table that stores queryable user-department relationships, main-department flags, leader-in-department flags, enabled state, last seen run metadata, and `last_synced_at`

#### Scenario: Create department leader relationship table
- **WHEN** the application initializes database tables
- **THEN** it can create or update a `wecom_department_leader` table that stores queryable department-manager relationships, primary flags, enabled state, last seen run metadata, and `last_synced_at`

#### Scenario: Create user direct leader relationship table
- **WHEN** the application initializes database tables
- **THEN** it can create or update a `wecom_user_direct_leader` table that stores queryable user-direct-leader relationships, enabled state, last seen run metadata, and `last_synced_at`

#### Scenario: Avoid text arrays for authorization relationships
- **WHEN** user department, department manager, or direct leader data is persisted
- **THEN** the system stores those relationships in dedicated tables and does not rely on `mediumtext` or other serialized array columns for management scope calculation

#### Scenario: Use real timestamp fields for new sync tables
- **WHEN** the WeCom sync tables are created in PostgreSQL
- **THEN** `created_at`, `updated_at`, `started_at`, `finished_at`, and `last_synced_at` fields are backed by Go time fields and PostgreSQL `timestamptz` semantics instead of string columns
- **AND** the system writes these timestamps in UTC and returns API timestamp values as RFC3339 strings

#### Scenario: Keep boolean field names stable
- **WHEN** boolean fields such as `is_enabled`, `is_main`, `is_leader`, `is_primary`, or `soft_disable_missing_data` are implemented
- **THEN** the system uses Go `bool` fields and PostgreSQL boolean semantics instead of integer emulation
- **AND** each Go field declares explicit JSON and Xorm tags so API field names and database column names do not depend on default `IsXxx` name inference

#### Scenario: Keep stable unique identity
- **WHEN** WeCom departments or users are synced repeatedly
- **THEN** the system uses organization, corp ID, and WeCom department ID or userid as stable unique identity, enforced by database uniqueness or transactional upsert, and does not create duplicate mapping records

#### Scenario: Keep stable relationship identity
- **WHEN** WeCom user-department, department-manager, or user-direct-leader relationships are synced repeatedly
- **THEN** the system uses organization, corp ID, and the relevant relationship endpoints as stable unique identity, enforced by database uniqueness or transactional upsert, and does not create duplicate relationship records

#### Scenario: Use bounded relationship object names
- **WHEN** relationship records are created
- **THEN** their object `name` values use fixed-length stable identifiers such as `rel-<sha256>` instead of concatenating raw WeCom user or leader identifiers

#### Scenario: Derive primary manager consistently
- **WHEN** a department primary manager is stored for display compatibility
- **THEN** `wecom_department_leader.is_primary` remains the source of truth and any cached primary manager fields are derived from that relationship in the same sync stage

### Requirement: Schema migration and upgrade safety
The system SHALL use the existing Xorm table synchronization path for first-version additive schema changes and SHALL avoid destructive schema changes during automatic startup migration.

#### Scenario: Additive schema initialization
- **WHEN** the first version is deployed
- **THEN** the application registers the seven WeCom organization sync objects in the existing table initialization path so missing tables and additive fields can be created through Xorm

#### Scenario: Avoid destructive automatic migration
- **WHEN** a future version needs to remove, rename, narrow, or type-change persisted fields
- **THEN** the change is not performed implicitly by startup table synchronization and requires a separate idempotent upgrade plan with backup and verification steps

#### Scenario: Validate PostgreSQL behavior before production rollout
- **WHEN** the implementation is ready for environment testing
- **THEN** PostgreSQL table creation, indexes or service-level uniqueness, `timestamptz` timestamp behavior, relationship table queries, JSON/text diagnostic field serialization, and rollback-safe failure behavior are verified in the `aicodex-admin` test environment before production rollout

### Requirement: WeCom organization sync connection test
The system SHALL allow an authorized administrator to test WeCom address book credentials before starting a full sync.

#### Scenario: Successful connection test
- **WHEN** an authorized administrator tests a configuration with valid `corpId`, self-built application secret, and sufficient address book permission
- **THEN** the system confirms that the WeCom address book API is reachable and credentials are valid without changing local users or groups

#### Scenario: Failed connection test
- **WHEN** an authorized administrator tests a configuration with invalid credentials or insufficient address book permission
- **THEN** the system returns a safe validation error that identifies the WeCom API failure category without persisting any organization sync data

### Requirement: WeCom public API contract source
The system SHALL build organization sync data from WeCom public address book APIs and SHALL NOT depend on undocumented WeCom internal database tables or fields.

#### Scenario: Normalize department and user snapshots
- **WHEN** the sync client pulls WeCom organization data
- **THEN** it normalizes department identifiers, parent department identifiers, department manager identifiers, user identifiers, user department memberships, main departments, leader-in-department flags, direct leaders, and user status into an internal snapshot format

#### Scenario: Avoid binding sync service to one historical API path
- **WHEN** WeCom recommends a newer address book API combination or restricts a historical list API
- **THEN** the sync client may change the concrete WeCom API calls while preserving the same normalized snapshot contract for the sync service

### Requirement: Manual full differential organization sync
The system SHALL allow an authorized administrator to manually start a full differential WeCom organization sync for a target organization.

#### Scenario: Start full sync
- **WHEN** an authorized administrator starts a full sync for an enabled WeCom organization sync configuration
- **THEN** the system creates a sync run record and begins pulling WeCom departments, users, managers, direct leaders, and memberships for the target organization

#### Scenario: Apply differential changes
- **WHEN** the system finishes pulling a complete WeCom organization snapshot
- **THEN** the system inserts new local records, updates existing local records by stable WeCom identifiers, and preserves local identities that are already bound

#### Scenario: Prevent duplicate running sync
- **WHEN** a sync run is already running for the same target organization and another full sync is requested
- **THEN** the system rejects the second request with a clear in-progress error

#### Scenario: Recover stale running sync
- **WHEN** a previous running sync has not updated its heartbeat before its lease expires
- **THEN** the system can mark the stale run as failed before starting a new run and does not use the stale run for missing-data soft-disable decisions

#### Scenario: Avoid clear-and-rebuild behavior
- **WHEN** a full sync starts
- **THEN** the system does not clear existing local users, groups, memberships, manager relationships, or direct leader relationships before applying differential changes

### Requirement: WeCom organization sync admin APIs
The system SHALL expose administrator APIs for sync configuration, connection test, manual execution, and sync run inspection.

#### Scenario: Use module-based API namespace
- **WHEN** the system exposes WeCom organization sync management APIs
- **THEN** the APIs use the `/api/wecom-org-sync/...` module namespace rather than legacy `/api/get-*`, `/api/update-*`, or `/api/run-*` paths

#### Scenario: Manage sync configuration through API
- **WHEN** an authorized administrator gets or updates WeCom organization sync configuration
- **THEN** the system returns or persists the configuration for the target organization while masking sensitive secret values

#### Scenario: Resolve target organization through API
- **WHEN** an administrator calls a WeCom organization sync API
- **THEN** the API resolves the target organization from an explicit query/body field or an unambiguous authenticated organization context before applying authorization and data access rules

#### Scenario: Test sync configuration through API
- **WHEN** an authorized administrator tests WeCom organization sync configuration through `/api/wecom-org-sync/config/test`
- **THEN** the system validates the connection and required address book permissions without changing local users or groups

#### Scenario: Trigger sync through API
- **WHEN** an authorized administrator requests a manual full differential sync through `/api/wecom-org-sync/runs`
- **THEN** the system returns the created sync run identity or a duplicate-running error

#### Scenario: Inspect sync runs through API
- **WHEN** an authorized administrator queries `/api/wecom-org-sync/runs` or `/api/wecom-org-sync/runs/:runId`
- **THEN** the system returns run status, timestamp fields, actor, counts, and safe error summaries without exposing secrets

### Requirement: Department synchronization
The system SHALL synchronize WeCom departments into the local Group model while preserving stable WeCom department identity, hierarchy, and manager relationships.

#### Scenario: Create or update department group
- **WHEN** a WeCom department appears in the full sync result
- **THEN** the system creates or updates a Group with stable local name, WeCom department ID mapping, display name, parent group, department type, manager reference, top-group flag, and enabled state

#### Scenario: Preserve department identity across rename
- **WHEN** a WeCom department keeps the same department ID but changes its display name
- **THEN** the system updates the Group display name without changing the stable local group identity

#### Scenario: Avoid cross-organization group name collision
- **WHEN** two WeCom corp IDs contain the same department ID
- **THEN** newly generated local department `Group.Name` values include a stable corp ID component or bounded equivalent so they do not collide under the global Group name uniqueness constraint

#### Scenario: Preserve multiple department managers
- **WHEN** a WeCom department has multiple manager or leader users
- **THEN** the system stores a primary manager for compatible Group display and stores every manager relationship in `wecom_department_leader` for management scope calculation

### Requirement: User synchronization
The system SHALL synchronize WeCom members into the local User model using WeCom `userid` as the primary external identity, and SHALL preserve WeCom direct leader relationships when available.

#### Scenario: Create new WeCom user
- **WHEN** a WeCom member appears in the full sync result and no local user is bound to its `userid`
- **THEN** the system creates a User with stable local username, `Wecom` value, length-safe `ExternalId` when possible, display fields, contact fields, title, avatar, WeCom properties, and enabled state

#### Scenario: Preserve full external identity when User.ExternalId is too short
- **WHEN** the full WeCom external identifier would exceed the local User `ExternalId` length limit
- **THEN** the system stores the complete identifier in `wecom_user_mapping.external_id` and writes only a length-safe value to `User.ExternalId`

#### Scenario: Update existing bound user
- **WHEN** a WeCom member appears in the full sync result and a local user is already bound to its `userid`
- **THEN** the system updates the user's WeCom-sourced profile fields and properties without changing the user's local username

#### Scenario: Preserve local sensitive profile when WeCom omits fields
- **WHEN** a WeCom member response omits sensitive profile fields such as mobile, email, or avatar
- **THEN** the system preserves any existing local `Phone`, `Email`, or `Avatar` values instead of clearing them

#### Scenario: Preserve direct leader identifiers
- **WHEN** a WeCom member response includes `direct_leader`
- **THEN** the system stores each direct leader relationship in `wecom_user_direct_leader` separately from department membership and department manager data

#### Scenario: Avoid unstable local identity matching
- **WHEN** a WeCom member has the same name, phone, or email as an existing local user but no matching WeCom stable identifier
- **THEN** the system does not automatically merge the accounts and records the possible local duplicate for administrator review
- **AND** WeCom identity remains based on Corp ID and userid, not display name, phone, or email

### Requirement: WeCom relationship separation
The system SHALL treat department hierarchy, department manager relationships, and direct leader relationships as separate relationship types.

#### Scenario: Do not infer direct leader from department display
- **WHEN** a manager and a member appear under the same WeCom department in the contact list
- **THEN** the system does not infer a direct leader relationship unless the member data includes that manager in `direct_leader`

#### Scenario: Do not infer department manager from direct leader
- **WHEN** a WeCom member has a direct leader but that leader is not listed as a department manager
- **THEN** the system stores the direct leader relationship without treating the leader as a department manager

### Requirement: Membership synchronization
The system SHALL synchronize WeCom member department relationships into the existing local user group membership model.

#### Scenario: Assign user to department groups
- **WHEN** a WeCom member belongs to one or more synced departments
- **THEN** the system records enabled `wecom_user_department` relationships and assigns the corresponding WeCom-sourced local department group IDs to the user's group membership without removing non-WeCom groups

#### Scenario: Remove stale department membership
- **WHEN** a previously synced user is no longer listed in a previously synced WeCom department
- **THEN** the system disables the stale `wecom_user_department` relationship and removes only that WeCom-sourced department group membership while preserving the user account and non-WeCom groups

#### Scenario: Keep one main department relationship
- **WHEN** WeCom main department data is synchronized
- **THEN** the system treats `wecom_user_department.is_main` as the source of truth and keeps at most one enabled main department relationship per user in a target organization

### Requirement: Soft-disable missing WeCom data
The system SHALL soft-disable WeCom-sourced departments and users that were previously synced but are missing from a completed full sync result.

#### Scenario: Soft-disable missing department
- **WHEN** a previously synced WeCom department is missing from the latest completed full sync result
- **THEN** the system marks the corresponding Group as disabled or missing without physically deleting it

#### Scenario: Soft-disable missing user
- **WHEN** a previously synced WeCom user is missing from the latest completed full sync result
- **THEN** the system marks the corresponding User as disabled, deleted, or missing according to the configured soft-disable behavior without physically deleting it

#### Scenario: Do not soft-disable after failed sync
- **WHEN** a full sync fails or only partially completes before a full WeCom organization snapshot is available and persisted
- **THEN** the system records the failed or partial sync run without soft-disabling departments, users, memberships, manager relationships, or direct leader relationships based on missing data from that run

### Requirement: Sync status and failure classification
The system SHALL classify sync runs so administrators can distinguish successful, failed, partial, and running executions.

#### Scenario: Successful run status
- **WHEN** snapshot fetch, differential apply, relationship synchronization, and finalization all complete
- **THEN** the system marks the sync run as succeeded

#### Scenario: Failed run status
- **WHEN** token retrieval, required snapshot fetch, required field normalization, or core persistence fails
- **THEN** the system marks the sync run as failed and does not treat that run as a complete organization snapshot

#### Scenario: Partial run status
- **WHEN** the system can safely record non-critical object-level failures without applying missing-data soft-disable
- **THEN** the system may mark the sync run as partial and include object-level error summaries

### Requirement: Future incremental sync compatibility
The system SHALL keep the first version's data model compatible with future scheduled full sync and WeCom contact callback incremental sync.

#### Scenario: Scheduled full sync remains an extension
- **WHEN** the first version is implemented
- **THEN** the system keeps manual full differential sync as the required behavior and does not require scheduled execution to satisfy this change

#### Scenario: Callback incremental sync remains an extension
- **WHEN** WeCom contact callback events are not configured
- **THEN** the system remains correct through manual full differential sync and does not require callback incremental processing to satisfy this change

### Requirement: Sync run audit
The system SHALL record every WeCom organization sync execution with status, actor, timestamps, counts, and error summary.

#### Scenario: Successful sync run audit
- **WHEN** a full sync finishes successfully
- **THEN** the system records `started_at`, `finished_at`, heartbeat or lease timestamps, actor, status, department counts, user counts, membership counts, and soft-disabled counts

#### Scenario: Failed sync run audit
- **WHEN** a full sync fails because of WeCom API, credential, validation, or persistence errors
- **THEN** the system records failed status and a safe error summary that can be shown to an administrator

### Requirement: Organization sync acceptance scenarios
The system SHALL support the core organization change scenarios expected in the first version.

#### Scenario: Department rename is synchronized
- **WHEN** a WeCom department keeps the same department ID but changes name
- **THEN** the next successful full differential sync updates the local department display name without changing the stable local group name

#### Scenario: Department move is synchronized
- **WHEN** a WeCom department changes parent department
- **THEN** the next successful full differential sync updates the local parent group relationship

#### Scenario: User department change is synchronized
- **WHEN** a WeCom user changes departments
- **THEN** the next successful full differential sync updates local user group membership

#### Scenario: Manager and direct leader changes are synchronized
- **WHEN** WeCom department managers or user direct leaders change
- **THEN** the next successful full differential sync updates the corresponding relationship records used by management scope calculation
