## ADDED Requirements

### Requirement: Feishu sync page keeps advanced evidence secondary
The Web Admin Feishu/Lark organization sync page SHALL keep base synchronization controls visually primary while presenting Feishu-only dry-run history, binding diagnostics, handoff evidence, and acceptance evidence as compact secondary information unless operator attention is required.

#### Scenario: Display base workflow before auxiliary evidence
- **WHEN** an administrator opens the Feishu/Lark organization sync page
- **THEN** the first visible workflow SHALL emphasize target organization, endpoint mode, App ID, App Secret, sync options, schedule options, permission guidance, save, connection test, dry-run preview, manual sync, and formal sync records
- **AND** binding diagnostics, handoff evidence, acceptance checklist, and dry-run history SHALL NOT appear as large default panels when their state is healthy, empty, no-run, or ready

#### Scenario: Keep preview history near preview action
- **WHEN** an administrator wants to inspect dry-run preview history
- **THEN** the page SHALL expose it as a secondary action near the preview workflow or in a modal/drawer
- **AND** it SHALL NOT render a full dry-run history table in the main page by default

#### Scenario: Escalate only actionable auxiliary states
- **WHEN** Feishu auxiliary evidence has a failed refresh, warning, blocked readiness, binding conflict, or failed dry-run
- **THEN** the page SHALL show a concise warning or error summary with a clear detail action
- **AND** detailed evidence rows, raw aliases, and export/copy affordances SHALL remain behind explicit operator action

### Requirement: Feishu formal sync records align with the shared sync table
The Web Admin Feishu/Lark organization sync page SHALL display formal sync run history using the same base table semantics as other organization sync providers, with only Feishu-specific membership or diagnostic columns added where useful.

#### Scenario: Display formal run columns consistently
- **WHEN** Feishu/Lark sync runs exist
- **THEN** the table SHALL show run id, status, trigger type, stage, actor, started time, finished time, department impact, user impact, optional membership impact, and safe error summary as separate scan-friendly concepts
- **AND** successful runs SHALL NOT require reading a dense diagnostics block to understand status or impact

#### Scenario: Preserve safe Feishu diagnostics
- **WHEN** a Feishu/Lark run has failed, partial, warning, or diagnostic evidence
- **THEN** the table MAY display compact diagnostic tags or a safe summary
- **AND** it SHALL NOT expose raw Contact payloads, complete trees, complete users, token, secret, phone, email, `open_id`, `union_id`, `user_id`, raw app identifiers, or raw tenant identifiers
