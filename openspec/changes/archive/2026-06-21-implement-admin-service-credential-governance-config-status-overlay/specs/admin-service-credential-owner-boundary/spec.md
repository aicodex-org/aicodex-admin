## ADDED Requirements

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
