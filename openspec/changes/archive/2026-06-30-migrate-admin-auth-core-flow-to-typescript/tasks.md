## 1. OpenSpec

- [x] 1.1 为 auth core flow TS/TSX 迁移创建 proposal、tasks 和 `web-admin-incremental-typescript` spec delta。
- [x] 1.2 运行 `openspec validate migrate-admin-auth-core-flow-to-typescript --strict` 校验目标 change。

## 2. TypeScript migration

- [x] 2.1 将 `Auth`、`AuthBackend`、`AuthCallback`、`SamlCallback`、`LoginPage`、`SignupPage`、`SelfLoginPage`、`ForgetPage`、`SelfForgetPage`、`Util`、`Obfuscator` 和 `CasLogout` 迁移为 `.ts` 或 `.tsx`。
- [x] 2.2 将 `auth/mfa/*.js` 迁移为 `.tsx`，并补充局部 props/state/MFA 响应类型。
- [x] 2.3 将 `AuthBackend.test`、`LoginPage.test` 和 `Util.test` 迁移为 `.test.ts` / `.test.tsx`。
- [x] 2.4 保持登录按钮、登录 panel、Web3Auth、Provider support、Prompt/Consent/Result/OIDC discovery、Provider/Application/Syncer 页面、全局壳层和共享表格在本 change 范围外。
- [x] 2.5 保持认证 URL、callback 参数、token/cookie 处理、登录可见性、MFA 校验、跳转和后端 API 契约不变。

## 3. Focused validation

- [x] 3.1 运行迁移后的 `AuthBackend.test`、`Util.test` 和 `LoginPage.test`，并补跑 `LoginLanguage`、`LoginPageVisibility`、`SigninMethodChoice`、`ProviderButton` 等 auth support 聚焦测试。
- [x] 3.2 运行 `yarn typecheck`。
- [x] 3.3 运行 `node scripts/check-incremental-typescript-gate.mjs --base origin/hfl-test-base`。
- [x] 3.4 运行 `yarn build`。
- [x] 3.5 运行 `git diff --check origin/hfl-test-base..HEAD`。

## 4. Closeout

- [x] 4.1 完成归档前 review，记录验证证据和剩余风险。
- [x] 4.2 archive OpenSpec change，同步主规格并验证 `--changes` / `--specs`。
- [x] 4.3 收敛为 1 个本 change commit，rebase 到最新 `origin/hfl-test-base` 后重跑 final gate。
- [x] 4.4 普通非强制 push 到 `origin/hfl-test-base`，删除本地/远端工作分支并回传结果。
