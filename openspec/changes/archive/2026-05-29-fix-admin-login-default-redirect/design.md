## Context

`web-admin/src/ManagementPage.js` 当前在后台页面未登录时读取 `localStorage.lastLoginOrg`，如果存在就重定向到 `/login/<lastLoginOrg>`。这对普通多组织登录有一定便利性，但对认证中心后台入口不合适：管理员访问 `/`、`/applications`、`/wecom-org-sync` 等后台路由时，预期进入内置后台登录页，而不是被浏览器上次登录组织带到某个业务组织默认应用。

企业微信组织同步会为企业微信 Corp ID 创建业务组织 `wecom-*` 和默认应用 `app-wecom-*`。这些对象用于同步用户归属、Storage Provider 上下文和后续企业微信登录配置，不应成为认证中心后台入口的隐式默认应用。

## Goals / Non-Goals

**Goals:**

- 后台管理入口未登录时固定跳转 `/login`。
- 保留显式组织登录 `/login/:owner` 的能力。
- 保留 OAuth、SAML、CAS 等授权入口按参数选择应用的行为。
- 用最小前端改动修正默认路由边界，不引入数据库迁移或后端接口变更。

**Non-Goals:**

- 不重做登录页 UI。
- 不改变企业微信扫码登录 Provider 的配置模型。
- 不删除 `lastLoginOrg` 的写入逻辑；本次只限制它影响后台管理入口。
- 不改变 `app-wecom-*` 作为企业微信同步默认应用上下文的定位。

## Decisions

### 1. 后台未登录重定向固定使用 `/login`

在 `ManagementPage` 的 `renderLoginIfNotLoggedIn` 中，未登录时直接返回 `<Redirect to="/login" />`。这样后台管理入口具备稳定、可预期的默认行为。

备选方案是清理 `localStorage.lastLoginOrg`。该方案只能修复当前浏览器，不能防止后续再次被写入，因此不采用。

### 2. 保留 `lastLoginOrg` 的写入和显式组织登录能力

`LoginPage` 登录完成后仍可记录 `lastLoginOrg`，`/login/:owner` 也继续根据 URL 中的 `owner` 获取组织默认应用。这样不会破坏用户显式选择组织登录的场景，也不会影响企业微信业务组织默认应用。

备选方案是彻底删除 `lastLoginOrg`。该方案会影响原有多组织登录体验，范围超过本次后台入口修复，因此不采用。

### 3. 不改 OAuth/SAML/CAS 授权路由

`/login/oauth/authorize`、`/login/saml/authorize/...`、`/cas/.../login` 都是显式授权入口，目标应用由 URL 参数或路径决定。本次只改后台页面未登录时的保护路由重定向，不触碰这些入口。

## Risks / Trade-offs

- [部分用户依赖后台页自动回到上次登录组织] → 显式访问 `/login/:owner` 仍可进入指定组织登录；后台入口优先保证管理员可达性。
- [浏览器中遗留 `lastLoginOrg` 仍存在] → 该值不会再影响后台未登录重定向；后续若要清理可单独处理。
- [测试需要覆盖不同入口] → 至少验证 `/`、后台受保护路由、`/login/:owner` 和 `/login/oauth/authorize` 的路由边界。

## Migration Plan

1. 修改后台未登录重定向逻辑。
2. 运行前端相关单测或构建校验。
3. 手工验证未登录访问 `/` 或后台路由时进入 `/login`。
4. 手工验证直接访问 `/login/wecom-*` 仍进入企业微信业务组织默认应用。
5. 若出现异常，回滚该前端改动即可，不涉及数据回滚。
