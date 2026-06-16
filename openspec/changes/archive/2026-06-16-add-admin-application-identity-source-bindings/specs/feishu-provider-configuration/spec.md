## MODIFIED Requirements

### Requirement: Feishu login setup is documented
The system SHALL include operator-facing documentation for configuring and validating domestic Feishu login, including the Application Provider identity source binding that points Lark/Feishu login to the same organization used by Feishu organization sync.

#### Scenario: Documentation includes configuration checklist
- **WHEN** an operator reads the Feishu login documentation
- **THEN** the documentation lists Provider type, endpoint mode, App ID, App Secret, default Provider-page callback URL, actual application login origin, Provider visibility, application binding steps, required "Get user ID" field permission for returning `user_id` and stable sync-user matching, expected Feishu/Lark brand display, and the Application Provider target organization
- **AND** the documentation states that the Lark/Feishu Provider target organization should match the Feishu organization sync target organization when synced users are expected to sign in

#### Scenario: Documentation includes validation checklist
- **WHEN** an operator validates Feishu login
- **THEN** the documentation describes opening the target AICodex client login page, clicking the Feishu entry, scanning or authorizing in Feishu, returning to the authentication center `/callback`, confirming the final redirect to the original client redirect URI, and confirming that the matched local user belongs to the Provider target organization

#### Scenario: Documentation includes troubleshooting notes
- **WHEN** an operator investigates a failed Feishu login
- **THEN** the documentation identifies common causes such as wrong endpoint mode, mismatched App ID/App Secret, missing callback URL, default callback URL copied despite application `forcedRedirectOrigin`, missing app availability, missing "Get user ID" field permission for `user_id`, insufficient optional email or phone permissions, non-standard brand display, identifier binding mismatch, OAuth client context validation failure, and Provider target organization mismatch
