## 1. OpenSpec 与实施前门禁

- [x] 1.1 从最新 `origin/hfl-test-base` 创建 `hfl-test/migrate-authorization-casbin-adapter-pages-to-typescript`，确认工作区 clean 且 active changes 写集不冲突。
- [x] 1.2 创建 proposal/design/tasks/spec delta，并运行 `openspec validate migrate-authorization-casbin-adapter-pages-to-typescript --strict`。
- [x] 1.3 完成 `openspec-pre-implementation-review`，确认 scope、写集、风险和验证计划无 Blocking/Fixable。

## 2. TDD 与 TSX 迁移

- [x] 2.1 新增 Casbin 适配器 focused `.test.tsx`，先确认测试因 `.tsx` 文件不存在或迁移行为缺失而 RED。
- [x] 2.2 将 `web-admin/src/AdapterListPage.js` 重命名为 `AdapterListPage.tsx`，补充 props/state、adapter record、pagination/fetch params、table columns 和 backend response 类型，保持列表行为不变。
- [x] 2.3 将 `web-admin/src/AdapterEditPage.js` 重命名为 `AdapterEditPage.tsx`，补充 props、route params、state、adapter record、organization record、field update、save/delete/DB test response 类型，保持编辑行为不变。
- [x] 2.4 确认 `ManagementPage.js` 无后缀 import 和 `/adapters`、`/adapters/:organizationName/:adapterName` 路由语义不变，且不迁移执行器、`PolicyTable` 或 `AdapterBackend.js`。

## 3. 测试覆盖

- [x] 3.1 覆盖 `AdapterListPage` 新增默认对象、新增成功跳转、删除成功刷新、删除错误提示、fetch 分页筛选排序和表格操作关键路径。
- [x] 3.2 覆盖 `AdapterEditPage` adapter/organization 加载、字段更新、保存、保存并退出、保存失败回滚 name、取消新增和删除关键路径。
- [x] 3.3 覆盖 `useSameDb` 切换、数据库连接测试成功/失败/网络错误、内置对象保护和移动端布局分支。
- [x] 3.4 记录 changed-file / changed-function coverage，重点关注迁移文件和新增测试。

## 4. 验证、归档与收口

- [x] 4.1 运行 `openspec validate migrate-authorization-casbin-adapter-pages-to-typescript --strict`、`openspec validate --changes --strict`、`openspec validate --specs --strict` 和 `git diff --check`。
- [x] 4.2 在 `web-admin` 运行 `node scripts/check-incremental-typescript-gate.mjs --base origin/hfl-test-base`、`yarn typecheck`、focused Jest tests/coverage。
- [x] 4.3 若路由/import/build-time 行为受影响，运行 `yarn build` 并记录 warning。
- [x] 4.4 补充 `verification.md`，完成 `openspec-pre-archive-review` 并修复发现的问题。
- [x] 4.5 archive change，archive 后重新运行 specs/changes strict 和 diff check。
- [x] 4.6 收敛为 `origin/hfl-test-base + 1 个本 change commit`，push 工作分支；未明确 self-closeout 授权时只交付 release candidate，不 push base、不删除工作分支。严禁 push/merge `test`。
