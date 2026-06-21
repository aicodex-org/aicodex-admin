## ADDED Requirements

### Requirement: Admin 必须支持 Insight provider trust saved runtime policy

Admin SHALL allow `insight_provider_trust` to use an Admin-owned saved copy-safe runtime policy for provider bearer trust while preserving legacy env/config fallback when no explicit saved policy exists.

#### Scenario: 无显式 saved trust policy 时保持 legacy fallback

- **WHEN** Insight calls an Admin provider endpoint with a bearer token
- **AND** no saved `insight_provider_trust` runtime policy exists
- **THEN** Admin SHALL validate audience, issuer and required scope using legacy `insightProviderAllowedAudiences`, `insightProviderAudience`, `insightProviderAllowedIssuers` and `insightProviderRequiredScopes`
- **AND** existing default required scope behavior SHALL remain compatible

#### Scenario: saved enabled trust policy 覆盖 legacy env

- **WHEN** a saved `insight_provider_trust` runtime policy exists
- **AND** the saved group has `enabled=true`
- **THEN** Admin SHALL validate provider bearer audience, issuer and required scope using the saved policy
- **AND** Admin MUST NOT fall back to legacy env/config when the saved policy rejects the bearer token

#### Scenario: saved disabled trust policy fail closed

- **WHEN** a saved `insight_provider_trust` runtime policy exists
- **AND** the saved group has `enabled=false`
- **THEN** Admin MUST reject provider bearer access for Insight provider endpoints
- **AND** Admin MUST NOT fall back to legacy env/config even if legacy env/config is configured
- **AND** governance status SHALL include a stable blocked reason such as `insight_provider_saved_trust_policy_disabled`

#### Scenario: saved trust policy 只保存 copy-safe 字段

- **WHEN** an administrator saves `insight_provider_trust` runtime policy metadata
- **THEN** Admin SHALL allow copy-safe fields such as `allowedAudiences`, `requiredScopes`, `allowedIssuerDigests` and `issuerMode`
- **AND** Admin MUST reject bearer token values, `Authorization`, `Cookie`, `clientSecret`, private key material, DSN, raw payload, raw id, complete private URL and complete issuer URL
- **AND** Admin MUST NOT echo rejected sensitive values in response, logs or verification records

#### Scenario: governance status 输出 provider trust 脱敏摘要

- **WHEN** Admin returns `GET /api/application-access/service-credential-governance-status`
- **THEN** the `insight_provider_trust` group SHALL expose copy-safe source/count/digest/defaulted/cannotInfer metadata
- **AND** the response MUST NOT expose complete issuer URLs, token values, Cookies, DSNs, client secrets, private keys, complete private URLs, raw payloads, raw ids, real accounts or complete organization trees
