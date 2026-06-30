## ADDED Requirements

### Requirement: Auth login buttons migrate conservatively to TypeScript
Admin 前端 SHALL 支持将 `web-admin/src/auth/` 下的登录按钮和低风险登录 panel 从 legacy JavaScript 渐进迁移为 `.tsx`，并保持登录入口、第三方授权 URL、WeCom/Web3/CAS 行为和后端 API 契约兼容。

#### Scenario: P0 login button files are migrated
- **WHEN** 本 change 迁移 auth 登录按钮组件
- **THEN** `LoginButton` 以及低风险第三方 `*LoginButton` 组件 SHALL 使用 `.tsx`
- **AND** 迁移 SHALL 使用明确局部类型描述按钮 props、Provider 记录、应用对象、登录方式和 URL 回调参数
- **AND** 无后缀 import SHALL continue resolving migrated TSX files from existing callers

#### Scenario: Login behavior remains unchanged
- **WHEN** 登录按钮迁移为 TypeScript
- **THEN** 迁移 SHALL 保持按钮渲染、图标、可见性、点击行为、授权 URL、OIDC/OAuth/CAS 参数、回调参数和第三方 SDK 调用语义不变
- **AND** 迁移 SHALL NOT 修改 provider 可见性规则、后端 API path、HTTP method、payload shape、权限、真实认证链路、WeCom polling/MFA 行为或 Web3 钱包行为
- **AND** 迁移 SHALL NOT 要求同一 change 迁移 `LoginPage`、`SignupPage`、`ForgetPage`、`SelfLoginPage`、`SelfForgetPage`、`AuthCallback`、`SamlCallback`、`Auth`、`AuthBackend`、`ProviderEditPage`、`ApplicationEditPage`、`SyncerEditPage`、`ManagementPage`、`App`、`Setting` 或 `BaseListPage`

#### Scenario: Login panel and SDK files may migrate when low risk
- **WHEN** `TelegramLogin`、`WeChatLoginPanel`、`WeComLoginPanel`、`Web3Auth`、`WeiboLoginButton` 或 `CasLogout` 只需要窄局部类型和 SDK declaration
- **THEN** 该文件 MAY 迁移为 `.tsx`
- **AND** 类型洞过大、会牵出主登录页/回调页/后端 wrapper，或会改变 SDK 初始化和 polling 行为的文件 SHALL be deferred and documented instead of blocking P0 login button migration

#### Scenario: Auth login button migration is validated
- **WHEN** auth 登录按钮迁移准备 closeout
- **THEN** 本次触碰且包含 JSX 的测试 SHALL 使用 `.test.tsx`，纯逻辑测试 SHALL 使用 `.test.ts`
- **AND** focused Jest SHALL 至少覆盖 `ProviderButton`、`WeComLoginPanel`、`Util` 和 `LoginPage` 中与登录按钮、授权 URL 或 WeCom panel 相关的现有测试，且测试数量 SHALL be greater than zero
- **AND** OpenSpec strict validation、`git diff --check`、增量 TypeScript gate、`yarn typecheck`、focused Jest tests 和 `yarn build` SHALL pass for touched TS/TSX and JS coexistence paths
