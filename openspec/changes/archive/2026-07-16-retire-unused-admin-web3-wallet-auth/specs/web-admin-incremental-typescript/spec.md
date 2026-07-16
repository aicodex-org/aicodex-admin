## ADDED Requirements

### Requirement: Auth residual WeCom test TypeScript 收尾
Admin 前端 SHALL 支持将 `web-admin/src/auth` 中剩余的 WeCom 登录 panel 测试从 legacy JavaScript 迁移为 TypeScript/TSX，并保持 WeCom 登录行为、测试覆盖和 JS/TS 共存边界兼容；已退役的 `Web3Auth` SHALL NOT 作为迁移候选保留。

#### Scenario: WeComLoginPanel 测试迁移
- **WHEN** 开发者迁移 WeCom 登录 panel 残留测试
- **THEN** `web-admin/src/auth/WeComLoginPanel.test` SHALL 使用 `.test.tsx`
- **AND** focused Jest SHALL 真实执行 `WeComLoginPanel` suite/tests，测试数量 SHALL be greater than zero
- **AND** 迁移 SHALL 保持 WeCom panel intent、polling、MFA、错误展示和 mock API payload 语义不变

#### Scenario: Auth residual 行为和边界保持兼容
- **WHEN** 本批 WeCom residual 文件迁移为 TypeScript/TSX
- **THEN** 迁移 SHALL NOT 修改认证 URL、OAuth/OIDC/WeCom 回调参数、token/cookie 名称或写入语义、普通 Provider 可见性、后端 API path、HTTP method、payload shape、权限或真实认证链路
- **AND** 迁移 SHALL NOT 恢复、重建或引用已退役的 `Web3Auth`
- **AND** 迁移 SHALL NOT 触碰 common/table/provider/backend/Application/Syncer/root shell/config/entry/basic/account/pricing 写集

#### Scenario: Auth residual 迁移验证
- **WHEN** auth residual WeCom test migration 准备收口
- **THEN** OpenSpec strict validation、`git diff --check`、`WeComLoginPanel.test.tsx` focused Jest、`yarn typecheck`、增量 TypeScript gate 和 `yarn build` SHALL pass for touched TSX and JS coexistence paths
- **AND** 若迁移需要任何 WeCom 登录行为语义变化，change SHALL stop at RC/blocked instead of self-closeout

## MODIFIED Requirements

### Requirement: Auth login buttons migrate conservatively to TypeScript
Admin 前端 SHALL 支持将 `web-admin/src/auth/` 下仍在使用的登录按钮和低风险登录 panel 从 legacy JavaScript 渐进迁移为 `.tsx`，并保持登录入口、第三方授权 URL、WeCom/CAS 行为和后端 API 契约兼容；已退役 Web3 钱包认证不属于兼容范围。

#### Scenario: P0 login button files are migrated
- **WHEN** 本 change 迁移 auth 登录按钮组件
- **THEN** `LoginButton` 以及仍在使用的低风险第三方 `*LoginButton` 组件 SHALL 使用 `.tsx`
- **AND** 迁移 SHALL 使用明确局部类型描述按钮 props、Provider 记录、应用对象、登录方式和 URL 回调参数
- **AND** 无后缀 import SHALL continue resolving migrated TSX files from existing callers

#### Scenario: Login behavior remains unchanged
- **WHEN** 登录按钮迁移为 TypeScript
- **THEN** 迁移 SHALL 保持仍在使用的按钮渲染、图标、可见性、点击行为、授权 URL、OIDC/OAuth/CAS 参数、回调参数和第三方 SDK 调用语义不变
- **AND** 迁移 SHALL NOT 修改普通 provider 可见性规则、后端 API path、HTTP method、payload shape、权限、真实认证链路或 WeCom polling/MFA 行为
- **AND** 迁移 SHALL NOT 恢复 Web3 钱包按钮、SDK、Provider fallback 或 callback 入口
- **AND** 迁移 SHALL NOT 要求同一 change 迁移 `LoginPage`、`SignupPage`、`ForgetPage`、`SelfLoginPage`、`SelfForgetPage`、`AuthCallback`、`SamlCallback`、`Auth`、`AuthBackend`、`ProviderEditPage`、`ApplicationEditPage`、`SyncerEditPage`、`ManagementPage`、`App`、`Setting` 或 `BaseListPage`

#### Scenario: Login panel and SDK files may migrate when low risk
- **WHEN** `TelegramLogin`、`WeChatLoginPanel`、`WeComLoginPanel`、`WeiboLoginButton` 或 `CasLogout` 只需要窄局部类型和 SDK declaration
- **THEN** 该文件 MAY 迁移为 `.tsx`
- **AND** 类型洞过大、会牵出主登录页/回调页/后端 wrapper，或会改变 SDK 初始化和 polling 行为的文件 SHALL be deferred and documented instead of blocking P0 login button migration

#### Scenario: Auth login button migration is validated
- **WHEN** auth 登录按钮迁移准备 closeout
- **THEN** 本次触碰且包含 JSX 的测试 SHALL 使用 `.test.tsx`，纯逻辑测试 SHALL 使用 `.test.ts`
- **AND** focused Jest SHALL 至少覆盖 `ProviderButton`、`WeComLoginPanel`、`Util` 和 `LoginPage` 中与登录按钮、授权 URL 或 WeCom panel 相关的现有测试，且测试数量 SHALL be greater than zero
- **AND** OpenSpec strict validation、`git diff --check`、增量 TypeScript gate、`yarn typecheck`、focused Jest tests 和 `yarn build` SHALL pass for touched TS/TSX and JS coexistence paths

### Requirement: Public auth raw scripts TypeScript 生成链路
Admin 前端 SHALL 支持将 `web-admin/public` 中的 public auth raw scripts 通过 TypeScript 源文件维护，并生成最终 served `.js` 文件，同时保持仍在使用的登录 callback 和 provider hint redirect 行为兼容。

#### Scenario: Public auth scripts TS 源维护
- **WHEN** 开发者维护 `web-admin/public/AuthCallbackHandler.js` 或 `web-admin/public/ProviderHintRedirect.js`
- **THEN** 对应逻辑 SHALL 有 TypeScript 源文件作为维护入口
- **AND** TS 源 SHALL 使用局部窄类型描述 window、storage、fetch response、provider、application、OAuth/SAML/CAS callback payload 和 redirect 边界
- **AND** TS 源 SHALL NOT 依赖 bundler-only import/export、React、src auth 模块或新增生产依赖

#### Scenario: Served public JS 路径保持兼容
- **WHEN** public auth scripts 被构建或发布
- **THEN** 最终浏览器可加载的文件 SHALL 保持 `/AuthCallbackHandler.js` 和 `/ProviderHintRedirect.js`
- **AND** 生成链路 SHALL 输出到 `web-admin/public/AuthCallbackHandler.js` 和 `web-admin/public/ProviderHintRedirect.js`
- **AND** CRA build SHALL continue copying these `.js` files as public raw assets

#### Scenario: Public auth script 行为保持兼容
- **WHEN** public auth scripts 迁移为 TypeScript 源并重新生成 `.js`
- **THEN** 迁移 SHALL NOT 修改 OAuth/OIDC/SAML/CAS/WeCom callback query、hash、storage key、postMessage、fetch path、HTTP method、payload shape、token/cookie 处理或 redirect 构造语义
- **AND** 迁移 SHALL NOT 恢复已退役的 Web3 callback 或钱包 storage key 处理
- **AND** 迁移 SHALL NOT 输出 token、Cookie、Authorization header、raw callback payload 或真实账号到验证记录

#### Scenario: Public auth scripts 迁移验证
- **WHEN** public auth raw scripts TypeScript 迁移准备交付
- **THEN** OpenSpec strict validation、`git diff --check`、public scripts TS 静态验证或生成命令、`yarn typecheck`、增量 TypeScript gate 和 `yarn build` SHALL pass
- **AND** 生成命令 SHALL be run once and leave no non-expected diff between TS sources and generated public `.js`
- **AND** a lightweight browser or jsdom-style smoke SHALL load both generated public `.js` files with redacted fake parameters and verify global entrypoints or redirect fallback behavior without real credentials

## REMOVED Requirements

### Requirement: Auth residual Web3 and WeCom test TypeScript 收尾
**Reason**: `Web3Auth` 钱包认证已按产品决策退役，继续要求迁移并保持其 SDK、callback 和登录行为会与安全清退目标冲突；WeCom 测试迁移已由新的独立 requirement 承接。

**Migration**: 删除 `Web3Auth` 及其专属测试/类型/依赖，不提供替代钱包实现；未来 auth TypeScript 迁移只维护仍在使用的 WeCom 和其它认证组件。
