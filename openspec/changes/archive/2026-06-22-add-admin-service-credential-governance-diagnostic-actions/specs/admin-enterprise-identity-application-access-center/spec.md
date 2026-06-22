## ADDED Requirements

### Requirement: 应用接入中心必须提供服务凭据治理诊断预检

应用接入中心 SHALL provide a scoped service credential governance diagnostic action within the existing `/applications` service credential governance configuration entry so administrators can evaluate copy-safe draft or saved Admin-owned service credential governance metadata before or after saving.

#### Scenario: 管理员对治理配置执行诊断预检

- **WHEN** a global administrator opens `/applications`
- **AND** the service credential governance config entry has loaded draft or saved groups
- **THEN** the UI SHALL provide a diagnostic action scoped to service credential governance config
- **AND** clicking it SHALL submit only copy-safe governance fields to `POST /api/application-access/service-credential-governance-diagnostics`
- **AND** the response SHALL show each group status, stable alias, owner hint, source class, credential reference status, caller policy presence, keep-in-env boundary, cannot-infer flag and next action

#### Scenario: 诊断预检不执行真实下游动作

- **WHEN** Admin handles a service credential governance diagnostic request
- **THEN** Admin SHALL NOT trigger resolver outbound calls, Gateway publish or refresh, API/Gateway/Insight writes, credential value reveal, authentication callbacks, provider login, WeCom sync, DB fixture writes or runtime secret resolution
- **AND** Admin SHALL evaluate only submitted copy-safe metadata and stable policy fields

#### Scenario: 诊断预检 fail closed

- **WHEN** a diagnostic request contains disabled groups, missing caller policy, missing credential reference, unresolved external reference, `keepInEnv`, `env_config`, unsupported group, unsupported source class or raw sensitive material
- **THEN** Admin SHALL return a blocked, disabled, missing-reference, keep-in-env or cannot-infer diagnostic state with a stable alias and next action
- **AND** Admin SHALL NOT echo token values, Authorization headers, Cookies, DSNs, client secrets, private keys, complete private URLs, raw provider responses, raw downstream responses, raw ids, real accounts or complete organization trees

#### Scenario: 诊断预检错误态不影响应用接入

- **WHEN** the diagnostic request fails, is forbidden or returns no groups
- **THEN** the UI SHALL show a compact unavailable or empty state for the diagnostic action
- **AND** the Application list, add, edit, copy, delete, Provider, API mapping, audit links and config save action SHALL remain available
