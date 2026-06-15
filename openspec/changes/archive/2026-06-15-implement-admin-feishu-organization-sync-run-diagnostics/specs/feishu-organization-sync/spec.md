## ADDED Requirements

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
