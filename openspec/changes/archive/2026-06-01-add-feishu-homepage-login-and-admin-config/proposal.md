## Why

当前 `aicodex-admin` 已具备 `Lark` OAuth Provider 基础能力，但产品上还没有面向国内飞书扫码登录的清晰入口、配置引导和验收闭环。`aicodex-admin` 当前承担 AICodex 产品认证中心角色，需要服务 Web/API、Insight、桌面端等多类 AICodex client，因此飞书登录必须作为认证中心能力打通到实际 OAuth/OIDC client 登录链路，而不只是 admin 控制台自身登录。

## What Changes

- 复用现有 `Lark` Provider 类型作为飞书与海外 Lark 的共同实现，不新增独立 `Feishu` Provider 类型。
- 在登录页表单下方的第三方登录图标区域支持飞书入口，入口体验对齐当前企业微信小图标入口形态，并通过统一品牌显示规则区分“飞书”和“Lark”。
- 本 change 只把企业微信现有入口作为页面形态参考，不以 `add-wecom-homepage-login-and-admin-config` 提案作为事实依据；实现和验收必须基于当前代码、当前运行配置和真实应用登录链路。
- 国内飞书配置使用 `Lark` Provider 且关闭“启用全局地址”，授权页走 `accounts.feishu.cn`，API 走 `open.feishu.cn`；海外 Lark 保留开启全局地址能力，授权页走 `accounts.larksuite.com`，API 走 `open.larksuite.com`。
- 支持把同一个飞书/Lark Provider 绑定到 AICodex Web/API、Insight、桌面端等目标应用，用户在这些 client 发起认证时能看到飞书入口并完成认证中心登录与 client 回跳。
- 飞书上游回调后必须重新校验或服务端恢复原始 OAuth/OIDC client 请求上下文，不能信任回调或前端 state 中临时传入的 `redirect_uri`。
- 完善后台 Provider 配置页中的飞书/Lark 字段说明、端点选择说明、回调地址提示和必填校验。
- 升级后端 `LarkIdProvider` 的授权码换 token 与用户信息获取流程到当前推荐的 `authen/v2/oauth/token` + `authen/v1/user_info`，使国内飞书扫码登录可稳定落到 admin 认证中心用户会话。
- 明确 `user_id`、`open_id`、`union_id` 的兼容匹配和回填策略，避免飞书通讯录同步用户与扫码登录用户生成重复账号。
- 补充飞书扫码登录联调文档，明确 App ID、App Secret、回调地址、开放平台安全设置、权限范围、用户绑定字段和常见失败原因。

## Capabilities

### New Capabilities

- `feishu-homepage-signin`: 定义登录页飞书入口展示、点击跳转、回调落地、失败反馈和用户登录成功要求。
- `feishu-provider-configuration`: 定义后台飞书/Lark Provider 配置字段、国内/海外端点选择、回调地址提示、校验和联调说明要求。

### Modified Capabilities

## Impact

- 主要影响 `web-admin/src/auth/LoginPage.js`、`web-admin/src/auth/ProviderButton.js`、`web-admin/src/auth/Provider.js`、`web-admin/src/auth/AuthCallback.js`、`web-admin/src/Setting.js`、`web-admin/src/ProviderEditPage.js`、`web-admin/src/provider/*` 与相关本地化文案；`web-admin/src/auth/LarkLoginButton.js` 只覆盖大按钮入口，不是 `Providers` 小图标入口的唯一落点。
- 主要影响后端 `admin/idp/lark.go`、`admin/idp/provider.go`、`admin/controllers/auth.go`、`admin/object/user.go`、`admin/object/user_util.go` 及 OAuth 登录回调链路。
- 影响应用登录配置方式：管理员需要在 AICodex Web/API、Insight、桌面端等目标应用中绑定可见的 `Lark` OAuth Provider，并在 Provider 配置中选择国内飞书或海外 Lark 端点。
- Provider 配置页只能展示基于当前管理端 origin 的默认回调提示；应用启用 `forcedRedirectOrigin` 或多应用共享 Provider 时，文档和 UI 必须引导管理员以实际发起登录应用的认证中心 origin 为准。
- 需要回归验证现有 Lark 海外端点、其他 OAuth Provider 登录、Provider 小图标展示和企业微信当前实现不退化；企业微信回归以当前代码行为为准，不以历史提案为准。
