## 1. OpenSpec 与实施前门禁

- [x] 1.1 从最新 `origin/hfl-test-base` 创建 `hfl-test/migrate-authorization-casbin-enforcer-list-page-to-typescript`，确认工作区 clean 且不叠加其它 release candidate。
- [x] 1.2 创建 proposal/design/tasks/spec delta，并运行 `openspec validate migrate-authorization-casbin-enforcer-list-page-to-typescript --strict`。
- [x] 1.3 完成 `openspec-pre-implementation-review`，确认 scope、写集、风险和验证计划无 Blocking/Fixable。

## 2. TSX 迁移

- [x] 2.1 将 `web-admin/src/EnforcerListPage.js` 重命名为 `EnforcerListPage.tsx`，补充列表页 props/state、执行器 record、pagination/fetch params、table columns 和 backend response 类型。
- [x] 2.2 保持新增、删除、列表加载、分页筛选排序、错误提示、授权拒绝和内置对象删除保护行为不变。
- [x] 2.3 确认 `ManagementPage.js` 无后缀 import 和 `/enforcers` 路由语义不变，不迁移 `EnforcerEditPage` 或 `PolicyTable`。

## 3. 测试

- [x] 3.1 新增执行器列表页 `.test.tsx`，不新增 `.js/.jsx` 测试。
- [x] 3.2 覆盖 TSX 文件存在、原 `.js` 不再解析、表格渲染、Name/Organization/Model/Adapter 链接和 mobile action 固定列分支。
- [x] 3.3 覆盖新增成功跳转、删除成功刷新、backend error、network error 和授权拒绝。
- [x] 3.4 记录 changed-file / changed-function coverage，重点关注迁移文件和新增测试。

## 4. 验证、归档与回传

- [x] 4.1 运行 `openspec validate migrate-authorization-casbin-enforcer-list-page-to-typescript --strict`、`openspec validate --changes --strict`、`openspec validate --specs --strict` 和 `git diff --check`。
- [x] 4.2 在 `web-admin` 运行 `node scripts/check-incremental-typescript-gate.mjs --base origin/hfl-test-base`、`yarn typecheck`、focused Jest tests/coverage。
- [x] 4.3 若路由/import/build-time 行为受影响，运行 `yarn build` 并记录 warning。
- [x] 4.4 补充 `verification.md`，完成 `openspec-pre-archive-review` 并修复发现的问题。
- [x] 4.5 archive change，archive 后重新运行 specs/changes strict 和 diff check。
- [x] 4.6 收敛为 `origin/hfl-test-base + 1 个本 change commit`，push 工作分支；未获 `self-closeout=true` 时不合入 `hfl-test-base`、不删除工作分支、不 push/merge `test`，并写 vault report。
