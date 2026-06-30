## Why

`web-admin/src/auth/` 下的 Provider 辅助组件、小型认证页和部分登录按钮仍保留 legacy JavaScript。后续主登录页、Provider 大页和认证中心页面迁移会持续依赖这些组件；先把低风险 support 组件迁移为 TS/TSX，可以降低后续迁移的类型边界和导入风险。

## What Changes

- 将 `web-admin/src/auth/` 中的 Provider 辅助组件、小型认证页按是否包含 JSX 迁移为 `.ts` 或 `.tsx`。
- 将触碰到的组件测试迁移为 `.test.ts` 或 `.test.tsx`，保持现有可观察行为。
- 局部补齐 props、认证 Provider、登录方式、可见性、SDK/window 全局对象和回调参数类型。
- 在不拖慢 P0 的前提下，顺带迁移小型登录按钮组件；类型洞过大的组件记录为 deferred。

## Scope

P0 包含 `Provider`、`ProviderButton`、`SigninMethodChoice`、`LoginLanguage`、`LoginPageVisibility`、`MfaSetupPage`、`PromptPage`、`ConsentPage`、`ResultPage`、`OidcDiscoveryPage` 及对应低风险测试。

本 change 不迁移 `LoginPage.js` 主登录页，不迁移 `AuthCallback.js`、`SamlCallback.js`、`Auth.js`、`AuthBackend.js`，也不迁移 Provider 编辑页、应用编辑页、管理壳层或全局配置页。

## Impact

- 主要影响 `web-admin/src/auth/*` support 组件和相关 Jest 测试。
- 保持登录、OIDC、WeCom、Provider 可见性、授权 URL、回调参数和后端 API 契约不变。
- 不新增依赖，不修改 TypeScript 基建、路由壳层、生产配置或真实认证链路。
