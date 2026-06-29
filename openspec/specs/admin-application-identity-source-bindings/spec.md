# admin-application-identity-source-bindings Specification

## Purpose
TBD - created by archiving change add-admin-application-identity-source-bindings. Update Purpose after archive.
## Requirements
### Requirement: Application Provider identity source bindings
Admin SHALL allow an Application to bind each login Provider to a target organization used for user lookup during Provider sign-in.

#### Scenario: Provider uses explicit target organization
- **WHEN** an Application has a Provider binding with `targetOrganization=feishu-test`
- **AND** the user signs in through that Provider
- **THEN** Admin MUST look up the external identity in `feishu-test`
- **AND** Admin MUST NOT use the Application default organization for that Provider lookup

#### Scenario: Provider requires explicit target organization
- **WHEN** an Application Provider binding does not define `targetOrganization`
- **AND** the user signs in through that Provider
- **THEN** Admin MUST fail closed with a diagnosable configuration error
- **AND** Admin MUST NOT use `application.organization` as the Provider login organization

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

### Requirement: Provider fallback binding defaults to email only
Admin SHALL use email as the only runtime default fallback binding rule when an Application Provider binding has no explicit `bindingRule`.

#### Scenario: Unconfigured binding rule matches by non-empty email
- **WHEN** a Provider sign-in has resolved the Provider login organization
- **AND** Provider-specific external identity matching does not find a user
- **AND** the Application Provider binding has no explicit `bindingRule`
- **AND** the upstream Provider returns a non-empty email matching an existing user in the resolved Provider login organization
- **THEN** Admin MUST bind or sign in as that existing user by email
- **AND** Admin MUST NOT write the default rule back into the Application Provider binding

#### Scenario: Unconfigured binding rule does not match by phone or name
- **WHEN** a Provider sign-in has resolved the Provider login organization
- **AND** Provider-specific external identity matching does not find a user
- **AND** the Application Provider binding has no explicit `bindingRule`
- **AND** the upstream Provider phone or username matches an existing user but email is empty, different, or absent
- **THEN** Admin MUST NOT bind or sign in as that existing user by phone or username

#### Scenario: Blank field values are ignored
- **WHEN** Provider fallback binding evaluates a configured or default binding rule
- **AND** the upstream Provider value for that rule is empty after trimming whitespace
- **THEN** Admin MUST skip that rule
- **AND** Admin MUST NOT query for an existing user using an empty email, phone, or username value

#### Scenario: Explicit binding rules remain available
- **WHEN** an Application Provider binding explicitly configures `bindingRule`
- **THEN** Admin MUST evaluate the configured non-empty field rules in configured order
- **AND** Admin MUST continue to allow explicit `Phone` and `Name` rules without adding them to the unconfigured default rule set

### Requirement: Provider binding UI shows effective default binding rule
Admin SHALL show the effective runtime default binding rule in the Application Provider binding UI when `bindingRule` is not configured.

#### Scenario: Binding rule is unconfigured
- **WHEN** an administrator edits an Application Provider binding
- **AND** `bindingRule` is missing or unset
- **THEN** the UI MUST show that runtime fallback matching defaults to email
- **AND** saving the Application MUST NOT persist `Email` solely because this default hint was displayed

#### Scenario: Binding rule is explicitly configured
- **WHEN** an administrator edits an Application Provider binding
- **AND** `bindingRule` contains one or more explicit rules
- **THEN** the UI MUST show the configured rules as the effective matching rules
- **AND** the UI MUST NOT describe phone or username as part of the unconfigured runtime default
