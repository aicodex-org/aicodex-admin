## Why

认证中心后台入口是管理员进入 `aicodex-admin` 的固定入口，但当前未登录访问后台页面时会读取浏览器 `lastLoginOrg`，可能把管理员重定向到企业微信业务组织的默认应用登录页。企业微信组织同步创建的 `app-wecom-*` 应用主要用于同步用户的应用上下文，不应改变后台管理入口的默认登录行为。

## What Changes

- 后台管理入口和受保护后台页面在未登录时固定跳转到 `/login`。
- 不再让 `lastLoginOrg` 影响后台管理入口的未登录重定向。
- 显式访问 `/login/:owner` 时仍进入指定组织的默认应用登录页。
- OAuth、SAML、CAS 等显式授权入口继续按原有参数解析目标应用，不受本次变更影响。

## Capabilities

### New Capabilities
- `admin-login-entry-routing`: 定义认证中心后台入口、组织登录入口和 OAuth 授权入口之间的默认路由边界。

### Modified Capabilities

## Impact

- 主要影响 `web-admin/src/ManagementPage.js` 中后台未登录重定向逻辑。
- 影响管理员直接访问 `/`、`/applications`、`/wecom-org-sync` 等后台路由时的登录入口。
- 不引入数据库迁移、后端 API 变更或新的外部依赖。
