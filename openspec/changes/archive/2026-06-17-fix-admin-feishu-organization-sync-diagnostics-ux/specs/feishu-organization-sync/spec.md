## MODIFIED Requirements

### Requirement: Feishu user binding conflict diagnostics

The system SHALL expose a read-only, secret-free diagnostics view for Feishu/Lark user binding risks before an administrator starts or trusts a full organization sync.

#### Scenario: Diagnose stable Lark binding conflicts
- **WHEN** an authorized administrator requests Feishu/Lark user binding diagnostics for a target organization
- **THEN** the system analyzes Admin-owned local Feishu mappings, `User.Lark`, Lark OAuth identifier properties, source connection metadata, recent dry-run history, and recent sync run metadata
- **AND** it reports risk counts and issues for duplicate `user_id` bindings, local users associated with multiple tenant/user identities, legacy `open_id` or `union_id` split matches, missing tenant keys, and endpoint mode mismatches
- **AND** it does not execute a sync, repair data, update users, update groups, update platform master data, or publish Gateway facts

#### Scenario: Do not flag linked sync and OAuth identities as multi-tenant conflicts
- **WHEN** the same local user has Feishu/Lark identity evidence from both organization sync mappings and Lark/Feishu sign-in user properties
- **AND** those records share at least one stable Feishu/Lark identifier among `user_id`, `open_id`, `union_id`, or local `lark`
- **THEN** the diagnostics SHALL treat the records as one linked Feishu/Lark identity for local-user multi-tenant detection
- **AND** it SHALL NOT report a high-risk `local_user_multi_tenant` issue solely because the sync mapping tenant alias differs from the sign-in user property tenant alias

#### Scenario: Preserve true multi-identity local user risk
- **WHEN** the same local user is associated with multiple Feishu/Lark identity records that cannot be linked by any stable `user_id`, `open_id`, `union_id`, or local `lark` identifier
- **THEN** the diagnostics SHALL continue to report a high-risk local-user multi-tenant binding issue
- **AND** the issue SHALL expose only safe samples, stable hashes, recommended operator action, linkage aliases, and blocked reason aliases

#### Scenario: Return secret-free binding diagnostics
- **WHEN** binding diagnostics contain risky local or Feishu/Lark identifiers
- **THEN** each issue includes only safe summary, risk level, stable hash or limited sample alias, recommended operator action, blocked reason when applicable, sourceConnectionIdHash, run/history linkage, and redaction metadata
- **AND** the response MUST NOT include phone numbers, emails, real names, complete organization trees, tokens, Cookie values, private URLs, raw Feishu responses, or raw `open_id`, `union_id`, or `user_id` details

#### Scenario: Report empty or disabled diagnostics safely
- **WHEN** Feishu organization sync is not configured, disabled, or has no local binding risks
- **THEN** the API returns a stable `disabled`, `empty`, or `ok` status with safe source aliases and zero or low risk counts
- **AND** the response remains read-only and does not block configuration, connection test, dry-run preview, manual sync, or run history inspection

### Requirement: Feishu dry-run preview history UI

The Web Admin Feishu/Lark organization sync page SHALL display recent dry-run preview history and allow secret-free detail inspection.

#### Scenario: Display recent dry-run preview history
- **WHEN** an administrator opens the Feishu/Lark organization sync page
- **THEN** the page shows a recent dry-run history table with preview time, status, source aliases, snapshot counts, department/user/membership diff counts, safe diagnostics, retention marker, and redaction marker
- **AND** the dry-run history is visually distinct from formal sync run history

#### Scenario: Keep dry-run history collapsed by default
- **WHEN** an administrator opens the Feishu/Lark organization sync page
- **AND** dry-run history is available
- **THEN** the page SHALL show a compact collapsed dry-run history header with recent count and latest preview time
- **AND** it SHALL NOT render the full dry-run history table until the administrator expands the history section
- **AND** expanding the section SHALL show only redacted aggregate history rows and the existing safe detail Drawer workflow

#### Scenario: Inspect dry-run preview history drawer
- **WHEN** an administrator opens a dry-run history detail
- **THEN** the page displays a Drawer with diff counts, reason counts, diagnostics aliases, safe summary, request marker, operator hash, retention metadata, and redaction metadata
- **AND** long aliases or summaries do not overlap other UI content

#### Scenario: Handle dry-run history UI states
- **WHEN** dry-run history is loading, empty, or fails to refresh
- **THEN** the page shows compact loading, empty, or error states without blocking configuration, connection test, dry-run preview, manual sync, or formal sync run history workflows

### Requirement: Feishu handoff evidence acceptance checklist console

The Web Admin Feishu/Lark organization sync page SHALL allow administrators to inspect, copy, and export the redacted acceptance checklist.

#### Scenario: Inspect acceptance checklist
- **WHEN** an administrator opens the Feishu/Lark organization sync page and handoff evidence is available
- **THEN** the page shows a compact acceptance checklist area with execution mode, manual-review-only marker, summary counts, safe source aliases, readiness, provider-owned missing evidence, manual review actions, `cannotInfer`, `noFallback`, redaction, and retention status
- **AND** checklist rows show status, severity, source, safe summary, blocked reason alias, and recommended operator action without raw provider payloads or identity details

#### Scenario: Default acceptance drawer shows operator decision summary
- **WHEN** an administrator opens the acceptance evidence Drawer
- **THEN** the default Drawer view SHALL show readiness, source type, redaction marker, safe summary, blocked reason labels, recommended operator actions, cannot-infer labels, and summary counts in human-readable operator-facing language
- **AND** it SHALL NOT show raw internal aliases, raw source hashes, execution mode aliases, checklist item ids, provider-owned evidence aliases, `cannotInfer` aliases, or `noFallback` aliases until the administrator expands the detailed checklist section

#### Scenario: Expand detailed checklist and safe aliases
- **WHEN** an administrator expands the detailed checklist section in the acceptance evidence Drawer
- **THEN** the page SHALL show the redacted checklist rows, safe source aliases, provider-owned evidence aliases, manual review action aliases, `cannotInfer`, `noFallback`, redaction, and retention metadata
- **AND** the page SHALL continue to support copying and exporting sanitized checklist JSON and Markdown
- **AND** the exported content MUST NOT include phone numbers, emails, real names, raw source payloads, tokens, Cookie values, private URLs, tenant secrets, raw Feishu/Lark app identifiers, raw tenant keys, raw user identifiers, or raw run/dry-run source identifiers

#### Scenario: Copy and export sanitized checklist
- **WHEN** an administrator copies or exports the checklist
- **THEN** the page copies or downloads sanitized checklist JSON
- **AND** the page can copy or export sanitized Markdown summarizing the checklist, provider-owned gaps, manual actions, `cannotInfer`, `noFallback`, redaction, and retention metadata
- **AND** the exported content MUST NOT include phone numbers, emails, real names, raw source payloads, tokens, Cookie values, private URLs, tenant secrets, raw Feishu/Lark app identifiers, raw tenant keys, raw user identifiers, or raw run/dry-run source identifiers

#### Scenario: Handle checklist UI states
- **WHEN** checklist evidence is loading, empty, unavailable, provider-owned evidence is missing, `cannotInfer` or `noFallback` items exist, copy/export succeeds, copy/export fails, or handoff evidence refresh fails
- **THEN** the page shows compact loading, empty, provider-missing, cannot-infer, no-fallback, success, or error states
- **AND** these states do not block configuration, connection test, dry-run preview, dry-run history, binding diagnostics, manual sync, formal sync run history, or existing handoff evidence JSON workflows
