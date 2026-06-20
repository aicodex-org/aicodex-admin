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
