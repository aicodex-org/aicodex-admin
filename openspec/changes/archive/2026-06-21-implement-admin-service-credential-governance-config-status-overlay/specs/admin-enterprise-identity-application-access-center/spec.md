## ADDED Requirements

### Requirement: 应用接入中心必须展示服务凭据治理 overlay 状态

应用接入中心 SHALL continue to consume the service credential governance status contract and show the saved-config overlay result within the existing `/applications` context.

#### Scenario: 管理员查看已保存配置 overlay 后的状态

- **WHEN** a global administrator opens `/applications`
- **AND** Admin has saved service credential governance configuration for `usage_identity_resolver` or `gateway_organization_projection`
- **THEN** the Application Access service credential summary SHALL display the status, reference status, caller policy and remediation route returned by `GET /api/application-access/service-credential-governance-status`
- **AND** the UI SHALL NOT locally recompute legacy env/config readiness or override a server-side fail-closed disabled status

#### Scenario: UI 不展示 overlay 敏感值

- **WHEN** the Application Access service credential summary renders overlay status
- **THEN** it SHALL render only sanitized group labels, statuses, key names, reference aliases, caller policy names, bounded runtime policy and remediation labels
- **AND** it MUST NOT display token values, Authorization headers, Cookies, DSNs, client secrets, private keys, complete private URLs, raw provider responses, raw downstream responses, raw ids, real accounts or complete organization trees
- **AND** it SHALL NOT trigger credential writes, credential verification, login, OIDC callback, WeCom sync, Gateway projection publish or Gateway projection refresh while rendering status
