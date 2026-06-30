## ADDED Requirements

### Requirement: Auth core flow TypeScript 迁移
`web-admin` SHALL 支持将 `web-admin/src/auth/` 下的核心认证流程、callback、MFA 和认证工具文件从 legacy JavaScript 渐进迁移为 `.ts` 或 `.tsx`，同时保持现有登录、回调、MFA 和后端认证 API 行为兼容。

#### Scenario: Auth core 文件保守迁移
- **WHEN** auth core flow 文件被迁移为 TypeScript
- **THEN** `Auth`、`AuthBackend`、`AuthCallback`、`SamlCallback`、`LoginPage`、`SignupPage`、`SelfLoginPage`、`ForgetPage`、`SelfForgetPage`、`Util`、`Obfuscator`、`CasLogout` 和 `auth/mfa/*` SHALL 使用 `.ts` 或 `.tsx`
- **AND** 是否使用 `.tsx` SHALL 由文件是否包含 JSX 决定
- **AND** 迁移 SHALL 使用局部 TypeScript interface/type 描述组件 props、state、Provider、account、callback 参数、MFA 表单数据、后端响应和 legacy 动态值
- **AND** 迁移 SHALL 保持 extensionless imports、默认导出和既有 React 路由调用方兼容

#### Scenario: Auth 行为和安全边界保持不变
- **WHEN** auth core flow 文件被迁移为 TypeScript
- **THEN** 迁移 SHALL 保持登录页渲染、注册/忘记密码、自助登录、自助忘记密码、OAuth/OIDC callback、SAML callback、CAS logout、token/cookie 处理、MFA verify/enable/check-password 表单和跳转行为不变
- **AND** 迁移 SHALL NOT 修改认证 URL、OAuth/OIDC/SAML/CAS callback 参数、token/cookie 名称或写入语义、登录可见性规则、MFA 校验语义、后端 API path、HTTP method、payload shape、权限或真实认证链路
- **AND** 迁移 SHALL NOT 要求同一 change 迁移登录按钮、登录 panel、Web3Auth、Provider support、Prompt/Consent/Result/OIDC discovery、Provider/Application/Syncer 页面、全局壳层或共享表格

#### Scenario: Auth core 迁移验证
- **WHEN** auth core flow TS/TSX 迁移准备进入 review
- **THEN** 目标 OpenSpec strict validation、`git diff --check`、增量 TypeScript gate、`yarn typecheck`、auth core/support 聚焦 Jest 和 `yarn build` SHALL 对触碰的 TS/TSX 与 JS 共存路径通过
- **AND** 迁移后的 `AuthBackend.test`、`Util.test` 和 `LoginPage.test` SHALL 使用 `.test.ts` 或 `.test.tsx` 并真实执行
- **AND** 任何 deferred 动态类型片段 SHALL 记录原因和剩余风险
