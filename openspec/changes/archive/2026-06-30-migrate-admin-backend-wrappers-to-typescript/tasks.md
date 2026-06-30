## 1. OpenSpec 与范围核对

- [x] 1.1 创建 `migrate-admin-backend-wrappers-to-typescript` OpenSpec change 并补齐 proposal/design/spec/tasks
- [x] 1.2 盘点 `web-admin/src/backend` 中剩余 `.js` wrapper、已有 `.ts` wrapper 和 backend tests
- [x] 1.3 确认不触碰 auth backend、页面组件、Provider/Application/Syncer 页面、common/table/select/modal、`ManagementPage`、`App`、`Setting`、`BaseListPage`

## 2. backend wrapper TS 迁移

- [x] 2.1 使用 `git mv` 将 backend 目录中剩余 `.js` API wrapper 迁移为 `.ts`
- [x] 2.2 新增或复用 backend 层窄类型，覆盖通用 response、record、query/filter、pagination、owner/name/id 和 form payload 边界
- [x] 2.3 修复迁移后 TypeScript 暴露的局部类型问题，保持 HTTP method、URL、query/body shape、错误处理和导出形态不变
- [x] 2.4 记录任何因牵出页面行为或跨 owner 大改而 deferred 的 wrapper（本批无 deferred wrapper）

## 3. backend tests 迁移

- [x] 3.1 将触碰的 backend `.test.js` 迁移为 `.test.ts`
- [x] 3.2 处理重复 test 入口或 import 类型问题，确保 focused Jest 运行真实 suites/tests

## 4. 验证与 closeout

- [x] 4.1 运行 `openspec validate migrate-admin-backend-wrappers-to-typescript --strict`
- [x] 4.2 运行 `git diff --check origin/hfl-test-base..HEAD`
- [x] 4.3 运行 backend focused Jest
- [x] 4.4 运行 `yarn typecheck`、增量 TypeScript gate 和 `yarn build`
- [x] 4.5 完成 OpenSpec archive、主规格同步、单 commit 收敛、rebase 最新 `origin/hfl-test-base` 后 final gate
- [x] 4.6 普通非强制推送 `origin/hfl-test-base`，删除本地/远端工作分支，确认未 push/merge `test`
