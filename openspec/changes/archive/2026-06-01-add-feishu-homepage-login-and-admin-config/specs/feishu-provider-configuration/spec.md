## ADDED Requirements

### Requirement: Provider configuration explains Feishu and Lark shared type
The system SHALL make it clear in Provider configuration that `Lark` is the shared OAuth Provider type for domestic Feishu and overseas Lark.

#### Scenario: Admin selects Lark provider type
- **WHEN** an administrator selects OAuth Provider type `Lark`
- **THEN** the Provider configuration page explains that the same Provider type supports domestic Feishu and overseas Lark based on endpoint selection

#### Scenario: No separate Feishu provider type is required
- **WHEN** an administrator configures domestic Feishu sign-in
- **THEN** the system allows the administrator to use Provider type `Lark` without creating a separate `Feishu` Provider type

### Requirement: Endpoint selection is explicit
The system SHALL expose domestic Feishu and overseas Lark endpoint selection through a business-facing endpoint mode while preserving the existing stored global endpoint switch.

#### Scenario: Domestic Feishu endpoint selected
- **WHEN** Provider type is `Lark` and the global endpoint switch is disabled
- **THEN** the configuration page identifies the selected mode as domestic Feishu and indicates that authorization uses `accounts.feishu.cn` and API calls use `open.feishu.cn`

#### Scenario: Overseas Lark endpoint selected
- **WHEN** Provider type is `Lark` and the global endpoint switch is enabled
- **THEN** the configuration page identifies the selected mode as overseas Lark and indicates that authorization uses `accounts.larksuite.com` and API calls use `open.larksuite.com`

#### Scenario: Endpoint mode warning for app credentials
- **WHEN** an administrator changes the global endpoint switch
- **THEN** the configuration guidance states that App ID and App Secret must come from the matching Feishu or Lark open platform

#### Scenario: Domestic Feishu branding does not rely on display name
- **WHEN** Provider type is `Lark` and the global endpoint switch is disabled
- **THEN** the configuration and login preview identify the default brand as Feishu even when `displayName` is empty

#### Scenario: Overseas Lark branding does not rely on display name
- **WHEN** Provider type is `Lark` and the global endpoint switch is enabled
- **THEN** the configuration and login preview identify the default brand as Lark even when `displayName` is empty

### Requirement: Required fields are validated
The system SHALL validate the minimum fields required to make Feishu/Lark OAuth login usable.

#### Scenario: Missing App ID is rejected
- **WHEN** an administrator saves a `Lark` OAuth Provider without App ID
- **THEN** the system rejects the save or shows a validation error for the missing App ID

#### Scenario: Missing App Secret is rejected
- **WHEN** an administrator saves a `Lark` OAuth Provider without App Secret
- **THEN** the system rejects the save or shows a validation error for the missing App Secret

#### Scenario: Complete Provider configuration can be saved
- **WHEN** an administrator saves a `Lark` OAuth Provider with App ID, App Secret, endpoint mode, and required base fields
- **THEN** the Provider configuration saves successfully

### Requirement: Callback URL guidance is available
The system SHALL show the callback URL that must be configured in the corresponding Feishu or Lark open platform application.

#### Scenario: Default callback URL displayed
- **WHEN** an administrator edits a `Lark` OAuth Provider
- **THEN** the Provider configuration page displays the default callback URL for the current management origin and explains that the actual Feishu/Lark open platform callback must use the authentication center origin that starts the login

#### Scenario: Forced redirect origin is respected
- **WHEN** the application uses a forced redirect origin for login
- **THEN** the displayed guidance tells the administrator to configure the callback URL under that application's actual forced redirect origin, not blindly copy the Provider page default

#### Scenario: Client redirect URI is distinguished from Feishu callback
- **WHEN** an administrator configures Feishu/Lark login for AICodex Web/API, Insight, desktop, or other clients
- **THEN** the Provider configuration guidance distinguishes the Feishu/Lark open platform callback URL from the downstream client OAuth/OIDC redirect URI

#### Scenario: Shared Provider callback guidance avoids a single-app assumption
- **WHEN** one `Lark` Provider is bound to multiple authentication center applications
- **THEN** the Provider configuration guidance states that each application must use the authentication center origin that actually generates its Feishu/Lark authorization URL

#### Scenario: Desktop redirect URI is documented as downstream client callback
- **WHEN** an AICodex desktop client uses a custom scheme redirect URI
- **THEN** the Provider configuration guidance treats that URI as the authentication center client redirect URI, not as the Feishu/Lark open platform callback URL

### Requirement: Feishu/Lark backend flow matches selected endpoint
The system SHALL exchange authorization codes and retrieve user information using the API domain that matches the Provider endpoint mode.

#### Scenario: Domestic Feishu token exchange
- **WHEN** a domestic Feishu Provider callback is processed
- **THEN** the backend exchanges the authorization code against `https://open.feishu.cn/open-apis/authen/v2/oauth/token` and retrieves the logged-in user profile from `https://open.feishu.cn/open-apis/authen/v1/user_info`

#### Scenario: Overseas Lark token exchange
- **WHEN** an overseas Lark Provider callback is processed
- **THEN** the backend exchanges the authorization code against `https://open.larksuite.com/open-apis/authen/v2/oauth/token` and retrieves the logged-in user profile from `https://open.larksuite.com/open-apis/authen/v1/user_info`

#### Scenario: User identifiers are mapped consistently
- **WHEN** the Provider user profile contains `user_id`, `union_id`, and `open_id`
- **THEN** the backend uses `user_id` as the primary binding identifier, stores the other identifiers as OAuth properties, and preserves existing Lark-bound users through compatible lookup

#### Scenario: Historical open_id or union_id match is backfilled
- **WHEN** a Feishu/Lark login profile contains `user_id` and an existing local user is matched through historical `open_id` or `union_id`
- **THEN** the backend signs in that existing user, stores the original identifiers as OAuth properties, and backfills the `Lark` binding field to `user_id`

#### Scenario: Multiple identifier matches are rejected
- **WHEN** `user_id`, `open_id`, and `union_id` match more than one local user
- **THEN** the backend rejects automatic login and returns a diagnosable error instead of choosing one user implicitly

#### Scenario: Historical v1 token flow is not the primary path
- **WHEN** a Feishu/Lark Provider callback is processed
- **THEN** the backend uses the v2 OAuth token endpoint as the primary path and does not call the historical v1 access token endpoint unless an explicitly tested compatibility fallback is triggered

### Requirement: Feishu login setup is documented
The system SHALL include operator-facing documentation for configuring and validating domestic Feishu login.

#### Scenario: Documentation includes configuration checklist
- **WHEN** an operator reads the Feishu login documentation
- **THEN** the documentation lists Provider type, endpoint mode, App ID, App Secret, default Provider-page callback URL, actual application login origin, Provider visibility, application binding steps, required "Get user ID" field permission for returning `user_id` and stable sync-user matching, and the expected Feishu/Lark brand display

#### Scenario: Documentation includes validation checklist
- **WHEN** an operator validates Feishu login
- **THEN** the documentation describes opening the target AICodex client login page, clicking the Feishu entry, scanning or authorizing in Feishu, returning to the authentication center `/callback`, and confirming the final redirect to the original client redirect URI

#### Scenario: Documentation includes troubleshooting notes
- **WHEN** an operator investigates a failed Feishu login
- **THEN** the documentation identifies common causes such as wrong endpoint mode, mismatched App ID/App Secret, missing callback URL, default callback URL copied despite application `forcedRedirectOrigin`, missing app availability, missing "Get user ID" field permission for `user_id`, insufficient optional email or phone permissions, non-standard brand display, identifier binding mismatch, and OAuth client context validation failure
