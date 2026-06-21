## ADDED Requirements

### Requirement: 应用接入中心必须提供服务凭据治理配置入口

应用接入中心 SHALL provide a compact service credential governance configuration entry within the existing `/applications` context so global administrators can review and save sanitized Admin-owned credential reference and owner classification metadata without leaving Application Access.

#### Scenario: 管理员查看配置入口

- **WHEN** a global administrator opens `/applications`
- **THEN** the Application Access area SHALL request `GET /api/application-access/service-credential-governance-config`
- **AND** it SHALL show provider trust, usage identity resolver, Gateway organization projection and keep-in-env groups with enabled state, owner hint, reference status, caller policy, source class and next action
- **AND** it SHALL remain in the existing Application Access context without creating a new top-level center or changing Application table operations

#### Scenario: 管理员保存 copy-safe 配置并回读

- **WHEN** a global administrator edits service credential governance metadata and clicks save
- **THEN** the UI SHALL submit only copy-safe fields to `POST /api/application-access/service-credential-governance-config`
- **AND** it SHALL show submitting, success and error states
- **AND** after success it SHALL render the sanitized response returned by the server instead of echoing unsaved form values

#### Scenario: 配置入口覆盖不可写和外部化状态

- **WHEN** a group is `keep_in_env`, `external_secret_system`, disabled or reference-only
- **THEN** the UI SHALL show that the credential value remains in env/config or external secret owner context
- **AND** it SHALL not provide a raw secret textbox, token reveal action, private URL reveal action or credential test action
- **AND** it SHALL keep the Application list, add, edit, copy, delete, Provider, API mapping and audit links available

#### Scenario: UI 不展示敏感值

- **WHEN** service credential governance config is rendered, saved or fails validation
- **THEN** the UI SHALL render only sanitized group labels, status, key names, reference keys, owner hints, caller policy, bounded runtime policy and remediation labels
- **AND** it MUST NOT display token values, Authorization headers, Cookies, DSNs, client secrets, private keys, complete private URLs, raw provider responses, raw downstream responses, raw ids, real accounts or complete organization trees

#### Scenario: 配置入口覆盖加载、错误和空状态

- **WHEN** the config request is loading, fails, is forbidden or returns no groups
- **THEN** the UI SHALL show a compact loading, unavailable or empty state
- **AND** Application Access primary actions SHALL remain available
- **AND** the UI SHALL NOT trigger credential writes, credential verification, login, OIDC callback, WeCom sync or Gateway projection publish while rendering these states
