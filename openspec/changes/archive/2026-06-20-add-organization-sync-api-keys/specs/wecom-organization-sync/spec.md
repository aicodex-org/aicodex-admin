## ADDED Requirements

### Requirement: WeCom sync credentials MAY use organization sync API Keys
The system SHALL support organization sync API Keys as the stable credential for downstream gateway organization mirror synchronization, instead of requiring ordinary user OAuth access tokens.

#### Scenario: Gateway sync uses dedicated organization credential
- **WHEN** a gateway organization mirror synchronization needs to pull a WeCom-backed business organization's structure from the authentication center
- **THEN** administrators can provide an organization sync API Key bound to that business organization
- **AND** the synchronization does not depend on a browser session or a user OAuth access token lifetime

#### Scenario: Existing access token behavior remains available
- **WHEN** a caller continues using an ordinary valid OAuth access token on existing organization APIs
- **THEN** the existing authentication and authorization behavior remains unchanged
