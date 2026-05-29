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
OAuth、SAML 和 CAS 等显式授权入口 SHALL 继续按 URL 参数或路径解析目标应用，不得被后台默认登录重定向改写为 `/login`。

#### Scenario: OAuth 授权登录
- **WHEN** 用户访问 `/login/oauth/authorize?client_id=aicodex-insight&...`
- **THEN** 系统必须按 `client_id` 获取目标应用
- **AND** 不得因为后台默认登录规则而改为使用内置后台应用
