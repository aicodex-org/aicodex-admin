## ADDED Requirements

### Requirement: Scheduled sync SHALL enforce one configured address-book source per organization
The organization sync scheduler SHALL enforce the same single configured address-book sync source rule used by manual sync APIs before dispatching scheduled organization sync runs.

#### Scenario: Skip conflicting WeCom schedule fire
- **WHEN** an enabled WeCom schedule fire is acquired for an organization that already has a Feishu/Lark sync configuration
- **THEN** the scheduler SHALL NOT create a WeCom sync run
- **AND** the fire SHALL be recorded as skipped or failed with a safe configuration reason that does not expose credentials

#### Scenario: Skip conflicting Feishu schedule fire
- **WHEN** an enabled Feishu/Lark schedule fire is acquired for an organization that already has a WeCom sync configuration
- **THEN** the scheduler SHALL NOT create a Feishu/Lark sync run
- **AND** the fire SHALL be recorded as skipped or failed with a safe configuration reason that does not expose credentials
