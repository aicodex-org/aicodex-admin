## MODIFIED Requirements

### Requirement: 显式授权入口不得受后台默认登录修复影响
OAuth、OIDC、SAML 和 CAS 等显式授权入口 SHALL 继续按授权请求契约解析目标 application 和目标 organization，不得被后台默认登录重定向改写为 `/login`，也不得在 organization 缺失、歧义或越权时继续登录。

#### Scenario: organization-bound OAuth 授权登录
- **WHEN** 用户访问携带某个 organization-bound `client_id` 的 `/login/oauth/authorize?...`
- **THEN** 系统 MUST 按 `client_id` 获取目标 application
- **AND** 系统 MUST 使用该 application 绑定的 platform `organizationId` 作为登录上下文
- **AND** 系统 MUST NOT 因后台默认登录规则而改为使用内置后台应用或其他 organization

#### Scenario: shared application OAuth 授权登录
- **WHEN** 用户访问携带某个 shared application `client_id` 和显式 `organization` 参数的 `/login/oauth/authorize?...`
- **THEN** 系统 MUST 按 `client_id` 获取目标 shared application
- **AND** 系统 MUST 校验请求中的 target organization 在该 application 显式 allowed organization policy 内
- **AND** 系统 MUST 使用该 target organization 的登录上下文继续授权流程

#### Scenario: shared application 缺少 organization 时拒绝登录
- **WHEN** 用户访问携带某个 shared application `client_id` 但未携带 `organization` 参数的 `/login/oauth/authorize?...`
- **AND** 该 `client_id` 归属于 shared application
- **THEN** 系统 MUST 拒绝继续登录流程
- **AND** 系统 MUST NOT 改写为 `/login`
- **AND** 系统 MUST NOT 回退到最近登录 organization、默认 organization 或内置 organization

#### Scenario: shared application 目标 organization 越权时拒绝登录
- **WHEN** 用户访问携带某个 shared application `client_id` 和显式 `organization` 参数的 `/login/oauth/authorize?...`
- **AND** 请求中的 target organization 不在 shared application 显式 allowed organization policy 内，或 organization 状态不可用
- **THEN** 系统 MUST 拒绝继续登录流程
- **AND** 系统 MUST 记录脱敏审计事件
