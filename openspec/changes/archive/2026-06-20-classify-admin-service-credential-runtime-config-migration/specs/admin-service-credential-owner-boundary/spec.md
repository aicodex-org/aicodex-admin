## ADDED Requirements

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
