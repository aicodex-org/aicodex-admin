## ADDED Requirements

### Requirement: Feishu dry-run preview history audit trail
The system SHALL record a secret-free audit summary for each Feishu/Lark organization sync dry-run preview attempt.

#### Scenario: Record successful dry-run preview summary
- **WHEN** an authorized administrator runs a Feishu/Lark dry-run preview and the preview succeeds
- **THEN** the system records a history entry containing the target organization, source alias hashes, snapshot stats, department/user/membership diff counts, reason counts, diagnostics aliases, preview timestamp, operator hash, request marker, retention metadata, and redaction metadata
- **AND** the history entry MUST NOT contain raw Contact payloads, complete department trees, complete user lists, App Secret, tenant access token, phone numbers, emails, `open_id`, `union_id`, or `user_id` details

#### Scenario: Record fail-closed dry-run preview summary
- **WHEN** dry-run preview fails closed because configuration, credentials, permission, provider, or contract validation is unavailable
- **THEN** the system records a history entry with status `failed`, stable diagnostic aliases, safe summary, reason counts, source aliases when available, operator hash, request marker, and redaction metadata
- **AND** it does not persist raw provider response bodies or sensitive identifiers

#### Scenario: Preserve dry-run fail-closed semantics on history storage failure
- **WHEN** dry-run preview produces a success or fail-closed result but the history store cannot persist the audit summary
- **THEN** the dry-run preview response remains stable and secret-free
- **AND** the response exposes a safe diagnostic or warning that the audit summary could not be recorded
- **AND** the storage error MUST NOT cause organization data writes or leak secrets

### Requirement: Feishu dry-run preview history read APIs
The system SHALL expose administrator-only read APIs for Feishu/Lark dry-run preview history.

#### Scenario: List dry-run preview history with filters
- **WHEN** an authorized administrator queries dry-run preview history for a target organization
- **THEN** the API returns recent history entries filtered by organization, source connection ID hash, status or diagnostic alias, created time range, limit, or topN when provided
- **AND** the response includes only secret-free summary fields and total count where pagination is requested

#### Scenario: Inspect dry-run preview history detail
- **WHEN** an authorized administrator requests a dry-run preview history detail by history ID and organization
- **THEN** the API returns the matching secret-free audit summary, diff counts, reason counts, diagnostics aliases, retention metadata, and redaction metadata
- **AND** it MUST NOT return raw Contact payloads, complete trees, complete users, token, secret, phone, email, `open_id`, `union_id`, or `user_id` details

#### Scenario: Hide history across organization boundaries
- **WHEN** an administrator requests a history entry outside the authorized target organization
- **THEN** the API returns the same safe not-found or unauthorized behavior used by Feishu organization sync module APIs
- **AND** it does not reveal whether another organization owns that history entry

### Requirement: Feishu dry-run preview history UI
The Web Admin Feishu/Lark organization sync page SHALL display recent dry-run preview history and allow secret-free detail inspection.

#### Scenario: Display recent dry-run preview history
- **WHEN** an administrator opens the Feishu/Lark organization sync page
- **THEN** the page shows a recent dry-run history table with preview time, status, source aliases, snapshot counts, department/user/membership diff counts, safe diagnostics, retention marker, and redaction marker
- **AND** the dry-run history is visually distinct from formal sync run history

#### Scenario: Inspect dry-run preview history drawer
- **WHEN** an administrator opens a dry-run history detail
- **THEN** the page displays a Drawer with diff counts, reason counts, diagnostics aliases, safe summary, request marker, operator hash, retention metadata, and redaction metadata
- **AND** long aliases or summaries do not overlap other UI content

#### Scenario: Handle dry-run history UI states
- **WHEN** dry-run history is loading, empty, or fails to refresh
- **THEN** the page shows compact loading, empty, or error states without blocking configuration, connection test, dry-run preview, manual sync, or formal sync run history workflows
