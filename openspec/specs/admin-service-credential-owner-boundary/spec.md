# admin-service-credential-owner-boundary Specification

## Purpose
定义 Admin 对身份应用、provider trust 白名单、outbound 服务间凭据引用、keep-in-env 配置和跨服务 truth owner 的归属边界。
## Requirements
### Requirement: Admin 必须保留身份应用与 OIDC client owner 边界

Admin SHALL continue to own identity Applications, Provider bindings, OIDC clients, redirect/callback configuration, scopes, Provider target organization bindings and OIDC organization resolution policy through the existing Application / Provider / OIDC client contexts.

#### Scenario: 管理员维护身份应用和 OIDC client

- **WHEN** an administrator configures an identity Application, Provider binding, OIDC client, redirect URI, scope or Provider target organization
- **THEN** Admin SHALL use the existing Application / Provider / OIDC client owner context
- **AND** Admin SHALL preserve the existing permission, audit and field-validation boundaries for those objects

#### Scenario: 跨服务凭据治理不得接管身份应用

- **WHEN** Admin introduces service credential governance or inventory for cross-service calls
- **THEN** Admin MUST NOT create a separate cross-service credential entry that takes over identity Applications, Provider bindings or OIDC clients
- **AND** the governance surface MAY link to the existing object context only as owner evidence or remediation guidance

### Requirement: Admin 必须拥有 Insight provider trust 白名单

Admin SHALL own the provider trust allowlist used when Insight calls Admin provider endpoints. This owner context SHALL include `insightProviderAllowedAudiences`, `insightProviderAllowedIssuers` and `insightProviderRequiredScopes`.

#### Scenario: Insight provider trust 使用 Admin 白名单

- **WHEN** Insight calls an Admin provider endpoint with a service token
- **THEN** Admin SHALL validate audience, issuer and required scope against Admin-owned provider trust allowlist configuration
- **AND** Admin SHALL fail closed when the trust policy is missing, mismatched or not diagnosable

#### Scenario: 白名单管理不暴露凭据

- **WHEN** an Admin UI, runbook or diagnostic surface shows provider trust policy
- **THEN** it MAY show allowed audience, issuer and scope names plus sanitized status
- **AND** it MUST NOT show bearer tokens, cookies, client secrets, raw Authorization headers or reusable credential values

### Requirement: Admin 必须拥有 outbound 服务间凭据引用和调用策略

Admin SHALL own outbound service credential references and call policy for Admin-to-API/Gateway calls that Admin initiates as a producer or provider. This owner context SHALL include `insightUsageIdentityResolverEndpoint`, `insightUsageIdentityResolverToken`, `insightUsageIdentityResolverCaller`, `insightUsageIdentityResolverMaxItems`, `insightUsageIdentityResolverTimeoutMs`, `gatewayOrganizationProjectionEndpoint`, `gatewayOrganizationProjectionStatusEndpoint`, `gatewayOrganizationProjectionToken`, `gatewayOrganizationProjectionCaller`, `gatewayOrganizationProjectionTimeoutMs`, `gatewayOrganizationProjectionFreshnessTTLSeconds`, `gatewayOrganizationProjectionMaxRetries`, `gatewayOrganizationProjectionRefreshEnabled`, `gatewayOrganizationProjectionRefreshIntervalSeconds`, `gatewayOrganizationProjectionRefreshInitialDelaySeconds` and `gatewayOrganizationProjectionRefreshBatchSize`.

#### Scenario: Admin 通过 usage identity resolver 解析用量身份

- **WHEN** Admin provider needs to resolve usage identity through the API/Gateway resolver
- **THEN** Admin SHALL use Admin-owned resolver endpoint, credential reference, caller, max-items and timeout policy
- **AND** Admin MUST NOT require Insight to perform the identity mapping or use Insight consumer data as a fallback owner

#### Scenario: Admin 推送 Gateway organization projection

- **WHEN** Admin publishes or refreshes Gateway organization projection
- **THEN** Admin SHALL use Admin-owned Gateway projection endpoint, status endpoint, credential reference, caller, timeout, retry, batch, refresh and freshness policy
- **AND** Admin MUST use service-to-service authentication rather than browser session, user Cookie, ordinary Gateway user token or Insight provider token

#### Scenario: 服务间凭据 surface 只展示引用和状态

- **WHEN** Admin surfaces outbound service credential governance in UI, diagnostics, runbooks or reports
- **THEN** Admin SHALL expose only key names, credential references, sanitized configured/missing status, caller policy and bounded runtime policy
- **AND** Admin MUST NOT expose token values, complete private endpoints, raw downstream responses or reusable authorization material

### Requirement: Admin 不得拥有 API/Gateway 或 Insight consumer truth

Admin SHALL NOT own API/Gateway usage facts, Gateway resource authorization facts, Gateway runtime allow/deny decisions, Insight report consumer truth or Insight runtime provider diagnostics.

#### Scenario: Admin projection diagnostics 不写 Gateway 授权事实

- **WHEN** Admin produces projection readiness, publish, refresh, receipt or retry diagnostics
- **THEN** Admin SHALL keep the evidence scoped to Admin producer state and downstream owner receipt/status when available
- **AND** Admin MUST NOT create, update, delete or infer Gateway resource authorization facts from those diagnostics

#### Scenario: Insight consumer 不从 Admin 诊断补算 truth

- **WHEN** Insight consumes Admin provider or projection diagnostics
- **THEN** Insight MUST NOT locally compute usage facts, authorization facts, Gateway projection truth or runtime allow/deny decisions from Admin diagnostics
- **AND** unresolved API/Gateway/Insight facts SHALL remain with their owning service or provider contract

### Requirement: 启动级和根密钥配置必须保留在 env/config 边界

Admin UI/runtime SHALL keep bootstrap and root-level configuration in env/config, deployment systems or external secret systems rather than treating them as ordinary business service credential records.

#### Scenario: keep-in-env 配置保持外部化

- **WHEN** configuration governance inventories Admin settings
- **THEN** DB, Redis, listening ports, TLS/certificates, bootstrap, KMS/Vault bootstrap, RADIUS/LDAP server secrets, break-glass/recovery, build tokens and translation tokens SHALL remain classified as keep-in-env or external-secret-system owned
- **AND** Admin MUST NOT move those settings into identity Application, provider trust or outbound service credential UI by default

#### Scenario: 业务凭据治理不接管 root secret

- **WHEN** Admin adds UI or runbook guidance for service credential owner boundaries
- **THEN** it SHALL distinguish outbound service credential references from root secrets and deployment bootstrap values
- **AND** it SHALL direct operators to the configured env/config or external secret system for root-secret rotation and recovery

### Requirement: Owner-boundary 盘点和验证记录必须脱敏

Admin owner-boundary artifacts, runbooks and verification records SHALL record only key names, owner classification, sanitized status and validation commands.

#### Scenario: 记录只读盘点证据

- **WHEN** this capability records inventory evidence
- **THEN** the evidence MAY include file paths, config key names and owner categories
- **AND** the evidence MUST NOT include token values, cookies, DSNs, client secrets, private keys, complete private URLs, real accounts, complete organization trees, raw payloads or complete downstream responses

#### Scenario: 验证结论不外推运行态成功

- **WHEN** validation only runs OpenSpec and document checks
- **THEN** the verification record SHALL state that code tests and coverage are N/A because no production code changed
- **AND** it MUST NOT claim runtime credential rotation, provider trust enforcement, Gateway ingestion, Insight reports or end-to-end authorization success

### Requirement: Admin 必须维护运行态服务凭据配置迁移分类

Admin SHALL maintain a sanitized migration classification for runtime service credential, identity provider trust and cross-service configuration keys before moving those settings from env/config or deployment examples into any UI owner context.

#### Scenario: 盘点记录只包含安全 key 和 owner 分类

- **WHEN** Admin inventories `.env`, `config.yaml`, deploy examples, runtime settings, OpenSpec or UI/operator documentation for runtime service credential governance
- **THEN** the inventory SHALL record only key names or safe patterns, current source type, target owner, migration bucket, compatibility rule, validation path, risk and blocker
- **AND** the inventory MUST NOT record token values, Cookies, DSNs, client secrets, private keys, complete private URLs, raw payloads, real accounts, complete organization trees or complete downstream responses

#### Scenario: 启动级配置继续留在 env/config

- **WHEN** the inventory sees database, Redis, port, image, mounted directory, TLS/certificate, KMS/Vault bootstrap, build token, translation token, recovery or break-glass settings
- **THEN** Admin SHALL classify those keys as `keep in env/config` or external-secret-system owned
- **AND** Admin UI or diagnostics MAY show only sanitized configured/missing status or a runbook link
- **AND** Admin MUST NOT treat those root or bootstrap settings as ordinary service credential business records

#### Scenario: Admin-owned provider trust 和 outbound 调用策略进入 Admin owner context

- **WHEN** the inventory sees Admin provider trust allowlist keys such as `insightProviderAllowedAudiences`, `insightProviderAllowedIssuers` or `insightProviderRequiredScopes`
- **THEN** Admin SHALL classify them as `move to Admin UI` or existing Admin provider trust owner context
- **AND** Admin SHALL fail closed when trust policy is missing, mismatched or not diagnosable
- **WHEN** the inventory sees Admin outbound call policy or credential reference keys such as `insightUsageIdentityResolverEndpoint`, `insightUsageIdentityResolverToken`, `insightUsageIdentityResolverCaller`, `insightUsageIdentityResolverMaxItems`, `insightUsageIdentityResolverTimeoutMs`, `gatewayOrganizationProjectionEndpoint`, `gatewayOrganizationProjectionStatusEndpoint`, `gatewayOrganizationProjectionToken`, `gatewayOrganizationProjectionCaller`, `gatewayOrganizationProjectionTimeoutMs`, `gatewayOrganizationProjectionFreshnessTTLSeconds`, `gatewayOrganizationProjectionMaxRetries`, `gatewayOrganizationProjectionRefreshEnabled`, `gatewayOrganizationProjectionRefreshIntervalSeconds`, `gatewayOrganizationProjectionRefreshInitialDelaySeconds` or `gatewayOrganizationProjectionRefreshBatchSize`
- **THEN** Admin SHALL classify them as `move to Admin UI` or existing Admin outbound service credential owner context
- **AND** Admin SHALL expose only credential references, key names, sanitized configured/missing status, caller policy and bounded runtime policy rather than reusable credential values

#### Scenario: API/Gateway-owned settings route to API UI

- **WHEN** the inventory sees API/Gateway provider credentials, Gateway authorization or usage provider facts, provider runtime diagnostics, contract/metric/path metadata, handoff package or credential lifecycle/audit settings
- **THEN** Admin SHALL classify those settings as `move to API UI`
- **AND** Admin MAY retain only Admin-owned references, producer attempt evidence, sanitized owner receipt/status and remediation guidance
- **AND** Admin MUST NOT create, update, delete or infer API/Gateway authorization facts from Admin diagnostics or migration inventory

#### Scenario: Insight-owned consumer settings route to Insight UI

- **WHEN** the inventory sees Insight consumer-side business service access settings, provider alias, provider base URL/reference, doctor/dry-run/save/rollback controls or export limits
- **THEN** Admin SHALL classify those settings as `move to Insight UI`
- **AND** Insight MUST NOT generate API/Gateway tokens, recompute Admin organization truth, recompute Gateway authorization facts or use Admin diagnostics as consumer fallback truth

#### Scenario: 重叠 active change 或 owner 未决项必须 deferred

- **WHEN** a key or migration surface overlaps active auth-center, OIDC, WeCom/login or LLM AI/Gateway TypeScript migration work, or when the runtime owner contract is unclear
- **THEN** Admin SHALL classify the item as `defer/blocked`
- **AND** the unblock condition SHALL name the owning active change, owner decision or runtime contract needed before migration
- **AND** Admin MUST NOT take over that write set through the service credential migration inventory

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

### Requirement: Admin 必须提供服务凭据治理配置入口

Admin SHALL expose a global-admin-only configuration contract for Admin-owned service credential governance so operators can read, save and read back copy-safe provider trust, credential reference and owner classification metadata without exposing reusable credentials.

#### Scenario: 管理员读取服务凭据治理配置

- **WHEN** an authorized global administrator calls `GET /api/application-access/service-credential-governance-config`
- **THEN** Admin SHALL return `source=admin_service_credential_governance_config` and `groups[]`
- **AND** `groups[]` SHALL include stable keys for `insight_provider_trust`, `usage_identity_resolver`, `gateway_organization_projection` and `keep_in_env`
- **AND** each group SHALL expose only copy-safe fields such as `enabled`, `owner`, `sourceClass`, `credentialReferenceStatus`, `credentialReferenceKey`, `callerPolicy`, `boundedRuntimePolicy`, `remediationRoute`, `nextAction`, `blockedReasons` and `keepInEnvKeys`

#### Scenario: 管理员保存服务凭据治理配置并回读脱敏摘要

- **WHEN** an authorized global administrator posts copy-safe `groups[]` to `POST /api/application-access/service-credential-governance-config`
- **THEN** Admin SHALL validate the group keys and allowed fields before saving
- **AND** Admin SHALL persist only Admin-owned provider trust policy metadata, outbound service credential reference metadata, bounded runtime policy and keep-in-env classification
- **AND** Admin SHALL return the saved configuration using the same sanitized response shape
- **AND** a subsequent `GET /api/application-access/service-credential-governance-config` SHALL read back the saved sanitized metadata

#### Scenario: 配置入口拒绝敏感值和未知字段

- **WHEN** a request contains raw secret-like fields or values such as token values, `Authorization`, `Cookie`, DSN, `clientSecret`, private key, complete private URL, raw id or raw payload
- **THEN** Admin MUST reject the request without saving partial data
- **AND** the response, logs and validation record MUST NOT echo the sensitive value
- **AND** Admin SHALL fail closed for malformed JSON, unknown group keys or unsupported status values

#### Scenario: 服务凭据配置入口只保存引用

- **WHEN** Admin records a credential for `usage_identity_resolver` or `gateway_organization_projection`
- **THEN** Admin SHALL save only a credential reference key, reference status, owner-managed/keep-in-env classification, caller policy and bounded runtime policy
- **AND** Admin MUST NOT store raw bearer tokens, client secrets, cookies, user session tokens, Gateway user tokens or Insight provider tokens through this configuration entry
- **AND** Admin MUST NOT call API/Gateway/Insight providers, rotate credentials or test connectivity as part of save/readback

### Requirement: 服务凭据治理状态必须保持配置入口兼容

Admin SHALL keep `GET /api/application-access/service-credential-governance-status` backward compatible while allowing the status summary to consume sanitized configuration metadata from the service credential governance config entry.

#### Scenario: 状态响应保持旧字段稳定

- **WHEN** an authorized administrator calls `GET /api/application-access/service-credential-governance-status` after configuration metadata has been saved
- **THEN** the response SHALL still include `generatedAt`, `source=admin_runtime_config` and `groups[]`
- **AND** existing group fields and stable group keys SHALL remain compatible
- **AND** Admin MAY enrich owner hint, `credentialReferenceStatus`, `remediationRoute` or `blockedReasons` from saved metadata only if the response remains sanitized

#### Scenario: 状态接口不执行配置写入

- **WHEN** the governance status endpoint reads saved configuration metadata
- **THEN** it SHALL remain read-only
- **AND** it SHALL NOT create, update, delete, rotate, verify or test credentials
- **AND** it SHALL NOT trigger provider requests, resolver requests, Gateway projection publish, Gateway projection refresh, login, OIDC callback, WeCom sync or external secret system writes

### Requirement: 服务凭据治理状态必须应用已保存配置 overlay

Admin SHALL apply saved copy-safe service credential governance configuration metadata to the read-only status contract while preserving legacy env/config fallback when no configuration has been saved.

#### Scenario: 无保存配置时保持 legacy fallback

- **WHEN** an authorized administrator calls `GET /api/application-access/service-credential-governance-status`
- **AND** no saved service credential governance configuration exists
- **THEN** Admin SHALL continue to derive `usage_identity_resolver` and `gateway_organization_projection` from legacy env/config
- **AND** the response SHALL keep `source=admin_runtime_config`, stable group keys and existing response fields

#### Scenario: 保存启用配置时状态优先使用 copy-safe metadata

- **WHEN** saved configuration exists for `usage_identity_resolver` or `gateway_organization_projection`
- **AND** the saved group has `enabled=true`
- **THEN** Admin SHALL prefer saved `sourceClass`, `credentialReferenceStatus`, `credentialReferenceKey`, `callerPolicy`, `boundedRuntimePolicy`, `blockedReasons`, `remediationRoute` and `nextAction` over legacy token readiness for that group
- **AND** the status response SHALL expose only safe key names, reference aliases, caller policy names, bounded numeric/boolean/string policy and stable blocked reason aliases

#### Scenario: 保存禁用配置时 fail closed

- **WHEN** saved configuration exists for `usage_identity_resolver` or `gateway_organization_projection`
- **AND** the saved group has `enabled=false`
- **THEN** Admin MUST return a non-ready status for that group
- **AND** Admin MUST NOT continue to report legacy env/config token readiness as active readiness for that group
- **AND** `blockedReasons` SHALL include a stable reason such as `admin_service_credential_config_disabled`

#### Scenario: 保存配置缺少必要引用或策略

- **WHEN** saved configuration exists and is enabled for `usage_identity_resolver` or `gateway_organization_projection`
- **AND** the saved group is missing required credential reference, caller policy or bounded runtime policy metadata
- **THEN** Admin SHALL return `blocked` or `partial` for that group
- **AND** `blockedReasons` SHALL include stable aliases for the missing reference, caller policy or bounded runtime policy
- **AND** `remediationRoute` SHALL continue to point to the existing Application Access remediation context when applicable

#### Scenario: overlay 输出保持脱敏和只读

- **WHEN** Admin applies saved configuration overlay to service credential governance status
- **THEN** Admin MUST NOT expose token values, Authorization headers, Cookies, DSNs, client secrets, private keys, complete private URLs, raw provider responses, raw downstream responses, raw ids, real accounts or complete organization trees
- **AND** Admin SHALL NOT parse external secrets, verify credentials, call API/Gateway/Insight runtime, trigger Gateway projection publish, trigger Gateway projection refresh or write external owner truth
