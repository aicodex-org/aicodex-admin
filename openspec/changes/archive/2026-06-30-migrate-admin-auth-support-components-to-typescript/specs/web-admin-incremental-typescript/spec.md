## ADDED Requirements

### Requirement: Auth support components migrate conservatively to TypeScript
Admin 前端 SHALL 支持将 `web-admin/src/auth/` 下的 Provider 辅助组件和小型认证页从 legacy JavaScript 渐进迁移为 `.ts` 或 `.tsx`，并保持登录、OIDC、Provider 可见性和后端 API 行为兼容。

#### Scenario: P0 auth support files are migrated
- **WHEN** 本 change 迁移 auth/provider support 组件
- **THEN** `Provider`、`ProviderButton`、`SigninMethodChoice`、`LoginLanguage`、`LoginPageVisibility`、`MfaSetupPage`、`PromptPage`、`ConsentPage`、`ResultPage` 和 `OidcDiscoveryPage` SHALL 使用 `.ts` 或 `.tsx`
- **AND** 是否使用 `.tsx` SHALL 由文件是否包含 JSX 决定
- **AND** 迁移 SHALL 使用明确局部类型描述组件 props、Provider 记录、登录方式、可见性配置、认证响应和回调参数

#### Scenario: Auth behavior remains unchanged
- **WHEN** auth support files 被迁移为 TypeScript
- **THEN** 迁移 SHALL 保持登录入口渲染、Provider 按钮展示、语言选择、登录页可见性判断、MFA setup、consent/prompt/result 页面和 OIDC discovery 页面行为不变
- **AND** 迁移 SHALL NOT 修改授权 URL、OIDC 参数、回调参数、Provider 可见性规则、后端 API path、HTTP method、payload shape、权限或真实认证链路
- **AND** 迁移 SHALL NOT 要求同一 change 迁移 `LoginPage`、`AuthCallback`、`SamlCallback`、`Auth`、`AuthBackend`、`ProviderEditPage`、`ApplicationEditPage`、`ManagementPage`、`App`、`Setting` 或 `BaseListPage`

#### Scenario: Small login button components may migrate when low risk
- **WHEN** 小型登录按钮组件只依赖当前 auth support 类型边界
- **THEN** 该组件 MAY 迁移为 `.tsx`
- **AND** 迁移 SHALL 保持第三方 provider 授权 URL、SDK 调用、按钮文案、图标和回调语义不变
- **AND** 类型洞过大或会牵出主登录页、回调页、后端 wrapper 的组件 SHALL be deferred and documented instead of blocking P0 support migration

#### Scenario: Auth support migration is validated
- **WHEN** auth support migration 准备 review
- **THEN** 本次触碰且包含 JSX 的测试 SHALL 使用 `.test.tsx`，纯逻辑测试 SHALL 使用 `.test.ts`
- **AND** 聚焦 Jest SHALL 至少覆盖 `Provider`、`ProviderButton`、`SigninMethodChoice`、`LoginLanguage`、`LoginPageVisibility` 和 `WeComLoginPanel`
- **AND** OpenSpec strict validation、`git diff --check`、增量 TypeScript gate、`yarn typecheck`、focused Jest tests 和 `yarn build` SHALL pass for touched TS/TSX and JS coexistence paths
