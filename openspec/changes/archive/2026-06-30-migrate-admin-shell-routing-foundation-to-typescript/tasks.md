## 1. OpenSpec

- [x] 1.1 创建 `migrate-admin-shell-routing-foundation-to-typescript` change，补齐 proposal、design、tasks 和 `web-admin-incremental-typescript` spec delta。
- [x] 1.2 完成实施前 review，确认范围只覆盖 root shell / routing / config foundation 和指定测试文件。

## 2. 入口、配置与测试 setup 迁移

- [x] 2.1 将 `adminLoginRouting.js`、`Conf.js`、`enterpriseNavigation.js`、`i18n.js`、`serviceWorker.js` 和 `setupTests.js` 迁移为 `.ts` 或必要时 `.tsx`，保持初始化、配置、导航和测试 setup 行为兼容。
- [x] 2.2 将 `index.js` 和 `App.js` 迁移为 `.tsx`，补齐 root render、App props/state、登录守卫和路由边界类型。
- [x] 2.3 将 `App.test.js` 迁移为 `.test.tsx`，保持测试断言语义不变。

## 3. 管理壳、设置与列表基类迁移

- [x] 3.1 将 `ManagementPage.js` 迁移为 `.tsx`，补齐路由、菜单、account、workspace tabs 和 legacy page component 类型边界。
- [x] 3.2 将 `ManagementPage.test.js` 和 `ManagementPage.navigation.test.js` 迁移为 `.test.tsx`，保持导航和菜单测试语义不变。
- [x] 3.3 将 `Setting.js` 和 `Setting.test.js` 迁移为 `.tsx` / `.test.tsx`，保持 setting helper、URL、存储、格式化和脱敏逻辑兼容。
- [x] 3.4 将 `BaseListPage.js` 迁移为 `.tsx`，补齐基础列表 props/state 和 Ant Design 表格分页筛选边界类型；若类型洞超出本 change，记录明确 deferred。

## 4. 验证与 closeout

- [x] 4.1 运行 `openspec validate migrate-admin-shell-routing-foundation-to-typescript --strict` 和 `git diff --check origin/hfl-test-base..HEAD`。
- [x] 4.2 在 `web-admin` 真实运行迁移后的 `App.test.tsx`、`ManagementPage.test.tsx`、`ManagementPage.navigation.test.tsx` 和 `Setting.test.tsx` 聚焦 Jest；如 discovery 异常，使用显式 `--testMatch`，但不得接受 `0 tests`。
- [x] 4.3 运行 `yarn typecheck`、增量 TypeScript gate 和 `yarn build`；如发现 root shell、路由或登录入口疑似行为变化，补本地浏览器 smoke。
- [x] 4.4 记录验证结果、coverage 口径、deferred 片段和剩余风险；归档 OpenSpec、同步主规格、整理为单 commit，按 self-closeout 推送 `hfl-test-base` 并删除工作分支，不 push/merge `test`。
