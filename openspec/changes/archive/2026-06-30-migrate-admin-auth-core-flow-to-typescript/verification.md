## 验证记录

本 change 是 auth core flow / callback / MFA 的机械 TS/TSX 迁移；未改认证 URL、callback 参数、token/cookie、登录可见性、MFA 校验或后端 API 契约。

## 已运行命令

- `openspec validate migrate-admin-auth-core-flow-to-typescript --strict`：通过。
- `git diff --check origin/hfl-test-base..HEAD -- .`：通过。
- `yarn test --watchAll=false --runInBand --testMatch "**/src/auth/AuthBackend.test.ts" "**/src/auth/Util.test.ts" "**/src/auth/LoginPage.test.tsx" "**/src/auth/LoginLanguage.test.tsx" "**/src/auth/LoginPageVisibility.test.ts" "**/src/auth/SigninMethodChoice.test.ts" "**/src/auth/ProviderButton.test.tsx"`：实际运行 6 个 suites、17 个 tests，通过；该命令中的 `LoginLanguage.test.tsx` pattern 未命中实际 `.ts` 文件。
- `yarn test --watchAll=false --runInBand --testMatch "**/src/auth/LoginLanguage.test.ts"`：实际运行 1 个 suite、3 个 tests，通过。
- `yarn typecheck`：通过。
- `node scripts/check-incremental-typescript-gate.mjs --base origin/hfl-test-base`：通过。
- `yarn build`：通过；输出包含既有 `Browserslist: caniuse-lite is outdated` 和 `fs.F_OK` deprecation 提示，未阻断构建。

## 覆盖率

未运行 coverage。原因：本 change 按任务要求执行机械 TS/TSX 迁移，不改认证行为；已运行 auth core 和 auth support 聚焦 Jest、`typecheck`、增量 TS gate 与 production build 作为回归保护。剩余风险是 coverage 未提供 changed-file 覆盖率数字。

## 浏览器 Smoke

未运行浏览器 smoke。原因：没有计划内行为或视觉改动；验证范围保持在源码、测试、类型、增量迁移门禁和构建层级。
