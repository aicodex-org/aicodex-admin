## ADDED Requirements

### Requirement: 应用接入中心必须消费服务凭据治理状态

应用接入中心 SHALL consume the Admin-owned service credential governance status contract when available and show a compact read-only service credential summary within the existing `/applications` context.

#### Scenario: 管理员查看服务凭据治理摘要

- **WHEN** an administrator opens `/applications`
- **THEN** the Application Access area SHALL request `GET /api/application-access/service-credential-governance-status`
- **AND** it SHALL display group labels, sanitized statuses and remediation routes for provider trust, usage identity resolver, Gateway organization projection and keep-in-env groups
- **AND** it SHALL remain in the existing Application Access context without creating a new top-level center or changing Application table operations

#### Scenario: 摘要覆盖加载、错误和空状态

- **WHEN** the governance status request is loading, fails, is forbidden or returns no groups
- **THEN** the UI SHALL show a compact loading, error or unavailable state
- **AND** Application list, add, edit, copy, delete, Provider, API mapping and audit links SHALL remain available
- **AND** the UI SHALL NOT trigger credential writes, credential verification, login, OIDC callback, WeCom sync or Gateway projection publish

#### Scenario: UI 不展示凭据值

- **WHEN** service credential governance status is rendered in Application Access
- **THEN** the UI SHALL render only sanitized group status, key names, caller policy, bounded runtime policy and remediation labels
- **AND** it MUST NOT display token values, Authorization headers, Cookies, DSNs, client secrets, private keys, complete private URLs, raw provider responses, raw downstream responses, raw ids, real accounts or complete organization trees
