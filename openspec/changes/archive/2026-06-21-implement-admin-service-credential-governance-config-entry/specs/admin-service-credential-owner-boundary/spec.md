## ADDED Requirements

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
