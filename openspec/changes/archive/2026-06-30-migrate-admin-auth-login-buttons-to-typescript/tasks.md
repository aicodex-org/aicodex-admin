## 1. OpenSpec 和基线

- [x] 1.1 校验 `migrate-admin-auth-login-buttons-to-typescript` change artifacts
- [x] 1.2 确认工作分支基于最新 `origin/hfl-test-base`，且不触碰历史残留 active changes 和并行 worker 写集

## 2. P0 登录按钮迁移

- [x] 2.1 迁移 `LoginButton` 和第三方 `*LoginButton` 组件为 `.tsx`
- [x] 2.2 补充局部 props、Provider、应用对象、URL 回调和 SDK/window declaration 类型
- [x] 2.3 保持无后缀 import、授权 URL、provider 可见性和按钮渲染行为不变

## 3. 登录 panel/SDK 评估

- [x] 3.1 评估并迁移低风险 `TelegramLogin`、`WeChatLoginPanel`、`WeComLoginPanel`、`WeiboLoginButton`、`CasLogout`
- [x] 3.2 对类型洞过大或行为风险较高的 panel/SDK 文件记录 deferred

## 4. 测试迁移与验证

- [x] 4.1 评估现有 Jest；本次未修改测试文件，保留 `.test.js` 并由 focused Jest 覆盖迁移后 TSX 导入边界
- [x] 4.2 运行 `openspec validate migrate-admin-auth-login-buttons-to-typescript --strict`
- [x] 4.3 运行 `git diff --check origin/hfl-test-base..HEAD`
- [x] 4.4 运行 focused Jest，至少覆盖 `ProviderButton`、`WeComLoginPanel`、`Util`、`LoginPage` 相关测试且不是 0 tests
- [x] 4.5 运行 `yarn typecheck`
- [x] 4.6 运行 `node scripts/check-incremental-typescript-gate.mjs --base origin/hfl-test-base`
- [x] 4.7 运行 `yarn build`

## Deferred

- `Web3Auth.js` 暂不迁移：该文件是大体量 Web3 钱包 SDK 逻辑且不包含 JSX，迁移会牵出 `window.ethereum`、Web3-Onboard provider options、钱包模块返回值和签名 payload 的独立类型边界；保留给后续单独 Web3 auth SDK migration。

## 5. Self-closeout 说明

- 本节记录用户已授权的收尾动作，不作为实现 checklist 统计：同步主规格、archive OpenSpec、收敛 1 个逻辑 commit、普通非强制 push 到 `origin/hfl-test-base`、删除本地和远端工作分支，并且不触碰 `test`。
