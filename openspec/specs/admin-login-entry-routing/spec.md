# admin-login-entry-routing Specification

## Purpose
定义认证中心后台默认登录入口、显式组织登录入口和显式授权入口之间的路由边界，避免后台管理入口被浏览器记住的业务组织默认应用重定向覆盖。
## Requirements
### Requirement: 后台管理入口未登录时必须固定进入内置登录页
认证中心后台管理路由在用户未登录时 SHALL 固定跳转到 `/login`，不得使用浏览器记住的上次登录组织决定默认登录应用。

#### Scenario: 访问后台首页
- **WHEN** 未登录用户访问后台首页 `/`
- **THEN** 系统必须跳转到 `/login`
- **AND** 不得跳转到 `/login/<lastLoginOrg>`

#### Scenario: 访问受保护后台页面
- **WHEN** 未登录用户访问 `/applications`、`/wecom-org-sync` 或其他后台管理页面
- **THEN** 系统必须跳转到 `/login`
- **AND** `localStorage.lastLoginOrg` 不得改变该跳转目标

### Requirement: 显式组织登录入口必须继续可用
系统 SHALL 保留 `/login/:owner` 的显式组织登录语义，让用户在明确指定组织时进入该组织的默认应用登录页。

#### Scenario: 直接访问组织登录页
- **WHEN** 用户直接访问 `/login/wecom-wwe7e01c69367e67bf`
- **THEN** 系统必须按组织 `wecom-wwe7e01c69367e67bf` 获取默认应用
- **AND** 页面必须使用该默认应用的登录配置渲染

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
