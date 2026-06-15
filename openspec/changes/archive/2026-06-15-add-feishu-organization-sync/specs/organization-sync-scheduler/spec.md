## ADDED Requirements

### Requirement: Feishu scheduled full sync dispatch
The organization sync scheduler SHALL be able to dispatch scheduled Feishu/Lark full differential organization sync runs through the existing provider executor registry.

#### Scenario: Dispatch Feishu scheduled sync
- **WHEN** an enabled organization sync schedule exists for provider `lark` or `feishu`, job type `full-differential`, and a target organization with an enabled Feishu organization sync configuration
- **THEN** the scheduler dispatches exactly one scheduled Feishu organization sync run for the acquired schedule fire
- **AND** records the created run identity on the schedule fire

#### Scenario: Skip missing or disabled Feishu configuration
- **WHEN** a Feishu/Lark schedule fire is acquired but the target organization has no sync configuration or the configuration is disabled
- **THEN** the scheduler records a skipped or failed dispatch result with a safe configuration error
- **AND** does not panic the admin process

#### Scenario: Skip duplicate running Feishu sync
- **WHEN** a Feishu/Lark schedule fire is acquired while a Feishu organization sync run is already running for the same organization
- **THEN** the scheduler records a skipped dispatch with the existing run identity when available
- **AND** does not create a duplicate run

#### Scenario: Keep Feishu scheduler records secret-free
- **WHEN** a Feishu/Lark scheduled dispatch fails because of provider configuration or execution setup
- **THEN** persisted scheduler error text does not include App Secret, tenant access token, raw API response body, or full Contact user data
