# feishu-organization-sync Specification

## Purpose
TBD - created by archiving change add-feishu-organization-sync. Update Purpose after archive.
## Requirements
### Requirement: Feishu organization sync configuration
The system SHALL allow an authorized administrator to configure one active Feishu/Lark organization sync source for a target organization, including `appId`, app secret, endpoint mode, sync enablement, soft-disable behavior, and schedule settings.

#### Scenario: Save valid sync configuration
- **WHEN** an authorized administrator saves a configuration with required Feishu/Lark credentials and target organization
- **THEN** the system persists the configuration
- **AND** masks sensitive secret values in subsequent responses
- **AND** creates or reuses a stable SourceConnection whose `sourceType` is `lark` or `feishu`, never `wecom`

#### Scenario: Reject incomplete sync configuration
- **WHEN** an authorized administrator saves a configuration without target organization, endpoint mode, App ID, or App Secret
- **THEN** the system rejects the request with a validation error that identifies the missing fields

#### Scenario: Preserve masked secret on update
- **WHEN** an administrator updates non-secret fields while submitting the masked secret placeholder
- **THEN** the system keeps the previously saved secret and does not persist the placeholder as the real secret

### Requirement: Feishu/Lark endpoint mode
The system SHALL use the Feishu/Lark endpoint mode consistently with the existing `Lark` OAuth Provider behavior.

#### Scenario: Domestic Feishu endpoint selected
- **WHEN** a sync configuration uses domestic Feishu endpoint mode
- **THEN** token and Contact API calls target `https://open.feishu.cn`
- **AND** operator-facing guidance identifies sign-in authorization as `https://accounts.feishu.cn`

#### Scenario: Overseas Lark endpoint selected
- **WHEN** a sync configuration uses overseas Lark endpoint mode
- **THEN** token and Contact API calls target `https://open.larksuite.com`
- **AND** operator-facing guidance identifies sign-in authorization as `https://accounts.larksuite.com`

### Requirement: Feishu organization sync connection test
The system SHALL allow an authorized administrator to test Feishu/Lark address book credentials before starting a full sync.

#### Scenario: Successful connection test
- **WHEN** an authorized administrator tests a configuration with valid App ID, App Secret, endpoint mode, and sufficient Contact permission
- **THEN** the system verifies tenant access token retrieval, department reading, and user reading without changing local users or groups

#### Scenario: Failed connection test
- **WHEN** credentials are invalid, endpoint mode does not match the app, or Contact permissions are insufficient
- **THEN** the system returns a safe validation error category without exposing secrets, tokens, raw response bodies, or full user data

### Requirement: Feishu public Contact API source
The system SHALL build organization sync data from Feishu/Lark public Contact v3 APIs and SHALL NOT depend on undocumented internal tables or fields.

#### Scenario: Normalize department and user snapshots
- **WHEN** the sync client pulls Feishu/Lark organization data
- **THEN** it normalizes department identifiers, parent department identifiers, user identifiers, user department memberships, user lifecycle status, `open_id`, `union_id`, and `tenant_key` into an internal snapshot format

#### Scenario: Avoid binding service to one endpoint implementation
- **WHEN** Feishu/Lark changes recommended Contact API combinations
- **THEN** the client may change concrete API calls while preserving the same normalized snapshot contract for the sync service

### Requirement: Manual full differential Feishu organization sync
The system SHALL allow an authorized administrator to manually start a full differential Feishu/Lark organization sync for a target organization.

#### Scenario: Start full sync
- **WHEN** an authorized administrator starts a full sync for an enabled Feishu organization sync configuration
- **THEN** the system creates a sync run record and begins pulling departments, users, and user-department memberships for the target organization

#### Scenario: Prevent duplicate running sync
- **WHEN** a sync run is already running for the same target organization and another full sync is requested
- **THEN** the system rejects the second request with a clear in-progress error

#### Scenario: Recover stale running sync
- **WHEN** a previous running sync has not updated its heartbeat before its lease expires
- **THEN** the system can mark the stale run as failed before starting a new run
- **AND** the stale run SHALL NOT be used for missing-data soft-disable decisions

#### Scenario: Avoid clear-and-rebuild behavior
- **WHEN** a full sync starts
- **THEN** the system does not clear existing local users, groups, memberships, mappings, or platform master data before applying differential changes

### Requirement: Feishu organization sync admin APIs
The system SHALL expose administrator APIs for sync configuration, connection test, manual execution, and sync run inspection.

#### Scenario: Use module-based API namespace
- **WHEN** the system exposes Feishu organization sync management APIs
- **THEN** the APIs use the `/api/feishu-org-sync/...` module namespace rather than legacy `/api/get-*`, `/api/update-*`, or `/api/run-*` paths

#### Scenario: Manage sync configuration through API
- **WHEN** an authorized administrator gets or updates Feishu organization sync configuration
- **THEN** the system returns or persists the configuration for the target organization while masking sensitive secret values

#### Scenario: Test sync configuration through API
- **WHEN** an authorized administrator calls `/api/feishu-org-sync/config/test`
- **THEN** the system validates token, department, and user read permission without changing local users or groups

#### Scenario: Trigger sync through API
- **WHEN** an authorized administrator requests a manual full differential sync through `/api/feishu-org-sync/runs`
- **THEN** the system returns the created sync run identity or a duplicate-running error

#### Scenario: Inspect sync runs through API
- **WHEN** an authorized administrator queries `/api/feishu-org-sync/runs` or `/api/feishu-org-sync/runs/:runId`
- **THEN** the system returns run status, timestamp fields, actor, counts, trigger type, and safe error summaries without exposing secrets

### Requirement: Feishu department synchronization
The system SHALL synchronize Feishu/Lark departments into the local Group model while preserving stable external department identity and hierarchy.

#### Scenario: Create or update department group
- **WHEN** a Feishu/Lark department appears in the full sync result
- **THEN** the system creates or updates a Group with stable local name, external department ID mapping, display name, parent group, department type, and enabled state

#### Scenario: Preserve department identity across rename
- **WHEN** a Feishu/Lark department keeps the same department ID but changes its display name
- **THEN** the next successful full differential sync updates the Group display name without changing the stable local group identity

#### Scenario: Preserve department hierarchy changes
- **WHEN** a Feishu/Lark department changes parent department
- **THEN** the next successful full differential sync updates the local parent group relationship

### Requirement: Feishu user synchronization and login binding
The system SHALL synchronize Feishu/Lark users into the local User model using Feishu `user_id` as the primary local Lark binding.

#### Scenario: Create new Feishu user
- **WHEN** a Feishu/Lark user appears in the full sync result and no local user is bound to its identifiers
- **THEN** the system creates a User with stable local username, `User.Lark` set to `user_id`, length-safe `ExternalId`, display fields, contact fields when present, and Feishu/Lark identifier properties

#### Scenario: Update existing Lark-bound user
- **WHEN** a Feishu/Lark user appears in the full sync result and a local user already has the same `User.Lark=user_id`
- **THEN** the system updates Feishu-sourced profile fields and properties without changing the local username

#### Scenario: Backfill historical open_id or union_id binding
- **WHEN** a Feishu/Lark user contains `user_id` and an existing local user is matched through historical `open_id` or `union_id`
- **THEN** the system reuses that local user and backfills `User.Lark` to `user_id`

#### Scenario: Preserve raw OAuth identifiers
- **WHEN** a Feishu/Lark user snapshot contains `open_id`, `union_id`, or `tenant_key`
- **THEN** the system stores those identifiers as user properties compatible with the existing Lark OAuth login binding

#### Scenario: Avoid weak identity matching
- **WHEN** a Feishu/Lark user has the same name, phone, or email as an existing local user but no matching stable Feishu/Lark identifier
- **THEN** the system does not automatically merge the accounts

### Requirement: Feishu membership synchronization
The system SHALL synchronize Feishu/Lark user department relationships into a queryable mapping table and the existing local user group membership model.

#### Scenario: Assign user to department groups
- **WHEN** a Feishu/Lark user belongs to one or more synced departments
- **THEN** the system records enabled Feishu user-department relationships and assigns the corresponding Feishu-sourced local department groups to the user's group membership
- **AND** preserves non-Feishu user groups

#### Scenario: Remove stale department membership
- **WHEN** a previously synced user is no longer listed in a previously synced Feishu/Lark department
- **THEN** the system disables the stale Feishu user-department relationship and removes only that Feishu-sourced department group membership

### Requirement: Feishu platform master data projection
The system SHALL project Feishu/Lark synchronized organization data into the source-neutral platform organization master model.

#### Scenario: Persist SourceConnection
- **WHEN** a Feishu/Lark sync configuration is saved or used for sync
- **THEN** the system creates or updates SourceConnection with target organization, source tenant metadata, endpoint mode metadata, config reference, and `sourceType` equal to `lark` or `feishu`

#### Scenario: Persist PlatformDepartment and PlatformUser
- **WHEN** Feishu/Lark departments or users are synced
- **THEN** the system creates or updates PlatformDepartment and PlatformUser records with SourceConnection lineage and lifecycle state

#### Scenario: Persist PlatformMembership
- **WHEN** Feishu/Lark user-department memberships are synced
- **THEN** the system creates or updates PlatformMembership records with source lineage and lifecycle state

#### Scenario: Keep Feishu adapter tables out of cross-service authority
- **WHEN** downstream providers need organization facts
- **THEN** they SHALL consume platform master data contracts rather than Feishu-specific mapping tables as long-term authority

### Requirement: Soft-disable missing Feishu data
The system SHALL soft-disable Feishu/Lark sourced departments, users, and memberships that were previously synced but are missing from a completed full sync result when soft-disable is enabled.

#### Scenario: Soft-disable missing department or user
- **WHEN** a previously synced Feishu/Lark department or user is missing from the latest completed full sync result
- **THEN** the system marks the corresponding local and mapping records disabled without physically deleting them

#### Scenario: Do not soft-disable after failed sync
- **WHEN** a full sync fails or only partially completes before a full organization snapshot is available and persisted
- **THEN** the system records the failed or partial sync run without soft-disabling missing data from that run

### Requirement: Feishu organization sync admin UI
The system SHALL provide a Web Admin management page for Feishu/Lark organization sync.

#### Scenario: Configure sync from management tools
- **WHEN** an administrator opens the management tools Feishu organization sync entry
- **THEN** the page displays target organization, App ID, masked App Secret, endpoint mode, enablement, soft-disable, schedule settings, connection test, manual sync action, and run history

#### Scenario: Run history communicates status
- **WHEN** sync runs exist
- **THEN** the page shows trigger type, status, stage, started/finished timestamps, fetched/created/updated/disabled counts, and safe error summaries

### Requirement: Feishu organization sync run diagnostics
The system SHALL expose a normalized, secret-free diagnostics object for each Feishu/Lark organization sync run so that an authorized administrator can triage failures without reading raw provider responses or server logs.

#### Scenario: Diagnose failed run with normalized fields
- **WHEN** an authorized administrator inspects a failed Feishu/Lark organization sync run
- **THEN** the response includes diagnostics with `failedStage`, `failureCategory`, `reasonCode`, `retryReadiness`, `operatorAction`, `safeSummary`, `startedAt`, `finishedAt`, and `durationMs`
- **AND** the fields use stable machine-readable values rather than parsing localized error text

#### Scenario: Diagnose successful or running run
- **WHEN** an authorized administrator inspects a running or succeeded Feishu/Lark organization sync run
- **THEN** the response includes diagnostics with safe aggregate stats and no failure category unless a failure or partial state is present
- **AND** `retryReadiness` does not suggest retrying a currently running run

#### Scenario: Keep diagnostics secret-free
- **WHEN** diagnostics are built from run errors, provider errors, or scheduler dispatch errors
- **THEN** the diagnostics output MUST NOT include App Secret, tenant access token, raw Contact response body, complete department tree, complete user list, phone number, email, `open_id`, `union_id`, or `user_id` details
- **AND** safe aggregate stats MAY include counts such as `departmentCount`, `userCount`, `membershipCount`, and `disabledCount`

#### Scenario: Return unavailable diagnostics safely
- **WHEN** an administrator requests diagnostics for a run that does not exist or does not belong to the target organization
- **THEN** the API returns the same safe not-found behavior as run detail inspection
- **AND** it does not reveal whether another organization owns the run

### Requirement: Feishu organization sync failure triage
The system SHALL classify Feishu/Lark organization sync failures into stable failure stages and operator actions.

#### Scenario: Classify credential and Contact permission failures
- **WHEN** a sync fails because credentials are missing, App credentials are invalid, tenant token cannot be acquired, or Contact permission is missing
- **THEN** diagnostics classify the `reasonCode` as `missing_secret`, `invalid_app_credentials`, `tenant_unavailable`, or `contact_scope_missing`
- **AND** diagnostics classify `failureCategory` as a stable coarse category such as `configuration`, `credentials`, `permission`, or `provider`
- **AND** `operatorAction` is `fix_credentials`, `grant_contact_scope`, or `manual_review` as appropriate

#### Scenario: Classify provider throttling and contract failures
- **WHEN** a sync fails because Feishu/Lark rate limits requests, returns a tenant/service unavailable error, or returns an unexpected Contact payload shape
- **THEN** diagnostics classify the `reasonCode` as `rate_limited`, `tenant_unavailable`, or `contract_mismatch`
- **AND** `retryReadiness` is `wait_rate_limit`, `safe_retry`, `not_ready`, or `unknown` according to the failure type
- **AND** `operatorAction` is `wait_rate_limit`, `manual_review`, or `unknown` as appropriate

#### Scenario: Classify local apply and projection failures
- **WHEN** a sync fails while upserting departments, users, memberships, applying soft-disable, or projecting source-neutral platform master data
- **THEN** diagnostics classify the failure stage as `upsert_department`, `upsert_user`, `upsert_membership`, `soft_disable`, or `projection`
- **AND** diagnostics classify `reasonCode` as `mapping_conflict`, `projection_failed`, or `unknown`
- **AND** `operatorAction` is `inspect_mapping_conflict`, `inspect_projection`, or `manual_review`

#### Scenario: Classify partial sync without soft-disable
- **WHEN** a full sync fails before a complete snapshot is applied
- **THEN** diagnostics classify the `reasonCode` as `partial_sync`
- **AND** the diagnostics state that missing-data soft-disable was not applied for that failed run

### Requirement: Feishu organization sync retry readiness UI
The Web Admin Feishu/Lark organization sync page SHALL display run diagnostics in run history and run detail using compact operator-facing labels.

#### Scenario: Display failed run diagnostics
- **WHEN** the Feishu/Lark organization sync page lists or opens a failed run
- **THEN** the page displays status, failed stage, failure category, retry action, safe summary, key aggregate counts, and duration
- **AND** the page does not require the operator to inspect raw JSON or server logs for first-level triage

#### Scenario: Preserve dense admin layout
- **WHEN** diagnostics are displayed in the run history table or detail area
- **THEN** the page uses compact tags, short text, and grouped stats rather than large explanatory copy or marketing-style panels

#### Scenario: Do not expose Contact identifiers in UI
- **WHEN** diagnostics contain provider-derived errors or stats
- **THEN** the page does not render raw phone numbers, emails, `open_id`, `union_id`, `user_id`, raw Contact payloads, or secrets

### Requirement: Feishu P0 excludes management scope and Insight filtering
The system SHALL NOT require Feishu direct managers or department leaders to enter management scope or Insight filtering in this P0 change.

#### Scenario: Management scope remains unchanged
- **WHEN** Feishu organization sync is enabled and users are synchronized
- **THEN** existing management scope and Insight filtering behavior remains unchanged except for available platform master data lineage

#### Scenario: P1 can extend from platform data
- **WHEN** a later change adds Feishu manager or department leader scope
- **THEN** it can build on SourceConnection, PlatformDepartment, PlatformUser, and PlatformMembership records created by this change

### Requirement: Feishu organization sync dry-run preview
The system SHALL allow an authorized administrator to run a Feishu/Lark organization sync dry-run preview that computes the expected local impact of a full sync without committing organization data writes.

#### Scenario: Preview full sync impact without writes
- **WHEN** an authorized administrator starts a Feishu/Lark dry-run preview for a target organization
- **THEN** the system fetches or evaluates a normalized Feishu/Lark snapshot using the configured source
- **AND** returns a diff summary for departments, users, and memberships
- **AND** MUST NOT write `Group`, `User`, Feishu mapping tables, `SourceConnection`, `PlatformDepartment`, `PlatformUser`, `PlatformMembership`, `ExternalIdentity`, `OrgSyncBatch`, Gateway authorization facts, or final sync run state

#### Scenario: Summarize diff categories
- **WHEN** the dry-run preview compares the incoming snapshot with Admin-owned local state
- **THEN** each resource category reports counts for `toCreate`, `toUpdate`, `toSoftDisable`, `unchanged`, `conflict`, and `invalid`
- **AND** the response includes reason counts for notable preview risks such as missing identifiers, missing parent departments, unmapped relationships, duplicate external identifiers, and would-soft-disable records

#### Scenario: Preview empty snapshot safely
- **WHEN** the dry-run preview receives an empty or effectively empty Contact snapshot
- **THEN** the response reports zero incoming departments, users, and memberships
- **AND** it reports any existing enabled Feishu-sourced records as `toSoftDisable` only when the saved configuration has soft-disable enabled
- **AND** it does not perform the soft-disable

### Requirement: Feishu dry-run preview diagnostics and redaction
The system SHALL return safe diagnostics and redacted metadata for Feishu/Lark dry-run preview outcomes.

#### Scenario: Fail closed when runtime authorization is unavailable
- **WHEN** dry-run preview cannot run because the App Secret is missing, credentials are invalid, Contact permissions are missing, or runtime tenant authorization is unavailable
- **THEN** the response fails closed with stable diagnostics such as `credential_missing`, `invalid_app_credentials`, `contact_permission_missing`, or `runtime_authorization_required`
- **AND** it does not return a successful diff summary

#### Scenario: Keep preview response secret-free
- **WHEN** dry-run preview returns success or failure diagnostics
- **THEN** the response MUST NOT include App Secret, tenant access token, raw Contact response body, complete department tree, complete user list, phone number, email, `open_id`, `union_id`, or `user_id` details
- **AND** source metadata MAY include safe aliases such as target organization, endpoint mode, hashed or masked app alias, tenant alias, preview timestamp, and aggregate snapshot counts

#### Scenario: Classify invalid and conflicting snapshot data
- **WHEN** the incoming snapshot contains missing stable identifiers, duplicate external identifiers, unknown parent departments, or memberships whose user or department cannot be resolved
- **THEN** the dry-run preview reports those entries under `invalid` or `conflict`
- **AND** reason counts identify the failure class without exposing raw external identifiers or profile data

### Requirement: Feishu dry-run preview console
The Web Admin Feishu/Lark organization sync page SHALL provide a compact dry-run preview console before the real full sync action.

#### Scenario: Display dry-run diff summary
- **WHEN** an administrator runs a dry-run preview from the Feishu/Lark organization sync page
- **THEN** the page displays department, user, and membership diff counts, reason counts, source aliases, preview time, and safe diagnostics
- **AND** the preview result is visually distinct from actual sync run history

#### Scenario: Preserve dense admin layout
- **WHEN** dry-run preview results are displayed
- **THEN** the page uses compact tables, tags, and grouped counters rather than large explanatory copy
- **AND** the existing configuration, connection test, manual sync, schedule, and run history workflows remain available

#### Scenario: Avoid using preview as authorization facts
- **WHEN** a dry-run preview completes successfully
- **THEN** the system does not publish Gateway authorization facts
- **AND** the system does not change Insight scope/filter behavior or management scope membership
