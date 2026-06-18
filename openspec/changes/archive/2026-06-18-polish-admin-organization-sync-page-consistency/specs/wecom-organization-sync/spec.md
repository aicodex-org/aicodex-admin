## ADDED Requirements

### Requirement: WeCom sync page remains the simple base workflow
The Web Admin WeCom organization sync page SHALL remain the simple reference workflow for organization synchronization while sharing presentation conventions with other provider sync pages.

#### Scenario: Preserve simple base workflow
- **WHEN** an administrator opens the WeCom organization sync page
- **THEN** the page SHALL emphasize target organization, Corp ID, address book secret, sync options, schedule options, permission guidance, save, connection test, manual sync, and formal sync records
- **AND** it SHALL NOT add Feishu-only dry-run history, binding diagnostics, handoff evidence, or acceptance checklist UI

#### Scenario: Align formal run table concepts
- **WHEN** WeCom sync runs exist
- **THEN** the table SHALL show run id, status, trigger type, stage, actor, started time, finished time, department impact, user impact, and safe error summary as separate scan-friendly concepts
- **AND** the table SHALL use the same base ordering and density as Feishu/Lark formal sync records except for provider-specific columns that WeCom does not have
