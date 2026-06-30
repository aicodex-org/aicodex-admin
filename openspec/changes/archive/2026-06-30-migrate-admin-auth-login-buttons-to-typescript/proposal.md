## Why

上轮 auth support 组件已经迁移到 TS/TSX，但登录按钮和少量登录 panel 仍停留在 legacy JavaScript，导致认证入口在 Provider 按钮渲染、第三方授权 URL 生成和 WeCom/Web3 SDK 边界上继续存在 JS/TS 混合维护成本。

本 change 承接 deferred 范围，优先把登录按钮组件机械迁移为 TSX，并在不改变真实登录/OIDC/WeCom/Web3 行为的前提下收窄第三方 SDK 和 props 类型边界。

## What Changes

- 将 `web-admin/src/auth/LoginButton` 和低风险第三方登录按钮组件从 `.js` 迁移为 `.tsx`。
- 视风险迁移 `TelegramLogin`、`WeChatLoginPanel`、`WeComLoginPanel`、`Web3Auth`、`WeiboLoginButton`、`CasLogout`；如果 SDK 或 panel 类型洞牵出大范围行为风险，记录 deferred 而不阻塞 P0 登录按钮迁移。
- 补充局部 props、Provider、应用、URL/SDK 回调和 window/global declaration 类型，不引入新依赖。
- 保持无后缀 import、授权 URL、回调参数、provider 可见性、WeCom polling/MFA、Web3 钱包和后端 API 契约不变。

## Capabilities

### New Capabilities

### Modified Capabilities

- `web-admin-incremental-typescript`: 扩展 Admin 前端渐进 TypeScript 规则，覆盖 auth 登录按钮和登录 panel 的保守迁移边界、deferred 策略和验证要求。

## Impact

- Affected code: `web-admin/src/auth/*LoginButton.js`、`LoginButton.js`，以及低风险登录 panel/SDK 文件和对应测试。
- Validation: OpenSpec strict validation、focused Jest、`yarn typecheck`、增量 TypeScript gate、`yarn build`。
- No API/dependency impact: 不修改认证后端 API、OAuth/OIDC/SAML/CAS 回调、真实 provider 配置、包依赖或 TypeScript 基建。
