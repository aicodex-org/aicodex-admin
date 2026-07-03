## MODIFIED Requirements

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

### Requirement: Admin 必须生成服务凭据治理交接包

Admin SHALL generate a copy-safe `Insight Admin Provider` handoff package for Insight Profile consumers without exposing reusable credentials or claiming downstream runtime truth.

#### Scenario: 交接包包含稳定 owner-boundary 摘要

- **WHEN** Admin generates an `Insight Admin Provider` handoff package
- **THEN** the package SHALL include `schema`, `version`, `source`, `generatedAt`, `targetConsumerAlias`, `adminOwnerAlias`, `insightProfile` and `groups[]`
- **AND** `insightProfile` SHALL expose package type, target consumer alias, Admin owner alias, wrapper capability readiness, credential reference guidance, bounded runtime policy, stable aliases, blocked aliases, next action, `cannotInferRuntimeTruth` and `keepInEnv`
- **AND** each group SHALL include group key/label, status/readiness, owner hint, `sourceClass`, credential reference status, safe credential reference key summary, caller policy presence/alias, bounded runtime policy summary, `keepInEnv`, `cannotInferRuntimeTruth`, next action, stable aliases and blocked aliases when applicable

## ADDED Requirements

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
