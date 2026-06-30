## 1. OpenSpec 和边界确认

- [x] 1.1 验证 proposal、design、tasks 和 `web-admin-incremental-typescript` delta spec，确认只覆盖 `Web3Auth` 和 `WeComLoginPanel.test`。
- [x] 1.2 审计 `Web3Auth`、`WeComLoginPanel.test` 及最小相关 imports，确认不牵出 common/table/provider/backend/root shell 等写集。

## 2. TS/TSX 迁移实施

- [x] 2.1 将 `web-admin/src/auth/Web3Auth.js` 按 JSX 实际情况迁移为 `.tsx` 或 `.ts`，补局部 SDK/window/provider 类型并保持登录行为不变。
- [x] 2.2 将 `web-admin/src/auth/WeComLoginPanel.test.js` 迁移为 `.test.tsx`，补测试 mock 和 JSX 类型边界，保持 suite 真实执行。

## 3. 验证和 self-closeout

- [x] 3.1 运行 OpenSpec strict validation、`git diff --check`、`WeComLoginPanel` focused Jest、`yarn typecheck`、增量 TypeScript gate 和 `yarn build`。
- [x] 3.2 更新 `verification.md`，记录命令、结果、覆盖率/测试口径、deferred 文件和剩余风险，且不写入敏感信息。
- [x] 3.3 完成归档前 review；若无阻断问题，执行 self-closeout：archive、同步主规格、单 commit 收敛、push `origin/hfl-test-base`、删除工作分支。
