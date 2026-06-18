## ADDED Requirements

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
- **AND** it SHALL NOT add Feishu-only dry-run, binding diagnostic, handoff evidence, or acceptance checklist features unless a separate capability change introduces them

#### Scenario: Keep WeCom page simple by default
- **WHEN** the WeCom page has no error, warning, or running sync requiring operator attention
- **THEN** the page SHALL avoid large diagnostic panels and show compact status or empty states
- **AND** warnings or errors SHALL remain expandable or scannable without hiding actionable failure messages
