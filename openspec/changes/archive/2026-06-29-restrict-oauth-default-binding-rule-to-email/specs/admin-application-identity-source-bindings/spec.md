## ADDED Requirements

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
