## ADDED Requirements

### Requirement: Admin 必须提供服务凭据治理状态脱敏契约

Admin SHALL expose a read-only sanitized runtime contract for Admin-owned service credential governance status so operators can distinguish configured, missing, partial, blocked and not-applicable states without seeing reusable credential values.

#### Scenario: 管理员读取运行态治理状态

- **WHEN** an authorized administrator calls `GET /api/application-access/service-credential-governance-status`
- **THEN** the response SHALL include `generatedAt`, `source=admin_runtime_config` and `groups[]`
- **AND** `groups[]` SHALL include stable keys `insight_provider_trust`, `usage_identity_resolver`, `gateway_organization_projection` and `keep_in_env`
- **AND** each group SHALL include `key`, `label`, `owner`, `status`, `configuredKeys`, `missingKeys`, `credentialReferenceStatus`, `callerPolicy`, `boundedRuntimePolicy`, `keepInEnvKeys`, `blockedReasons` and `remediationRoute` when applicable
- **AND** `status` SHALL be one of `configured`, `missing`, `partial`, `blocked` or `not_applicable`

#### Scenario: 契约只返回脱敏状态

- **WHEN** Admin returns service credential governance status
- **THEN** it SHALL expose only config key names, safe status aliases, caller policy names, bounded numeric/boolean runtime policy and remediation routes
- **AND** it MUST NOT expose token values, Authorization headers, Cookies, DSNs, client secrets, private keys, complete private URLs, raw provider responses, raw downstream responses, raw ids, real accounts or complete organization trees
- **AND** endpoint URL values SHALL be omitted or represented only by configured/missing status unless a future redaction helper defines a safe class

#### Scenario: Provider trust 分组 fail closed 并标记白名单缺口

- **WHEN** Admin evaluates `insight_provider_trust`
- **THEN** it SHALL read Admin-owned `insightProviderAllowedAudiences`, `insightProviderAllowedIssuers` and `insightProviderRequiredScopes`
- **AND** missing allowed audiences SHALL produce a non-configured status with a stable blocked reason
- **AND** missing allowed issuers MAY produce `partial` status if current runtime still accepts non-empty issuers, but the response SHALL include the missing key and remediation route
- **AND** default required scopes MAY be represented as bounded policy without exposing tokens

#### Scenario: Outbound resolver 和 Gateway projection 分组只展示引用状态

- **WHEN** Admin evaluates `usage_identity_resolver` or `gateway_organization_projection`
- **THEN** it SHALL classify endpoint/status endpoint/token keys as configured or missing without returning their values
- **AND** it SHALL expose caller, timeout, max-items, retry, freshness, refresh interval and batch-size policy only as bounded runtime policy
- **AND** Gateway projection disabled state SHALL be represented as `not_applicable` unless projection is enabled and required endpoint or token keys are missing
- **AND** enabled projection with missing required key SHALL return `blocked` or `partial` with stable `blockedReasons`

#### Scenario: keep-in-env 分组保持外部化

- **WHEN** Admin evaluates `keep_in_env`
- **THEN** it SHALL classify root/bootstrap settings such as DB, Redis, listening ports, TLS/certificates, KMS/Vault bootstrap, recovery, build token and translation token as env/config or external-secret-system owned
- **AND** it SHALL return safe key names or patterns only
- **AND** it MUST NOT move those settings into ordinary service credential business records

#### Scenario: 契约保持只读 owner boundary

- **WHEN** the governance status endpoint is requested
- **THEN** Admin SHALL NOT create, update, delete, rotate, verify or test credentials
- **AND** Admin SHALL NOT trigger provider requests, usage identity resolver requests, Gateway projection publish, Gateway projection refresh, login, OIDC callback, WeCom sync or remediation actions
- **AND** Admin SHALL NOT query or write API/Gateway/Insight internal truth stores
