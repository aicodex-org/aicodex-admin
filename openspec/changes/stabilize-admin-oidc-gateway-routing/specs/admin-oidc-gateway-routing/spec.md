## ADDED Requirements

### Requirement: Admin OIDC gateway routing SHALL expose authentication center endpoints on ai.leagsoft.com
The authentication center deployment SHALL route the OIDC and login paths required by `aicodex-api` product-level admin login through `https://ai.leagsoft.com` when gateway forwarding mode is used.

#### Scenario: Discovery and JWKS use the gateway Host
- **WHEN** an operator requests `https://ai.leagsoft.com/.well-known/openid-configuration`
- **THEN** the response MUST be authentication center JSON
- **AND** the `issuer`, `token_endpoint`, `userinfo_endpoint`, and `jwks_uri` MUST use the `https://ai.leagsoft.com` external boundary
- **AND** the response MUST NOT be the AICodex gateway SPA HTML

#### Scenario: Authorization and login page dependencies are served by auth center
- **WHEN** a browser opens `https://ai.leagsoft.com/login/oauth/authorize`
- **THEN** the route MUST be served by the authentication center authorization/login UI
- **AND** required frontend routes, static assets, callback pages, and configured login method APIs MUST be available through the same gateway host

#### Scenario: Token and UserInfo APIs are not handled by the model gateway
- **WHEN** `aicodex-api` exchanges an authorization code at `https://ai.leagsoft.com/api/login/oauth/access_token`
- **THEN** the request MUST reach the authentication center Token Endpoint
- **AND** `https://ai.leagsoft.com/api/userinfo` MUST reach the authentication center UserInfo Endpoint
- **AND** neither endpoint MUST return AICodex gateway API errors such as `Invalid URL`

#### Scenario: Rollback keeps direct auth-domain mode available
- **WHEN** gateway forwarding mode cannot be deployed safely
- **THEN** operators MAY disable the `aicodex-admin` provider in `aicodex-api`
- **OR** configure the provider consistently against `https://auth.leagsoft.com` while keeping `redirect_uri=https://ai.leagsoft.com/oauth/aicodex-admin`
