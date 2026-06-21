## ADDED Requirements

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

#### Scenario: Gateway projection 所有最小运行路径使用同一 gated publisher config

- **WHEN** Admin evaluates Gateway projection manual publish, scheduled refresh, run readiness, ingestion status or observability
- **THEN** Admin SHALL derive publisher readiness from the same saved runtime policy gate used by `gateway_organization_projection`
- **AND** disabled or unresolved saved policy MUST prevent those paths from using legacy Gateway projection endpoint/token/caller
- **AND** the resulting diagnostics SHALL remain copy-safe and MAY expose only key names, stable blocker aliases, caller policy and bounded numeric/boolean policy
