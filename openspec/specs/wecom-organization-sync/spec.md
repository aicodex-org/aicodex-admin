# wecom-organization-sync Specification

## Purpose
定义企业微信通讯录组织架构同步能力，包括同步配置、业务组织绑定、部门/成员/关系映射、同步执行审计、软禁用策略和后台管理接口。
## Requirements
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
The system SHALL keep the data model compatible with future WeCom contact callback incremental sync while supporting manual and scheduled full differential sync.

#### Scenario: Scheduled full sync is supported
- **WHEN** scheduled sync is explicitly enabled for a valid WeCom organization sync configuration
- **THEN** the system MUST run full differential sync through the generic organization sync scheduler
- **AND** scheduled execution MUST preserve the same differential update, run audit, running-lock, and missing-data soft-disable semantics as manual full sync

#### Scenario: Callback incremental sync remains an extension
- **WHEN** WeCom contact callback events are not configured
- **THEN** the system remains correct through manual or scheduled full differential sync and does not require callback incremental processing to satisfy this change

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

### Requirement: WeCom sync run monitoring UI
The system SHALL provide a self-describing sync run monitoring view in the WeCom organization sync admin page so administrators can understand run statistics directly from the table and continue observing active runs without refreshing the whole page.

#### Scenario: Show self-describing department and user statistics
- **WHEN** the admin page renders sync run records
- **THEN** the department and user statistic columns MUST expose the meaning of `created`, `updated`, and `disabled` counts in the table header or cell content itself
- **AND** an administrator MUST be able to understand each statistic row without relying on a detached legend outside the table

#### Scenario: Auto refresh while a run is active
- **WHEN** the current organization's sync record list contains at least one run whose status is `running`
- **THEN** the admin page MUST automatically refresh the sync record list at a bounded interval
- **AND** the page MUST stop automatic refresh after all visible runs enter terminal states such as `succeeded`, `failed`, or `partial`

#### Scenario: Show refresh observation status in page
- **WHEN** the admin page has loaded the sync record section
- **THEN** the page MUST show whether it is currently auto refreshing because of a `running` record or waiting for manual refresh
- **AND** the page MUST expose the latest successful sync record refresh time in the page itself instead of relying only on transient toast messages

#### Scenario: Keep the first screen visible while config is still loading
- **WHEN** the account organization or sync config has not finished resolving yet
- **THEN** the page MUST render a visible in-page loading state instead of a blank screen
- **AND** the loading state MUST keep the admin page context recognizable

#### Scenario: Provide manual refresh action
- **WHEN** an administrator is viewing the sync record section
- **THEN** the page MUST provide an explicit manual refresh action near the sync record area
- **AND** triggering that action MUST fetch the latest sync record data for the current organization without requiring a full page reload
- **AND** the refresh action MUST expose an in-progress state while the request is outstanding

#### Scenario: Browse paged sync run history
- **WHEN** the administrator changes the sync record table page or page size
- **THEN** the page MUST request the selected `page/pageSize` from `/api/wecom-org-sync/runs`
- **AND** the table MUST render the returned history records for that selected page instead of keeping the first page frozen
- **AND** the total count shown in pagination MUST stay consistent with the backend response

#### Scenario: Explain historical page viewing mode
- **WHEN** the administrator is browsing page 2 or later of the sync record table
- **THEN** the page MUST present that state as historical browsing rather than the primary live run observation view
- **AND** the page MUST guide the administrator to return to page 1 when they need to observe the latest run status

#### Scenario: Avoid duplicate start actions while a run is already active
- **WHEN** the sync record section already shows at least one `running` run for the current organization
- **THEN** the page MUST NOT continue exposing the manual full sync start action as an immediately clickable operation
- **AND** the start area MUST make the in-progress state recognizable to the administrator

#### Scenario: Treat stale duplicate-start conflicts as refresh guidance
- **WHEN** an administrator attempts to start a manual sync and the backend responds that a sync run is already running
- **THEN** the page MUST show a non-failure hint that an existing sync is in progress
- **AND** the page MUST refresh the sync record list for the current organization so the running state becomes visible in-page
- **AND** the page MUST NOT present this conflict as a brand new sync failure

#### Scenario: Clear refresh loop on page context change
- **WHEN** the administrator leaves the page or switches to another organization
- **THEN** the page MUST stop any existing automatic refresh loop for the previous page context
- **AND** it MUST NOT continue updating the previous organization view after the context has changed

### Requirement: WeCom scheduled full differential organization sync
The system SHALL allow an authorized administrator to configure scheduled full differential WeCom organization sync for a target organization, using the generic organization sync scheduler.

#### Scenario: Configure scheduled sync
- **WHEN** an authorized administrator saves WeCom organization sync configuration with scheduled sync enabled, cron expression, and timezone
- **THEN** the system MUST persist those scheduling settings through the generic organization sync schedule model
- **AND** subsequent configuration reads MUST return the saved schedule settings with sensitive WeCom secrets masked
- **AND** the scheduling settings MUST NOT be persisted as WeCom-specific configuration table columns

#### Scenario: Scheduled run uses scheduled trigger type
- **WHEN** the generic organization sync scheduler dispatches a WeCom full sync
- **THEN** the created WeCom organization sync run MUST use `triggerType=scheduled`
- **AND** the actor MUST identify the scheduler rather than a human administrator

#### Scenario: Manual run remains manual
- **WHEN** an administrator starts a WeCom organization sync through `/api/wecom-org-sync/runs`
- **THEN** the created run MUST continue to use `triggerType=manual`
- **AND** existing duplicate-running and stale-running behavior MUST remain unchanged

#### Scenario: Scheduled sync respects existing run lease
- **WHEN** a scheduled WeCom sync is due while another WeCom sync run is still active for the same target organization
- **THEN** the scheduler MUST NOT create a duplicate WeCom run
- **AND** the skipped schedule fire MUST guide administrators to the existing running run record

#### Scenario: Scheduled sync disabled by default
- **WHEN** a WeCom organization sync configuration exists but scheduled sync has not been explicitly enabled
- **THEN** no scheduled WeCom sync run MUST be dispatched

### Requirement: WeCom scheduled sync admin visibility
The system SHALL expose scheduled sync settings and recent dispatch metadata in the WeCom organization sync administration experience.

#### Scenario: Show schedule settings in admin page
- **WHEN** an administrator opens the WeCom organization sync page
- **THEN** the page MUST show whether scheduled sync is enabled, the cron expression, and the timezone

#### Scenario: Save schedule settings from admin page
- **WHEN** an administrator changes scheduled sync settings and saves the WeCom sync configuration
- **THEN** the page MUST send those settings to the backend
- **AND** the backend response MUST reflect the persisted schedule state

#### Scenario: Show scheduled trigger in run history
- **WHEN** the sync run history contains a scheduled run
- **THEN** the run history MUST allow an administrator to distinguish scheduled runs from manual runs

### Requirement: WeCom source readiness handoff
The system SHALL provide an Admin-owned, read-only WeCom source readiness handoff that lets an operator classify whether the WeCom organization sync source has the minimum readiness evidence needed before organization tree or projection follow-up work.

#### Scenario: Produce sanitized source readiness handoff
- **WHEN** an operator runs the WeCom source readiness handoff with sanitized config and runs evidence
- **THEN** the handoff output MUST only include `status`, `aliases`, `ownerHandoffs`, `minimumUnblockConditions`, `safeNextActions`, and `evidenceShapeVersion`
- **AND** it MUST classify evidence using stable aliases including `wecom_config_missing`, `wecom_config_disabled`, `wecom_credential_not_verified`, `wecom_latest_run_failed`, `wecom_no_recent_success`, `wecom_run_active`, and `wecom_source_ready`

#### Scenario: Keep handoff read-only
- **WHEN** the source readiness handoff runs
- **THEN** it MUST NOT trigger manual sync, create a sync run, update sync configuration, write fixtures, query or write a real database directly, or read API, Insight, or Gateway data
- **AND** it MUST rely only on Admin-owned read-only WeCom config/runs evidence and optional sanitized credential-verification summary

#### Scenario: Fail closed on sensitive evidence
- **WHEN** the handoff input contains unmasked secrets, tokens, cookies, private URLs, account identifiers, phone numbers, emails, full organization trees, full organization IDs, source tenant metadata, or raw response bodies
- **THEN** the handoff MUST return a blocked sanitization alias without echoing the sensitive values

#### Scenario: Do not overstate downstream readiness
- **WHEN** the handoff returns `wecom_source_ready`
- **THEN** operators MUST treat it only as Admin WeCom source readiness evidence
- **AND** they MUST NOT record it as proof of non-empty organization tree readiness, Gateway projection readiness, authorization report readiness, controlled smoke success, or full-success

### Requirement: WeCom source release decision guardrail
The system SHALL provide an Admin-owned, read-only WeCom source release decision guardrail that consumes sanitized WeCom source readiness handoff evidence and produces the minimum operator-facing release decision for later organization tree read-only readiness or controlled smoke preparation.

#### Scenario: Produce ready decision from sanitized source readiness handoff
- **WHEN** the release decision guardrail receives a sanitized source readiness handoff with `wecom_source_ready`
- **THEN** the output MUST include `decision=ready_for_org_tree_readiness`, `reasonAlias=wecom_source_ready`, `safeNextSteps`, `minimumUnblockConditions`, and `doNotProceedReasons`
- **AND** `release=release_after_report` MUST only permit later owner read-only readiness or controlled smoke preparation

#### Scenario: Preserve blocking source readiness aliases
- **WHEN** the release decision guardrail receives `wecom_config_missing`, `wecom_config_disabled`, `wecom_credential_not_verified`, `wecom_latest_run_failed`, `wecom_no_recent_success`, `wecom_run_active`, or `sanitization_failed`
- **THEN** the output MUST keep `decision=blocked` and preserve the stable alias as `reasonAlias`
- **AND** it MUST expose owner handoff and minimum unblock conditions without triggering manual sync, creating sync runs, writing fixtures, querying real databases, or reading API, Insight, or Gateway data

#### Scenario: Fail closed on sensitive or downstream evidence
- **WHEN** the release decision input contains unmasked secrets, tokens, cookies, private URLs, account identifiers, phone numbers, emails, full organization trees, full organization IDs, source tenant metadata, raw response bodies, real fixture/DB details, or Gateway/API/Insight/full-success assertions
- **THEN** the output MUST return `decision=blocked` with `reasonAlias=sanitization_failed`
- **AND** it MUST NOT echo the sensitive or downstream values

#### Scenario: Do not overstate downstream success
- **WHEN** the release decision returns `ready_for_org_tree_readiness`
- **THEN** operators MUST NOT record it as proof that the organization tree is non-empty, Gateway projection is publishable, authorization facts are active, API or Insight success exists, real fixtures are ready, real database state is valid, or the system is full-success

### Requirement: WeCom source controlled smoke preflight MUST fail closed
The system SHALL provide an Admin-owned, local, read-only controlled smoke preflight for WeCom source evidence before any controlled smoke attempt. The preflight SHALL consume only sanitized summary aliases for source readiness, release decision, source connection freshness/state, redaction signal, blocking alias, and operator scope.

#### Scenario: Ready preflight is explicitly bounded
- **WHEN** the preflight receives `sourceReadinessAlias=wecom_source_ready`, `releaseDecisionAlias=wecom_source_ready`, fresh source connection evidence, a redacted signal, no blocking alias, and local read-only operator scope
- **THEN** the preflight status SHALL be `ready-for-wecom-controlled-smoke-preflight`
- **AND** the output SHALL state that this only proves Admin WeCom source controlled smoke preparation, not non-empty organization tree readiness, Gateway/API/Insight success, authorization facts, real WeCom sync success, production readiness, or full-success

#### Scenario: Missing source readiness handoff fails closed
- **WHEN** the preflight does not receive a source readiness alias
- **THEN** the preflight status SHALL be `missing-readiness-handoff`
- **AND** the output SHALL direct the operator to run the Admin-owned Source Readiness Handoff before continuing

#### Scenario: Missing release decision fails closed
- **WHEN** the preflight receives source readiness evidence but no release decision alias
- **THEN** the preflight status SHALL be `missing-release-decision`
- **AND** the output SHALL direct the operator to run the Admin-owned Source Release Decision before continuing

#### Scenario: Stale source freshness blocks controlled smoke preflight
- **WHEN** source connection freshness/state evidence is stale, unknown, missing, disabled, failed, or otherwise not fresh
- **THEN** the preflight status SHALL be `source-not-fresh`
- **AND** the output SHALL direct the operator back to Admin-owned source freshness remediation without querying real databases or downstream stores

#### Scenario: Redaction gaps fail closed
- **WHEN** the input contains unmasked secrets, tokens, cookies, private URLs, account identifiers, phone numbers, emails, full organization trees, full organization IDs, source tenant metadata, raw response bodies, or explicit redaction-required aliases
- **THEN** the preflight status SHALL be `redaction-required`
- **AND** the output SHALL NOT echo sensitive values

#### Scenario: Red line blockers stop preflight
- **WHEN** the input contains a blocking alias, red-line alias, or an operator scope outside local read-only preflight
- **THEN** the preflight status SHALL be `red-line-blocked`
- **AND** the output SHALL provide owner/fallback guidance without triggering sync, writing fixtures, querying real databases, or reading API, Insight, or Gateway data

#### Scenario: Downstream or full-success overclaim is rejected
- **WHEN** the input claims real WeCom sync success, real DB state, non-empty organization tree, Gateway/API/Insight success, authorization facts, fixture readiness, publish success, production readiness, or full-success
- **THEN** the preflight status SHALL be `overclaim-full-success`
- **AND** the output SHALL require removing the overclaim and rerunning with sanitized source-only evidence

### Requirement: WeCom source controlled smoke evidence handoff MUST fail closed
The system SHALL provide an Admin-owned, local, read-only controlled smoke evidence handoff for WeCom source evidence. The handoff SHALL consume only sanitized readiness, release decision, and controlled smoke preflight summaries and SHALL NOT execute real controlled smoke.

#### Scenario: Ready evidence handoff is explicitly bounded
- **WHEN** the handoff receives sanitized source readiness evidence with `wecom_source_ready`, release decision evidence with `wecom_source_ready` or `ready_for_org_tree_readiness`, preflight evidence with `ready-for-wecom-controlled-smoke-preflight`, a redacted signal, no blocking alias, and local read-only evidence handoff scope
- **THEN** the handoff status SHALL be `ready-for-controlled-smoke-evidence-handoff`
- **AND** the output SHALL include operator next actions, empty missing prerequisites, redaction checks, hard red-line flags, and do-not-proceed reasons
- **AND** the output SHALL state that this only proves Admin WeCom source controlled-smoke evidence handoff readiness, not non-empty organization tree readiness, Gateway/API/Insight success, authorization facts, real WeCom sync success, production readiness, or full-success

#### Scenario: Missing readiness summary fails closed
- **WHEN** the handoff does not receive a source readiness summary
- **THEN** the handoff status SHALL be `missing-readiness-summary`
- **AND** the output SHALL direct the operator to run the Admin-owned Source Readiness Handoff before continuing

#### Scenario: Missing release summary fails closed
- **WHEN** the handoff receives source readiness evidence but no release decision summary
- **THEN** the handoff status SHALL be `missing-release-summary`
- **AND** the output SHALL direct the operator to run the Admin-owned Source Release Decision before continuing

#### Scenario: Missing preflight summary fails closed
- **WHEN** the handoff receives source readiness and release decision evidence but no controlled smoke preflight summary
- **THEN** the handoff status SHALL be `missing-preflight-summary`
- **AND** the output SHALL direct the operator to run the Admin-owned Controlled Smoke Preflight before continuing

#### Scenario: Redaction gaps fail closed
- **WHEN** the input contains unmasked secrets, tokens, cookies, private URLs, account identifiers, phone numbers, emails, full organization trees, full organization IDs, source tenant metadata, raw response bodies, or explicit redaction-required aliases
- **THEN** the handoff status SHALL be `redaction-required`
- **AND** the output SHALL NOT echo sensitive values

#### Scenario: Hard red-line signals stop handoff
- **WHEN** the input contains a blocking alias, red-line alias, real environment write signal, or an operator scope outside local read-only evidence handoff
- **THEN** the handoff status SHALL be `hard-red-line-blocked`
- **AND** the output SHALL provide owner/fallback guidance without triggering sync, writing fixtures, querying real databases, or reading API, Insight, or Gateway data

#### Scenario: Downstream or full-success overclaim is rejected
- **WHEN** the input claims real WeCom sync success, real DB state, non-empty organization tree, Gateway/API/Insight success, authorization facts, fixture readiness, publish success, production readiness, or full-success
- **THEN** the handoff status SHALL be `overclaim-full-success`
- **AND** the output SHALL require removing the overclaim and rerunning with sanitized source-only evidence

### Requirement: WeCom source controlled smoke operator triage handoff MUST fail closed
The system SHALL provide an Admin-owned, local, read-only controlled smoke operator triage handoff for WeCom source evidence. The handoff SHALL consume only sanitized result evidence handoff summary, operator remediation handoff summary, operator note, and operator metadata, and SHALL output an operator-executable triage package without triggering real WeCom sync, real fixture or DB writes, provider token access, Gateway/API/Insight reads, authorization fact changes, production-like gates, or destructive data operations.

#### Scenario: Sanitized result and remediation evidence allow operator triage handoff
- **WHEN** result evidence handoff summary has `status=passed`
- **AND** operator remediation handoff summary has `status=ready`
- **AND** input contains only sanitized status, stable alias, counts, owner handoff limits, risk/redaction categories, and non-extrapolation boundaries
- **THEN** the handoff SHALL return `status=ready-for-operator-triage-handoff`
- **AND** it SHALL include `nextSteps`, `ownerHandoffLimits`, `minimumUnblockConditions`, `triagePackageMetadata`, `doNotDispatchUntil`, and `cannotInferBoundaries`
- **AND** `cannotInferBoundaries` SHALL state that this triage package does not prove real WeCom sync success, non-empty organization tree readiness, Gateway/API/Insight success, authorization facts, production readiness, controlled smoke pass, or full-success

#### Scenario: Blocked or partial result evidence remains blocked
- **WHEN** result evidence handoff summary is missing, `partial-handoff`, blocked, failed, unknown, or otherwise not `passed`
- **THEN** the handoff SHALL return `status=blocked`
- **AND** it SHALL preserve stable upstream alias, owner handoff, and minimum unblock condition when available
- **AND** it SHALL request only local sanitized result evidence collection or Admin owner remediation

#### Scenario: Needs user action is preserved for operator
- **WHEN** result evidence handoff or operator remediation handoff indicates missing prerequisites or `needs-user-action`
- **THEN** the handoff SHALL return `status=needs-user-action`
- **AND** it SHALL preserve stable `blockerAlias`, `remediationAlias`, owner handoff, and minimum unblock condition
- **AND** it SHALL NOT downgrade the state to ready or claim controlled smoke success

#### Scenario: Hard red-line inputs stop operator triage
- **WHEN** input summaries, operator note, or metadata contain real WeCom sync, real controlled smoke, real fixture or DB detail, synthetic audit/projection data, Gateway/API/Insight success, authorization facts, production-like endpoint, provider token, real gate, credential-like data, or full-success claims
- **THEN** the handoff SHALL return `status=hard-red-line`
- **AND** `redLineFlags` SHALL include stable aliases such as `real_sync_signal`, `real_controlled_smoke_signal`, `real_fixture_signal`, `real_db_write_signal`, `synthetic_audit_projection_signal`, `downstream_success_overclaim`, `authorization_facts_overclaim`, `production_readiness_overclaim`, or `full_success_overclaim`
- **AND** the handoff SHALL NOT trigger any real network request, sync run, fixture/DB write, gate, Gateway ingestion, API/Insight/Gateway read, provider token access, or authorization fact change

#### Scenario: Sensitive values are never echoed
- **WHEN** input contains token, Cookie, private endpoint, real account, phone, email, complete organization tree, complete organizationId, source tenant metadata, configRef, secretRef, raw response body, full diagnostics response, or other credential-like data
- **THEN** the handoff SHALL return `status=blocked` or `status=hard-red-line`
- **AND** it SHALL expose only stable redaction aliases, owner guidance, and minimum unblock conditions
- **AND** it SHALL NOT echo the sensitive value or complete response

#### Scenario: Unknown triage aliases remain owner scoped
- **WHEN** sanitized input contains an unrecognized result evidence, remediation, blocker, or owner handoff alias
- **THEN** the handoff SHALL keep the result blocked
- **AND** owner SHALL be `admin_operator`
- **AND** minimum unblock conditions SHALL require replacing the unknown alias with a stable Admin WeCom source handoff alias
- **AND** the handoff SHALL NOT infer organization tree readiness, Gateway/API/Insight authorization facts, production readiness, or full-success

### Requirement: WeCom source controlled smoke operator decision handoff MUST fail closed
The system SHALL provide an Admin-owned, local, read-only controlled smoke operator decision handoff for WeCom source evidence. The handoff SHALL consume only sanitized preflight, execution, result evidence, operator remediation, operator triage, operator note, and operator metadata summaries, and SHALL output a bounded operator decision package without triggering real WeCom sync, real controlled smoke, real fixture or DB writes, provider token access, Gateway/API/Insight reads, authorization fact changes, production-like gates, or destructive data operations.

#### Scenario: Sanitized ready evidence allows operator decision handoff
- **WHEN** preflight summary has `status=ready-for-wecom-controlled-smoke-preflight`
- **AND** execution handoff summary has `status=ready-for-controlled-smoke-execution-handoff`
- **AND** result evidence handoff summary has `status=passed`
- **AND** operator remediation handoff summary has `status=ready`
- **AND** operator triage handoff summary has `status=ready-for-operator-triage-handoff`
- **AND** all summaries are sanitized, local-only, and free of red-line flags
- **THEN** the handoff status SHALL be `ready-for-operator-decision-handoff`
- **AND** the output SHALL include `decisionStatus=ready-for-operator-release-decision`, decision options, next options, redaction metadata, owner handoff limits, minimum unblock conditions, and non-extrapolation boundaries
- **AND** the output SHALL state that this only proves an Admin WeCom source local decision package can be handed off, not real WeCom sync success, non-empty organization tree readiness, Gateway/API/Insight success, authorization facts, production readiness, controlled smoke pass, or full-success

#### Scenario: Missing decision prerequisites need user action
- **WHEN** the handoff lacks preflight, execution, result evidence, operator remediation, or operator triage summary
- **THEN** the handoff status SHALL be `needs-user-action`
- **AND** it SHALL name the missing prerequisite and direct the operator to the corresponding local-only helper before continuing
- **AND** it SHALL NOT trigger sync, execute controlled smoke, query real databases, write fixtures, or call Gateway/API/Insight

#### Scenario: Non-ready upstream evidence blocks decision handoff
- **WHEN** any upstream summary is blocked, partial, not ready, unknown, or carries a blocker alias
- **THEN** the handoff status SHALL be `blocked` unless the upstream status is `needs-user-action` or `hard-red-line`
- **AND** it SHALL preserve a stable blocker alias, remediation alias, owner handoff limit, and minimum unblock condition for the upstream local-only helper
- **AND** it SHALL NOT downgrade the state to ready or claim controlled smoke success

#### Scenario: Hard red-line inputs stop operator decision handoff
- **WHEN** input summaries, operator note, or metadata contain real WeCom sync, real controlled smoke, real fixture or DB detail, synthetic audit/projection data, Gateway/API/Insight success, authorization facts, production-like endpoint, provider token, real gate, credential-like data, controlled smoke pass, production readiness, or full-success claims
- **THEN** the handoff status SHALL be `hard-red-line`
- **AND** it SHALL include red-line flags and require removing the signal or obtaining owner authorization before any dispatch, publish, fixture, DB, Gateway ingestion, downstream validation, or release decision step

#### Scenario: Sensitive decision evidence is rejected without echoing values
- **WHEN** input contains unmasked secrets, tokens, cookies, private URLs, real account identifiers, phone numbers, emails, full organization trees, full organization IDs, source tenant metadata, raw response bodies, real DB/fixture/audit/projection data, or credential-like fields
- **THEN** the output status SHALL be `blocked`
- **AND** the output SHALL include redaction metadata and `blockerAlias=sanitization_failed`
- **AND** the output SHALL NOT echo the sensitive values or sensitive field names

#### Scenario: Unknown sanitized aliases remain blocked
- **WHEN** sanitized input contains an unrecognized preflight, execution, result, remediation, triage, blocker, or owner handoff alias
- **THEN** the handoff status SHALL be `blocked`
- **AND** the output SHALL require replacing the unknown alias with a stable Admin WeCom source handoff alias before operator decision handoff can be marked ready

### Requirement: WeCom source controlled smoke operator action handoff MUST fail closed
The system SHALL provide an Admin-owned, local, read-only controlled smoke operator action handoff for WeCom source evidence. The handoff SHALL consume only a sanitized operator decision handoff summary, sanitized operator metadata, and sanitized operator notes, and SHALL output a bounded operator action package without triggering real WeCom sync, real controlled smoke, real fixture or DB writes, provider token access, Gateway/API/Insight reads, authorization fact changes, production-like gates, organization tree rebuilds, or destructive data operations.

#### Scenario: Sanitized ready decision allows operator action handoff
- **WHEN** operator decision handoff summary has `status=ready-for-operator-decision-handoff`
- **AND** `release=release_after_report`
- **AND** all inputs are sanitized, local-only, and free of red-line flags
- **THEN** the handoff action status SHALL be `ready-for-operator-action`
- **AND** the output SHALL include `nextAction`, stable blocker/remediation aliases, owner handoff limits, minimum unblock conditions, action package metadata, and non-extrapolation boundaries
- **AND** the output SHALL state that this only proves an Admin WeCom source local action package can be handed off, not real WeCom sync success, non-empty organization tree readiness, Gateway/API/Insight success, authorization facts, production readiness, controlled smoke pass, or full-success

#### Scenario: Missing or non-ready decision remains blocked
- **WHEN** the handoff lacks operator decision handoff summary or the summary is blocked, partial, not ready, unknown, or has `release=hold`
- **THEN** the handoff action status SHALL be `blocked` unless the upstream status is `needs-user-action` or `hard-red-line`
- **AND** it SHALL preserve a stable blocker alias, remediation alias, owner handoff limit, and minimum unblock condition for the upstream local-only helper
- **AND** it SHALL NOT downgrade the state to ready or claim controlled smoke success

#### Scenario: Needs user action is preserved
- **WHEN** the operator decision handoff summary indicates `needs-user-action`
- **THEN** the handoff action status SHALL be `needs-user-action`
- **AND** it SHALL preserve the upstream blocker/remediation alias and direct the operator to collect only sanitized local action evidence

#### Scenario: Hard red-line inputs stop operator action handoff
- **WHEN** input summaries, operator note, or metadata contain real WeCom sync, real controlled smoke, real fixture or DB detail, synthetic audit/projection data, Gateway/API/Insight success, authorization facts, production-like endpoint, provider token, real gate, organization tree rebuild, credential-like data, controlled smoke pass, production readiness, or full-success claims
- **THEN** the handoff action status SHALL be `hard-red-line`
- **AND** it SHALL include red-line flags and require removing the signal or obtaining owner authorization before any dispatch, publish, fixture, DB, Gateway ingestion, downstream validation, organization tree rebuild, or release action step

#### Scenario: Sensitive action evidence is rejected without echoing values
- **WHEN** input contains unmasked secrets, tokens, cookies, private URLs, real account identifiers, phone numbers, emails, full organization trees, full organization IDs, source tenant metadata, raw response bodies, real DB/fixture/audit/projection data, or credential-like fields
- **THEN** the output action status SHALL be `blocked`
- **AND** the output SHALL include `blockerAlias=sanitization_failed`
- **AND** the output SHALL NOT echo the sensitive values or sensitive field names

#### Scenario: Unknown sanitized aliases remain blocked
- **WHEN** sanitized input contains an unrecognized decision, blocker, remediation, result, or owner handoff alias
- **THEN** the handoff action status SHALL be `blocked`
- **AND** the output SHALL require replacing the unknown alias with a stable Admin WeCom source handoff alias before operator action handoff can be marked ready

### Requirement: WeCom source controlled smoke result evidence handoff MUST fail closed
The system SHALL provide an Admin-owned, local, read-only controlled smoke result evidence handoff for WeCom source result evidence. The handoff SHALL consume only sanitized execution handoff summary, result aliases/counts, deployment summary, authorization summary, redaction signal, and risk category, and SHALL NOT execute real controlled smoke or write real evidence.

#### Scenario: Passed result evidence handoff is explicitly bounded
- **WHEN** the handoff receives a sanitized execution handoff with `ready-for-controlled-smoke-execution-handoff`, a result status of `passed` or `passed-with-observations`, stable passed result aliases, matching passed counts, deployed and authorized summary aliases, a redacted signal, local read-only result evidence scope, and handoff-only result mode
- **THEN** the handoff status SHALL be `passed`
- **AND** the output SHALL include `release=release_after_report`, result aliases/counts, empty missing prerequisites, owner handoff limits, operator actions, and non-extrapolation boundaries
- **AND** the output SHALL state that this only proves Admin WeCom source controlled-smoke result evidence handoff readiness, not real WeCom sync success, non-empty organization tree readiness, Gateway/API/Insight success, authorization facts, production readiness, or full-success

#### Scenario: Partial result evidence remains limited
- **WHEN** the handoff receives sanitized result evidence with `partial-handoff` or partial counts but no failed, blocked, missing, or unauthorized counts
- **THEN** the handoff status SHALL be `partial-handoff`
- **AND** the output SHALL preserve the partial alias and direct the operator to either collect missing local evidence or hand off with explicit owner limits

#### Scenario: Missing result prerequisites need user action
- **WHEN** the handoff lacks execution handoff summary, result status, result aliases, result counts, deployment summary, authorization summary, redaction signal, or risk category
- **THEN** the handoff status SHALL be `needs-user-action`
- **AND** the output SHALL name the missing prerequisite and direct the operator to the matching local-only WeCom source helper or Admin owner evidence preparation step before continuing

#### Scenario: Undeployed or unauthorized result evidence blocks handoff
- **WHEN** deployment summary is not deployed, authorization summary is not authorized, result aliases are unknown, or result counts include failed, blocked, missing, unauthorized, or inconsistent passed totals
- **THEN** the handoff status SHALL be `blocked`
- **AND** the output SHALL include stable blocker alias, owner handoff limits, and minimum unblock conditions without triggering sync, writing fixtures, querying real databases, or reading API, Insight, or Gateway data

#### Scenario: Sensitive result evidence is rejected without echoing values
- **WHEN** the input contains unmasked secrets, tokens, cookies, private URLs, real account identifiers, phone numbers, emails, full organization trees, full organization IDs, source tenant metadata, raw response bodies, real DB/fixture/audit/projection data, or credential-like fields
- **THEN** the output status SHALL be `blocked`
- **AND** the output SHALL NOT echo the sensitive values

#### Scenario: Hard red-line result claims stop handoff
- **WHEN** the input claims real WeCom sync success, real DB state, real fixture or synthetic audit/projection data, non-empty organization tree, Gateway/API/Insight success, authorization facts, publish success, production readiness, full-success, or contains a real execution/write signal
- **THEN** the handoff status SHALL be `blocked`
- **AND** it SHALL include red-line flags and require removing the signal or obtaining owner authorization before any controlled smoke, publish, fixture, DB, Gateway ingestion, or downstream validation step

### Requirement: WeCom source operator remediation handoff MUST fail closed
The system SHALL provide an Admin-owned, local, read-only operator remediation handoff for WeCom source readiness and controlled smoke preparation evidence. The handoff SHALL consume only sanitized readiness, release decision, controlled smoke preflight, and evidence handoff summaries, and SHALL output stable remediation aliases, owner-scoped next actions, missing prerequisites, red-line flags, minimum unblock conditions, and non-extrapolation boundaries.

#### Scenario: Blocked source evidence maps to owner remediation
- **WHEN** the handoff receives sanitized source summaries containing stable blockers such as `wecom_config_missing`, `wecom_credential_not_verified`, `wecom_latest_run_failed`, `wecom_no_recent_success`, or `wecom_run_active`
- **THEN** the output status SHALL be `blocked`
- **AND** it SHALL preserve the blocker as a stable remediation alias with owner, next action, missing prerequisite, and minimum unblock condition
- **AND** it SHALL NOT trigger real WeCom sync, write fixtures, query real databases, or read API, Insight, or Gateway data

#### Scenario: Missing prerequisite summaries need user action
- **WHEN** the handoff lacks source readiness, release decision, controlled smoke preflight, or evidence handoff summary
- **THEN** the output status SHALL be `needs-user-action`
- **AND** it SHALL name the missing prerequisite and direct the operator to the matching local-only WeCom source helper before continuing

#### Scenario: Hard red-line evidence stops remediation handoff
- **WHEN** the input contains a real environment write signal, non-local operator scope, downstream success assertion, full-success assertion, real fixture or DB detail, publish, gateway ingestion, authorization facts, or a hard red-line alias
- **THEN** the output status SHALL be `hard-red-line`
- **AND** it SHALL include red-line flags and require removing the signal or obtaining owner authorization before any controlled smoke or manual execution

#### Scenario: Sensitive evidence is rejected without echoing values
- **WHEN** the input contains unmasked secrets, tokens, cookies, private URLs, real account identifiers, phone numbers, emails, full organization trees, full organization IDs, source tenant metadata, or raw response bodies
- **THEN** the output status SHALL be `hard-red-line`
- **AND** the output SHALL NOT echo the sensitive values

#### Scenario: Ready remediation handoff remains bounded
- **WHEN** all sanitized summaries are ready, no blocking alias is present, redaction is confirmed, and operator scope is local read-only
- **THEN** the output status SHALL be `ready`
- **AND** it SHALL state that readiness only means the operator remediation handoff is clear, not that controlled smoke passed, organization tree is non-empty, Gateway/API/Insight succeeded, authorization facts are active, production is ready, or full-success exists

### Requirement: WeCom source controlled smoke execution handoff MUST fail closed
The system SHALL provide an Admin-owned, local, read-only controlled smoke execution handoff for WeCom source evidence before any real controlled smoke execution. The handoff SHALL consume only sanitized controlled smoke preflight, controlled smoke evidence handoff, and operator remediation handoff summaries, and SHALL NOT execute real controlled smoke.

#### Scenario: Ready execution handoff is explicitly bounded
- **WHEN** the handoff receives sanitized preflight evidence with `ready-for-wecom-controlled-smoke-preflight`, evidence handoff evidence with `ready-for-controlled-smoke-evidence-handoff`, operator remediation evidence with `ready`, a redacted signal, no blocking alias, local read-only execution handoff scope, and handoff-only execution mode
- **THEN** the handoff status SHALL be `ready-for-controlled-smoke-execution-handoff`
- **AND** the output SHALL include `decision=handoff-ready`, reference summaries, empty blocker reasons, empty minimum unblock conditions, operator next actions, and non-extrapolation boundaries
- **AND** the output SHALL state that this only proves Admin WeCom source controlled-smoke execution handoff readiness, not real WeCom sync success, non-empty organization tree readiness, Gateway/API/Insight success, authorization facts, production readiness, or full-success

#### Scenario: Missing execution prerequisites fail closed
- **WHEN** the handoff lacks controlled smoke preflight, controlled smoke evidence handoff, or operator remediation handoff summary
- **THEN** the output status SHALL name the missing prerequisite summary
- **AND** the output SHALL direct the operator to run the matching local-only WeCom source helper before continuing

#### Scenario: Unresolved prerequisite blockers stop execution handoff
- **WHEN** the preflight, evidence handoff, or remediation handoff summary contains missing prerequisites, remediations, red-line flags, or a non-ready status
- **THEN** the output status SHALL be `blocked-prerequisite`
- **AND** it SHALL preserve the blocker as stable alias evidence with owner, next action, and minimum unblock condition

#### Scenario: Redaction gaps fail closed
- **WHEN** the input contains unmasked secrets, tokens, cookies, private URLs, account identifiers, phone numbers, emails, full organization trees, full organization IDs, source tenant metadata, raw response bodies, or explicit redaction-required aliases
- **THEN** the handoff status SHALL be `redaction-required`
- **AND** the output SHALL NOT echo the sensitive values

#### Scenario: Hard red-line signals stop execution handoff
- **WHEN** the input contains a real execution signal, blocking alias, red-line alias, or an operator scope outside local read-only execution handoff
- **THEN** the handoff status SHALL be `hard-red-line-blocked`
- **AND** the output SHALL provide owner/fallback guidance without triggering sync, executing controlled smoke, writing fixtures, querying real databases, or reading API, Insight, or Gateway data

#### Scenario: Downstream or full-success overclaim is rejected
- **WHEN** the input claims real WeCom sync success, real DB state, non-empty organization tree, Gateway/API/Insight success, authorization facts, fixture readiness, publish success, production readiness, or full-success
- **THEN** the handoff status SHALL be `overclaim-full-success`
- **AND** the output SHALL require removing the overclaim and rerunning with sanitized source-only evidence

### Requirement: 企业微信组织同步 dry-run 预览
系统 SHALL 允许授权管理员运行企业微信组织同步 dry-run preview，在不提交组织数据写入的前提下计算全量同步的预期本地影响。

#### Scenario: 企业微信预览全量同步影响且不写正式数据
- **WHEN** 授权管理员为目标组织启动企业微信 dry-run preview
- **THEN** 系统 SHALL 使用已配置的企业微信通讯录来源拉取或评估 normalized snapshot
- **AND** 返回部门、用户和关系的聚合 diff summary
- **AND** MUST NOT 写入 `Group`, `User`, WeCom mapping tables, `SourceConnection`, `PlatformDepartment`, `PlatformUser`, `PlatformMembership`, `ExternalIdentity`, `OrgSyncBatch`, Gateway authorization facts 或 final sync run state

#### Scenario: 企业微信预览复用正式同步差异口径
- **WHEN** dry-run preview 比较本次企业微信 snapshot 与 Admin-owned local state
- **THEN** 部门和用户影响 SHALL 至少报告 `toCreate`, `toUpdate`, `toSoftDisable`, `unchanged`, `conflict` 和 `invalid`
- **AND** 关系影响 SHALL 以聚合计数展示用户-部门、部门负责人和直属上级关系的预期变化
- **AND** 统计口径 SHALL 与正式企业微信同步记录中部门、用户和关系变化保持一致

#### Scenario: 企业微信预览失败时 fail closed
- **WHEN** 配置缺失、配置未启用、凭据无效、企业微信通讯录权限不足、provider 响应异常或 snapshot contract 不满足同步必需字段
- **THEN** 系统 SHALL 返回 `failed` dry-run preview，并包含 safe reason alias、safe summary、可用时的 snapshot stats 和 redaction metadata
- **AND** MUST NOT 创建或更新本地组织主数据
- **AND** MUST NOT 暴露 app secret、access token、raw WeCom response body、手机号、邮箱、完整部门树、完整用户列表或私有 endpoint 细节

### Requirement: 企业微信组织同步 dry-run 历史
系统 SHALL 仅使用脱敏聚合 metadata 记录并暴露最近企业微信 dry-run preview 的轻量只读历史。

#### Scenario: 记录企业微信预览脱敏摘要
- **WHEN** 企业微信 dry-run preview 成功或 fail-closed
- **THEN** 系统 SHALL 尝试记录一条 history item，包含 status、safe source aliases、snapshot counts、department/user/relationship diff counts、reason counts、safe diagnostics summary、createdAt、operator hash、request marker hash、retention metadata 和 redaction metadata
- **AND** history 存储失败 SHALL NOT 把 fail-closed preview 转换成成功写入，也 SHALL NOT 阻断 preview response

#### Scenario: 查询企业微信预览历史列表和详情
- **WHEN** 授权管理员查询目标组织的企业微信 dry-run history list/detail
- **THEN** 系统 SHALL 执行与企业微信 sync config 和 runs 相同的组织解析与管理员鉴权
- **AND** list queries MAY 支持 time range、status、diagnostic alias、source alias、limit、topN 和 pagination filters
- **AND** detail responses SHALL 保持只读和脱敏

#### Scenario: 企业微信预览历史不返回敏感明细
- **WHEN** dry-run history 引用 provider data、本地 mappings、request markers 或 operator identity
- **THEN** response data SHALL 仅包含 stable hashes、safe aliases、aggregate counts、safe summaries、retention metadata 和 redaction metadata
- **AND** MUST NOT 返回 raw WeCom payloads、完整组织树、完整用户列表、手机号、邮箱、真实姓名、access tokens、secrets、cookies、private URLs 或超出 safe aliases 的 raw external user identifiers

### Requirement: 企业微信 dry-run preview Admin APIs
系统 SHALL 在现有 `/api/wecom-org-sync/...` 模块命名空间下暴露企业微信 dry-run preview 和轻量 preview history 的管理员 API。

#### Scenario: 企业微信预览 API 使用模块命名空间
- **WHEN** 系统暴露企业微信 dry-run preview 管理 API
- **THEN** APIs SHALL 使用 `/api/wecom-org-sync/dry-run-preview` 和 `/api/wecom-org-sync/dry-run-history`
- **AND** SHALL 使用与现有 `/api/wecom-org-sync/config` 和 `/api/wecom-org-sync/runs` 相同的目标组织解析、鉴权行为和安全错误处理

#### Scenario: 企业微信预览 API 保持只读边界
- **WHEN** 管理员调用 dry-run preview 或 dry-run history APIs
- **THEN** APIs SHALL NOT 启动正式 sync run、修改 sync configuration、更新本地 users 或 groups、写入 platform master data、发布 Gateway projection facts，或读取 API/Gateway/Insight internal stores

### Requirement: 企业微信 dry-run preview Admin UI
Web Admin 企业微信组织同步页面 SHALL 提供紧凑的 dry-run preview 和 preview history 操作，并保持简单基础流程不被打断。

#### Scenario: 企业微信页面展示预览影响入口
- **WHEN** 管理员打开已加载配置的企业微信组织同步页面
- **THEN** 页面 SHALL 在主要同步操作附近展示 `预览影响` action
- **AND** 当目标组织或启用的同步配置缺失时，action SHALL 禁用或展示可操作错误
- **AND** 启动 preview SHALL 展示 loading 和防重复点击保护

#### Scenario: 企业微信预览结果使用弹窗展示
- **WHEN** dry-run preview 返回 succeeded、failed、empty、warning 或 history-warning states
- **THEN** 页面 SHALL 在 Modal 中展示结果，并以紧凑方式呈现部门、用户和关系影响计数
- **AND** Modal SHALL 展示 safe status、safe reason summary、可用时的 redaction/retention markers 和清晰的关闭操作
- **AND** 主页面 SHALL NOT 默认渲染大型 dry-run diagnostics panel

#### Scenario: 企业微信预览历史是低频弹窗入口
- **WHEN** 管理员需要查看最近的企业微信 dry-run previews
- **THEN** 页面 SHALL 在 preview action 附近暴露 `预览历史`
- **AND** history SHALL 在 Modal 或等价二级界面中打开，而不是作为完整表格嵌入主页面
- **AND** loading、empty、error、long text 和 detail states SHALL 被覆盖，并在正常桌面宽度下避免横向溢出

### Requirement: WeCom organization sync page uses unified Admin sync shell
The WeCom organization sync Admin page SHALL use the shared organization sync page presentation shell for base synchronization workflows while preserving the existing published WeCom sync behavior.

#### Scenario: Display provider-branded page header
- **WHEN** an administrator opens the WeCom organization sync page
- **THEN** the page SHALL display a compact Admin header with a WeCom provider logo, page title, and operator-facing status text
- **AND** the logo SHALL be loaded from existing provider logo infrastructure or project-local assets rather than newly embedded external brand files

#### Scenario: Preserve WeCom configuration workflow
- **WHEN** an administrator configures WeCom organization sync after the UI migration
- **THEN** the page SHALL still provide target organization, Corp ID, masked address book secret, enablement, soft-disable, schedule settings, connection test, manual sync, and sync run inspection
- **AND** it SHALL keep existing API contracts, route path, authorization behavior, and secret masking behavior unchanged

#### Scenario: Align base layout with Feishu sync page
- **WHEN** the WeCom and Feishu organization sync pages are compared
- **THEN** the WeCom page SHALL share the same base layout pattern for target organization, credentials, sync options, schedule options, primary action ordering, running sync disabled state, and formal sync records
- **AND** it SHALL NOT add Feishu-only binding diagnostic, handoff evidence, or acceptance checklist features unless a separate capability change introduces them

#### Scenario: Keep WeCom page simple by default
- **WHEN** the WeCom page has no error, warning, or running sync requiring operator attention
- **THEN** the page SHALL avoid large diagnostic panels and show compact status or empty states
- **AND** warnings or errors SHALL remain expandable or scannable without hiding actionable failure messages

### Requirement: 企业微信同步页面保持简单基础流程
Web Admin 企业微信组织同步页面 SHALL 保持组织同步的简单参考流程，同时与其他 provider 同步页面共享展示约定。

#### Scenario: Preserve simple base workflow
- **WHEN** 管理员打开企业微信组织同步页面
- **THEN** 页面 SHALL 突出目标组织、Corp ID、address book secret、sync options、schedule options、permission guidance、save、connection test、dry-run preview、manual sync 和 formal sync records
- **AND** 页面 SHALL 将企业微信 dry-run preview 和 dry-run history 保持为紧凑二级操作，而不是默认大型面板
- **AND** 页面 SHALL NOT 添加飞书专属 binding diagnostics、handoff evidence 或 acceptance checklist UI

#### Scenario: Align formal run table concepts
- **WHEN** 存在企业微信 sync runs
- **THEN** 表格 SHALL 将 run id、status、trigger type、stage、actor、started time、finished time、department impact、user impact 和 safe error summary 作为独立且便于扫描的概念展示
- **AND** 表格 SHALL 使用与飞书/Lark formal sync records 相同的基础顺序和密度，但保留企业微信没有的 provider-specific columns 差异

### Requirement: WeCom 同步配置使用统一 provider 字段节奏
Web Admin 企业微信组织同步页面 SHALL 使用与飞书/Lark 组织同步页面一致的基础配置字段节奏，同时保留既有企业微信后端字段契约。

#### Scenario: 企业微信配置行与统一 provider 布局对齐
- **WHEN** 管理员打开企业微信组织同步页面
- **THEN** 页面 SHALL 在第一行配置中展示同步目标组织
- **AND** 页面 SHALL 在凭据行展示 `App ID（Corp ID）` 和 `App Secret`
- **AND** 页面 SHALL 在下一行展示同步选项和定时同步选项
- **AND** 页面 SHALL 继续通过既有 `corpId` 和 `addressBookSecret` 字段保存配置值

### Requirement: WeCom 正式同步记录统计列使用短表头
Web Admin 企业微信正式同步记录表 SHALL 使用紧凑统计列表头，以便和其他组织同步 provider 做扫读对比。

#### Scenario: 展示紧凑的企业微信运行统计表头
- **WHEN** 企业微信组织同步页面渲染正式同步记录
- **THEN** 部门统计列表头 SHALL 为 `部门`
- **AND** 用户统计列表头 SHALL 为 `用户`
- **AND** 每个统计单元格 SHALL 继续使用既有 `新 / 更 / 禁` 格式展示新增、更新和禁用数量

### Requirement: WeCom 正式同步记录使用紧凑序号列
Web Admin 企业微信正式同步记录表 SHALL 默认使用分页连续序号作为首列，同时保留完整运行 ID 的排障入口。

#### Scenario: 展示企业微信同步记录序号并保留运行 ID
- **WHEN** 企业微信组织同步页面渲染正式同步记录
- **THEN** 表格首列 SHALL 展示 `序号`
- **AND** 序号 SHALL 按当前分页和 pageSize 计算连续位置
- **AND** 完整运行 ID SHALL 继续作为稳定 row key 使用
- **AND** 管理员 SHALL 能通过序号单元格查看或复制完整运行 ID

### Requirement: WeCom 正式同步记录保持紧凑扫读
Web Admin 企业微信正式同步记录表 SHALL 避免长执行人和数字统计破坏行高与扫读节奏。

#### Scenario: 企业微信同步记录长文本和数字稳定展示
- **WHEN** 企业微信组织同步页面渲染正式同步记录
- **THEN** 执行人列 SHALL 默认省略长文本并允许查看完整值
- **AND** 部门和用户统计单元格 SHALL 使用稳定数字宽度样式

### Requirement: WeCom 同步记录运行 ID 复制入口保持二级
Web Admin 企业微信正式同步记录表 SHALL 默认保持 `序号` 列简洁，同时保留完整运行 ID 的查看和复制能力。

#### Scenario: 序号列不常驻复制图标
- **WHEN** 企业微信组织同步页面渲染正式同步记录
- **THEN** `序号` 列 SHALL 默认只展示分页连续数字
- **AND** 表格 SHALL NOT 在每个序号旁常驻展示复制图标
- **AND** 管理员 SHALL 能通过 hover 序号查看完整运行 ID
- **AND** 管理员 SHALL 能通过点击序号复制完整运行 ID

### Requirement: WeCom 定时同步关闭时收起高级字段
Web Admin 企业微信组织同步页面 SHALL 在定时同步未启用时收起 Cron、时区和最近调度字段，以保持基础配置区紧凑。

#### Scenario: 定时同步未启用时显示紧凑状态
- **WHEN** 企业微信组织同步页面渲染且定时同步未启用
- **THEN** 页面 SHALL 展示启用定时同步开关
- **AND** 页面 SHALL 展示紧凑的未启用状态提示
- **AND** 页面 SHALL NOT 展示 Cron 表达式输入、时区输入或最近调度文本

#### Scenario: 定时同步启用后展开配置字段
- **WHEN** 管理员启用企业微信定时同步
- **THEN** 页面 SHALL 展示 `Cron 表达式` 输入
- **AND** 页面 SHALL 展示 `时区` 输入
- **AND** 页面 SHALL 展示最近调度信息

### Requirement: WeCom sync credentials MAY use organization sync API Keys
The system SHALL support organization sync API Keys as the stable credential for downstream gateway organization mirror synchronization, instead of requiring ordinary user OAuth access tokens.

#### Scenario: Gateway sync uses dedicated organization credential
- **WHEN** a gateway organization mirror synchronization needs to pull a WeCom-backed business organization's structure from the authentication center
- **THEN** administrators can provide an organization sync API Key bound to that business organization
- **AND** the synchronization does not depend on a browser session or a user OAuth access token lifetime

#### Scenario: Existing access token behavior remains available
- **WHEN** a caller continues using an ordinary valid OAuth access token on existing organization APIs
- **THEN** the existing authentication and authorization behavior remains unchanged

### Requirement: WeCom 同步页面 SHALL 自动恢复有效目标组织
Web Admin 企业微信组织同步页面 SHALL 在进入页面时自动恢复可加载配置和同步记录的目标组织，而不是要求管理员每次重新选择组织。

#### Scenario: 自动进入已配置企业微信同步组织
- **WHEN** 全局管理员打开企业微信组织同步页面且没有明确选择业务组织
- **THEN** 页面 SHALL 使用后端返回的企业微信同步建议组织或本地最近选择组织作为当前同步目标组织
- **AND** 页面 SHALL 立即加载该组织的企业微信同步配置和同步记录

#### Scenario: 保留手动切换组织能力
- **WHEN** 管理员在企业微信组织同步页面手动选择另一个非 built-in 组织
- **THEN** 页面 SHALL 切换当前同步目标组织并加载对应配置和同步记录
- **AND** 页面 MAY 记住该 Provider 的最近选择组织用于下次进入页面

### Requirement: WeCom 同步 SHALL 与其他通讯录来源保持单一已配置主数据源
The system SHALL prevent the same Admin business organization from configuring WeCom organization sync while another address-book sync source is already configured for that organization.

#### Scenario: 拒绝在飞书已配置组织中启用企业微信同步
- **WHEN** an authorized administrator saves a WeCom sync configuration
- **AND** the same target organization already has a configured Feishu/Lark sync configuration
- **THEN** the system SHALL reject the save with a validation error that identifies the conflicting Provider and target organization

#### Scenario: 拒绝在飞书已配置组织中保存企业微信草稿
- **WHEN** an authorized administrator saves a WeCom sync configuration
- **AND** the same target organization already has a configured Feishu/Lark sync configuration
- **THEN** the system SHALL reject the save with a validation error that identifies the conflicting Provider and target organization

#### Scenario: 阻止冲突企业微信同步执行
- **WHEN** a WeCom manual sync run is requested for a target organization that already has a Feishu/Lark sync configuration
- **THEN** the system SHALL reject the run before creating a WeCom sync run record

#### Scenario: 展示企业微信冲突提示
- **WHEN** the WeCom sync page loads a target organization that already has a Feishu/Lark sync configuration
- **THEN** the page SHALL show a warning that Feishu/Lark is the selected organization sync source for that organization
- **AND** the page SHALL prevent saving WeCom config, enabling WeCom sync, or starting a full WeCom sync while the organization is occupied by another source

#### Scenario: 过滤已被其他来源占用的企业微信候选组织
- **WHEN** the WeCom sync page receives organizations occupied by another address-book sync source
- **THEN** the organization selector SHALL exclude those occupied organizations from candidate options
- **AND** the currently selected organization MAY remain visible if it is already selected so the page can explain the read-only conflict
