## ADDED Requirements

### Requirement: Feishu scheduler dispatch diagnostics
The organization sync scheduler SHALL provide safe diagnostics for Feishu/Lark scheduled dispatch outcomes that fail before a sync run can provide its own detailed run diagnostics.

#### Scenario: Classify missing or disabled Feishu scheduled configuration
- **WHEN** a Feishu/Lark scheduled dispatch is skipped or failed because the target organization has no enabled Feishu sync configuration
- **THEN** the scheduler records a safe `failureCategory`, `reasonCode`, `retryReadiness`, and `operatorAction`
- **AND** missing configuration or disabled configuration maps to `operatorAction=fix_credentials` or `operatorAction=manual_review` without pretending that a provider request was attempted
- **AND** the diagnostic text does not include provider credentials

#### Scenario: Classify duplicate scheduled run
- **WHEN** a Feishu/Lark scheduled dispatch finds an existing running sync for the same organization
- **THEN** the scheduler records `retryReadiness=not_ready` for immediate retry
- **AND** it records the existing run identity when available without creating a duplicate run

#### Scenario: Keep scheduled dispatch diagnostics secret-free
- **WHEN** a Feishu/Lark scheduled dispatch fails because of provider configuration, executor setup, or run start failure
- **THEN** returned scheduler diagnostics and persisted error text MUST NOT include App Secret, tenant access token, raw Contact response body, full user data, phone number, email, `open_id`, `union_id`, or `user_id` details
