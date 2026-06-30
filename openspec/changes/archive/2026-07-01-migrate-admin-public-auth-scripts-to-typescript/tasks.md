## 1. OpenSpec 和边界确认

- [x] 1.1 验证 proposal、design、tasks 和 `web-admin-incremental-typescript` delta spec，只覆盖 public auth raw scripts。
- [x] 1.2 审计 `AuthCallbackHandler.js`、`ProviderHintRedirect.js`、`package.json` scripts 和 CRA public copy/build 流程，确认不牵出禁碰写集。

## 2. TS 源和生成链路

- [x] 2.1 新增 public auth scripts TS 源，保持 IIFE/global entrypoint 和原始 callback/redirect 语义。
- [x] 2.2 新增专用 tsconfig 和生成/校验脚本，输出仍为 `web-admin/public/AuthCallbackHandler.js` 与 `web-admin/public/ProviderHintRedirect.js`。
- [x] 2.3 将 `package.json` 接入专用 script；如接入 build 前置步骤，确认 CRA build 行为不变。

## 3. Smoke 和验证

- [x] 3.1 新增或执行轻量 jsdom-style smoke，使用脱敏假参数加载两个 public `.js` 并验证全局入口或 fallback redirect。
- [x] 3.2 运行 OpenSpec strict validation、`git diff --check`、public scripts TS 生成/静态验证、`yarn typecheck`、增量 TS gate 和 `yarn build`。
- [x] 3.3 更新 `verification.md`，记录命令、结果、生成一致性、smoke 证据、deferred 文件和剩余风险。

## 4. RC 交付

- [x] 4.1 提交并推送工作分支，保持 release-candidate-only，不 archive、不合入 `hfl-test-base`、不 push `test`。
