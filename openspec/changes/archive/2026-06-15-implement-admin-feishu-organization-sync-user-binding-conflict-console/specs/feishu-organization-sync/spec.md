## ADDED Requirements

### Requirement: Feishu user binding conflict diagnostics
The system SHALL expose a read-only, secret-free diagnostics view for Feishu/Lark user binding risks before an administrator starts or trusts a full organization sync.

#### Scenario: Diagnose stable Lark binding conflicts
- **WHEN** an authorized administrator requests Feishu/Lark user binding diagnostics for a target organization
- **THEN** the system analyzes Admin-owned local Feishu mappings, `User.Lark`, Lark OAuth identifier properties, source connection metadata, recent dry-run history, and recent sync run metadata
- **AND** it reports risk counts and issues for duplicate `user_id` bindings, local users associated with multiple tenant/user identities, legacy `open_id` or `union_id` split matches, missing tenant keys, and endpoint mode mismatches
- **AND** it does not execute a sync, repair data, update users, update groups, update platform master data, or publish Gateway facts

#### Scenario: Return secret-free binding diagnostics
- **WHEN** binding diagnostics contain risky local or Feishu/Lark identifiers
- **THEN** each issue includes only safe summary, risk level, stable hash or limited sample alias, recommended operator action, blocked reason when applicable, sourceConnectionIdHash, run/history linkage, and redaction metadata
- **AND** the response MUST NOT include phone numbers, emails, real names, complete organization trees, tokens, Cookie values, private URLs, raw Feishu responses, or raw `open_id`, `union_id`, or `user_id` details

#### Scenario: Report empty or disabled diagnostics safely
- **WHEN** Feishu organization sync is not configured, disabled, or has no local binding risks
- **THEN** the API returns a stable `disabled`, `empty`, or `ok` status with safe source aliases and zero or low risk counts
- **AND** the response remains read-only and does not block configuration, connection test, dry-run preview, manual sync, or run history inspection

### Requirement: Feishu user binding conflict console
The Web Admin Feishu/Lark organization sync page SHALL display a compact read-only console for user binding and identity matching diagnostics.

#### Scenario: Display binding conflict diagnostics
- **WHEN** an administrator opens the Feishu/Lark organization sync page
- **THEN** the page shows a binding conflict diagnostics area with status, risk level, risk counts, recent run/history linkage, and safe issue rows
- **AND** risk rows use compact labels and stable hashes rather than raw identifiers or profile data

#### Scenario: Inspect and export redacted diagnostics
- **WHEN** an administrator opens a binding diagnostic detail
- **THEN** the page displays a Drawer containing redacted JSON, safe summary, recommended operator action, blocked reason, sourceConnectionIdHash, and run/history linkage
- **AND** the administrator can copy or export the redacted JSON without requesting raw Feishu/Lark payloads

#### Scenario: Handle diagnostics UI states
- **WHEN** diagnostics are loading, empty, disabled, or fail to refresh
- **THEN** the page shows compact loading, empty, disabled, or error states without blocking configuration, connection test, dry-run preview, dry-run history, manual sync, or formal sync run history workflows
