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

Admin SHALL expose the read-only sanitized runtime status needed by `Insight Admin Provider` handoff through the new handoff endpoint, so operators can distinguish configured, missing, partial, blocked and not-applicable states without seeing reusable credential values.

#### Scenario: 管理员读取运行态治理状态

- **WHEN** an authorized administrator calls `GET /api/insight-admin-provider/handoff/status`
- **THEN** the response SHALL include `generatedAt`, `source=admin_runtime_config` and `groups[]`
- **AND** `groups[]` SHALL include stable keys `insight_provider_trust`, `usage_identity_resolver`, `gateway_organization_projection` and `keep_in_env`
- **AND** each group SHALL include `key`, `label`, `owner`, `status`, `configuredKeys`, `missingKeys`, `credentialReferenceStatus`, `callerPolicy`, `boundedRuntimePolicy`, `keepInEnvKeys`, `blockedReasons` and `remediationRoute` when applicable
- **AND** `status` SHALL be one of `configured`, `missing`, `partial`, `blocked` or `not_applicable`

### Requirement: Admin 必须提供服务凭据治理配置入口

Admin SHALL expose a global-admin-only copy-safe metadata contract for `Insight Admin Provider` handoff so operators can read, save and read back provider trust, credential reference and owner classification metadata without exposing reusable credentials.

#### Scenario: 管理员读取交接配置

- **WHEN** an authorized global administrator calls `GET /api/insight-admin-provider/handoff/config`
- **THEN** Admin SHALL return `source=admin_service_credential_governance_config` and `groups[]`
- **AND** `groups[]` SHALL include stable keys for `insight_provider_trust`, `usage_identity_resolver`, `gateway_organization_projection` and `keep_in_env`
- **AND** each group SHALL expose only copy-safe fields such as `enabled`, `owner`, `sourceClass`, `credentialReferenceStatus`, `credentialReferenceKey`, `callerPolicy`, `boundedRuntimePolicy`, `remediationRoute`, `nextAction`, `blockedReasons` and `keepInEnvKeys`

#### Scenario: 管理员保存 copy-safe 交接配置并回读脱敏摘要

- **WHEN** an authorized global administrator posts copy-safe `groups[]` to `POST /api/insight-admin-provider/handoff/config`
- **THEN** Admin SHALL validate the group keys and allowed fields before saving
- **AND** Admin SHALL persist only Admin-owned provider trust policy metadata, outbound service credential reference metadata, bounded runtime policy and keep-in-env classification
- **AND** Admin SHALL return the saved configuration using the same sanitized response shape
- **AND** a subsequent `GET /api/insight-admin-provider/handoff/config` SHALL read back the saved sanitized metadata

### Requirement: 服务凭据治理状态必须保持配置入口兼容

Admin SHALL keep the response shape compatible through `GET /api/insight-admin-provider/handoff/status` while allowing the status summary to consume sanitized handoff configuration metadata.

#### Scenario: 状态响应保持字段稳定

- **WHEN** an authorized administrator calls `GET /api/insight-admin-provider/handoff/status` after configuration metadata has been saved
- **THEN** the response SHALL still include `generatedAt`, `source=admin_runtime_config` and `groups[]`
- **AND** existing group fields and stable group keys SHALL remain compatible
- **AND** Admin MAY enrich owner hint, `credentialReferenceStatus`, `remediationRoute` or `blockedReasons` from saved metadata only if the response remains sanitized

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

### Requirement: Admin 必须消费服务凭据治理 saved runtime policy

Admin SHALL apply saved copy-safe service credential governance configuration as a runtime policy gate for `usage_identity_resolver` and `gateway_organization_projection` while preserving legacy env/config compatibility only when no saved configuration exists or when saved policy explicitly allows env/config.

#### Scenario: 无 saved config 时保持 legacy env/config fallback

- **WHEN** Admin evaluates `usage_identity_resolver` or `gateway_organization_projection`
- **AND** no saved service credential governance config exists
- **THEN** Admin SHALL keep the existing legacy env/config runtime behavior for endpoint, token, caller and bounded policy
- **AND** Admin MUST NOT require operators to save a governance config before existing deployments continue working

#### Scenario: saved disabled 分组 fail closed 且不回落 legacy

- **WHEN** a saved service credential governance config exists
- **AND** the `usage_identity_resolver` or `gateway_organization_projection` group has `enabled=false`
- **THEN** Admin MUST disable the corresponding runtime path or mark it unavailable before external calls are attempted
- **AND** Admin MUST NOT fall back to legacy env/config endpoint, token or caller even if those keys are configured
- **AND** status or diagnostics SHALL expose a stable blocker alias such as `admin_service_credential_group_disabled`

#### Scenario: saved env_config 或 keepInEnv 允许 legacy secret 但应用 bounded policy

- **WHEN** a saved service credential governance config exists
- **AND** the target group has `enabled=true`
- **AND** the target group has `sourceClass=env_config` or `keepInEnv=true`
- **THEN** Admin MAY read the corresponding legacy env/config endpoint and token
- **AND** Admin SHALL apply saved `callerPolicy` and copy-safe `boundedRuntimePolicy` values such as timeout, max-items, retry or freshness limits to the runtime config
- **AND** Admin MUST keep existing normalization and upper/lower bound handling for those numeric runtime limits

#### Scenario: saved external/admin reference 未解析时 fail closed

- **WHEN** a saved service credential governance config exists
- **AND** the target group has `enabled=true`
- **AND** the target group has `sourceClass=external_secret_system` or `sourceClass=admin_config`
- **AND** Admin has no resolver that can turn `credentialReferenceKey` into an actual service credential
- **THEN** Admin MUST fail closed with a stable blocker alias such as `admin_service_credential_reference_unresolved`
- **AND** Admin MUST NOT fall back to legacy env/config endpoint, token or caller
- **AND** Admin MUST NOT treat `credentialReferenceKey` as a URL, token or reusable credential value

#### Scenario: saved enabled 分组缺少必要 copy-safe metadata 时 fail closed

- **WHEN** a saved service credential governance config exists
- **AND** the target group has `enabled=true`
- **AND** the target group is missing required copy-safe metadata such as credential reference, caller policy or bounded runtime policy
- **THEN** Admin MUST fail closed before external resolver or Gateway projection calls are attempted
- **AND** status or diagnostics SHALL expose stable blocker aliases for the missing metadata
- **AND** Admin MUST NOT output token values, Authorization headers, Cookies, DSNs, client secrets, complete private URLs, raw payloads, raw ids, real accounts or complete organization trees

#### Scenario: Usage identity resolver live provider path 使用 saved runtime gate

- **WHEN** Insight provider resolves usage identity for `current-user` or scope mapping
- **AND** local confirmed admin-to-api mapping is missing
- **AND** a safe resolver item can be built from stable admin/source/wecom identifiers
- **THEN** Admin SHALL evaluate the `usage_identity_resolver` saved runtime policy before any outbound resolver call
- **AND** saved disabled, unresolved reference, invalid policy, scope mismatch or caller mismatch MUST fail closed before outbound and MUST NOT fall back to legacy env/config
- **AND** saved `env_config` or `keepInEnv=true` MAY use legacy endpoint/token only while applying saved caller policy and bounded runtime policy
- **AND** Admin MUST NOT output token values, Authorization headers, complete private URLs, raw resolver payloads, raw ids, real accounts or complete organization trees

#### Scenario: Usage identity resolver 保持本地 confirmed mapping 优先

- **WHEN** Insight provider resolves usage identity for a user with a valid local confirmed admin-to-api mapping
- **THEN** Admin SHALL return the local mapping without calling the usage identity resolver
- **AND** Admin SHALL keep existing mapping source and source identity enrichment behavior

#### Scenario: Gateway projection 所有最小运行路径使用同一 gated publisher config

- **WHEN** Admin evaluates Gateway projection manual publish, scheduled refresh, run readiness, ingestion status or observability
- **THEN** Admin SHALL derive publisher readiness from the same saved runtime policy gate used by `gateway_organization_projection`
- **AND** disabled or unresolved saved policy MUST prevent those paths from using legacy Gateway projection endpoint/token/caller
- **AND** the resulting diagnostics SHALL remain copy-safe and MAY expose only key names, stable blocker aliases, caller policy and bounded numeric/boolean policy

### Requirement: Admin 必须生成服务凭据治理交接包

Admin SHALL 为 Insight consumer 构建只包含 copy-safe metadata 的 service credential governance handoff package，并且 SHALL 将 runtime credential truth 和 credential binding 保持在 Admin package 之外。

#### Scenario: 缺凭据引用时默认指向 Insight 绑定

- **GIVEN** resolver 或 Gateway projection credential reference status 为 missing
- **WHEN** Admin 构建 copy-safe handoff package
- **THEN** package SHALL 保持 `bindingMode=manual_or_secret_ref`
- **AND** 默认可操作 next action SHALL 指向 Insight 侧 Profile credential binding
- **AND** `keepInEnv` 出现时 SHALL 只表示 fallback 或兼容证据
- **AND** Admin SHALL NOT 输出 secure handoff grant、grant id、nonce、target registration id、expiry、raw secret、token、Authorization header、Cookie、client secret、完整私有 URL、raw payload、raw id、真实账号或完整组织树

### Requirement: 旧 Application Access service-credential-governance API 必须下线

Admin SHALL reject legacy `/api/application-access/service-credential-governance-*` paths so new consumers do not keep using the old Application Access service credential governance surface.

#### Scenario: 旧状态接口被拒绝

- **WHEN** an authorized or unauthenticated caller requests `GET /api/application-access/service-credential-governance-status`
- **THEN** Admin SHALL return a stable error that names the endpoint as deprecated
- **AND** the response SHALL direct callers to `GET /api/insight-admin-provider/handoff/status`
- **AND** the response SHALL NOT include token, Cookie, Authorization, client secret, DSN, raw payload, full private URL, real account or complete organization tree material

#### Scenario: 旧配置与诊断接口被拒绝

- **WHEN** a caller requests `GET /api/application-access/service-credential-governance-config`, `POST /api/application-access/service-credential-governance-config` or `POST /api/application-access/service-credential-governance-diagnostics`
- **THEN** Admin SHALL return a stable error that names the endpoint as deprecated
- **AND** the response SHALL direct callers to the matching `/api/insight-admin-provider/handoff/*` endpoint
- **AND** Admin SHALL NOT save config, run diagnostics, parse secrets, call providers, trigger resolver calls, publish Gateway projection or write external owner truth through the legacy path
