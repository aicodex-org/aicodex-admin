## ADDED Requirements

### Requirement: Feishu organization sync page uses unified Admin sync shell
The Feishu/Lark organization sync Admin page SHALL use the shared organization sync page presentation shell for base synchronization workflows while preserving Feishu-specific dry-run, diagnostics, and handoff evidence capabilities.

#### Scenario: Display provider-branded page header
- **WHEN** an administrator opens the Feishu/Lark organization sync page
- **THEN** the page SHALL display a compact Admin header with a Feishu/Lark provider logo, page title, endpoint-aware context when available, and operator-facing status text
- **AND** the logo SHALL be loaded from existing provider logo infrastructure or project-local assets rather than newly embedded external brand files

#### Scenario: Preserve Feishu-specific workflows
- **WHEN** the Feishu/Lark organization sync page is migrated or refactored
- **THEN** the page SHALL preserve target organization, App ID, masked App Secret, endpoint mode, enablement, soft-disable, schedule settings, connection test, dry-run preview, dry-run history, user binding diagnostics, handoff evidence, acceptance checklist, manual sync, and formal sync run inspection
- **AND** it SHALL keep existing API contracts, route path, authorization behavior, redaction behavior, export behavior, and secret masking behavior unchanged

#### Scenario: Align base layout with WeCom sync page
- **WHEN** the WeCom and Feishu organization sync pages are compared
- **THEN** the Feishu page SHALL share the same base layout pattern for target organization, credentials, sync options, schedule options, primary action ordering, running sync disabled state, and formal sync records
- **AND** Feishu-only dry-run, binding diagnostics, and handoff evidence sections SHALL appear as compact auxiliary areas or modals rather than disrupting the common base workflow

#### Scenario: Preserve compact diagnostics behavior
- **WHEN** Feishu dry-run, binding diagnostics, handoff evidence, or acceptance checklist data is healthy, empty, disabled, no-run, or running without a blocking problem
- **THEN** the page SHALL show compact status rows or concise summaries by default
- **AND** it SHALL only render larger warning/error panels or detailed rows when there is a warning, blocking readiness, failed refresh, or explicit operator expansion

#### Scenario: Protect redacted evidence and identifiers
- **WHEN** the migrated Feishu page displays or exports dry-run history, binding diagnostics, handoff evidence, or acceptance checklist data
- **THEN** it SHALL continue to render and export only redacted hashes, aliases, aggregate counts, safe summaries, redaction metadata, and retention metadata
- **AND** it SHALL NOT expose raw Contact payloads, complete trees, complete users, token, secret, phone, email, `open_id`, `union_id`, `user_id`, raw app identifiers, or raw tenant identifiers
