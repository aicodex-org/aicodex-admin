## ADDED Requirements

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
