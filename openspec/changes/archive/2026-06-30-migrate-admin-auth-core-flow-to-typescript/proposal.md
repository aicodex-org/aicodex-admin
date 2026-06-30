## Why

`web-admin/src/auth/` 下的核心登录、回调、MFA 和认证工具文件仍有一批 legacy JavaScript。它们处在认证主流程的关键路径，继续保留 JS 会让已迁移的 auth support TS/TSX 文件与主登录流程之间形成长期混合边界，增加后续维护登录、回调和 MFA 链路的类型成本。

本 change 将 auth core flow 相关文件保守迁移为 TypeScript/TSX，同时保持既有登录、回调、token/cookie、MFA 校验和后端 API 契约不变。

## What Changes

- 将 `Auth`、`AuthBackend`、`AuthCallback`、`SamlCallback`、`LoginPage`、`SignupPage`、`SelfLoginPage`、`ForgetPage`、`SelfForgetPage`、`Util`、`Obfuscator`、`CasLogout` 和 `auth/mfa/*` 渐进迁移为 `.ts` 或 `.tsx`。
- 将对应的 `AuthBackend.test`、`LoginPage.test` 和 `Util.test` 迁移为 `.test.ts` / `.test.tsx`。
- 为 auth core 文件补充局部 props、state、Provider、account、callback、MFA 和 legacy 动态值类型边界。
- 保持 auth 登录按钮、登录 panel、Web3Auth、Provider support、Prompt/Consent/Result/OIDC discovery 等并行或已迁移文件在本 change 范围外。
- 不改变认证 URL、callback 参数、token/cookie 处理、登录页可见性、MFA 校验语义、后端 API path、HTTP method 或 payload shape。

## Capabilities

### New Capabilities

无。

### Modified Capabilities

- `web-admin-incremental-typescript`: 在渐进 TypeScript 迁移路线下增加 auth core flow / callback / MFA TS/TSX 迁移场景。

## Impact

- 前端：迁移 `web-admin/src/auth/` 下指定 core flow、callback、工具和 MFA 文件。
- 测试：迁移并运行 auth core 聚焦测试，同时补跑受登录主流程影响的 auth support 测试。
- OpenSpec：新增 `web-admin-incremental-typescript` spec delta 和迁移任务。
- 不改变后端 API、数据库、真实认证链路、OAuth/OIDC/SAML/CAS callback 语义、Provider contract、secret 处理或生产/类生产配置。
