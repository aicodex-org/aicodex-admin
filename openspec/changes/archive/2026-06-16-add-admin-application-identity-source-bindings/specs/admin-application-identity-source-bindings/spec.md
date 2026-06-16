## ADDED Requirements

### Requirement: Application Provider identity source bindings
Admin SHALL allow an Application to bind each login Provider to a target organization used for user lookup during Provider sign-in.

#### Scenario: Provider uses explicit target organization
- **WHEN** an Application has a Provider binding with `targetOrganization=feishu-test`
- **AND** the user signs in through that Provider
- **THEN** Admin MUST look up the external identity in `feishu-test`
- **AND** Admin MUST NOT use the Application default organization for that Provider lookup

#### Scenario: Provider falls back to Application organization
- **WHEN** an existing Application Provider binding does not define `targetOrganization`
- **THEN** Admin MUST preserve existing behavior by using `application.organization` as the Provider login organization

#### Scenario: Target organization is unavailable
- **WHEN** a Provider binding references an empty, missing, or unauthorized target organization
- **THEN** Admin MUST fail closed with a diagnosable configuration error
- **AND** Admin MUST NOT search other organizations for a matching user

### Requirement: Provider-specific external identity matching
Admin SHALL apply existing Provider-specific matching rules inside the resolved Provider login organization.

#### Scenario: Lark identifiers use target organization
- **WHEN** a Lark/Feishu Provider login returns `user_id`, `open_id`, or `union_id`
- **AND** the Provider binding targets `feishu-test`
- **THEN** Admin MUST call Lark compatible matching within `feishu-test`
- **AND** Admin MUST continue to reject multiple identifier matches across different local users

#### Scenario: WeCom identifiers use target organization
- **WHEN** a WeCom Provider login returns a WeCom user identifier
- **AND** the Provider binding targets `wecom-wwe7e01c69367e67bf`
- **THEN** Admin MUST match `User.Wecom` within `wecom-wwe7e01c69367e67bf`

### Requirement: Identity source bindings are safe by default
Admin SHALL treat identity source bindings as configuration metadata and SHALL NOT expose secrets, raw upstream payloads, or cross-organization user details.

#### Scenario: Binding metadata is returned to the UI
- **WHEN** the Application edit API returns Provider bindings
- **THEN** each binding MAY include the target organization name
- **AND** the response MUST NOT include Provider secrets, tokens, raw Feishu/WeCom/DingTalk payloads, phone numbers, or emails because of this binding feature

#### Scenario: Binding does not imply automatic registration
- **WHEN** a Provider target organization is configured
- **AND** no matching user exists in that organization
- **THEN** Admin MUST continue to respect Application and Provider `CanSignUp`/`EnableSignUp` rules
- **AND** Admin MUST NOT silently create users in another organization
