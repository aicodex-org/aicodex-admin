## 1. OpenSpec

- [x] 1.1 创建 `migrate-syncer-list-page-to-typescript` change，补齐 proposal、design、tasks 和 spec delta。
- [x] 1.2 完成实施前 review，确认范围仅覆盖同步器列表页与必要 backend client 类型化。

## 2. 实现

- [x] 2.1 将 `web-admin/src/backend/SyncerBackend.js` 迁移为 `SyncerBackend.ts`，补齐同步器记录和响应类型并保持既有导出兼容。
- [x] 2.2 将 `web-admin/src/SyncerListPage.js` 迁移为 `SyncerListPage.tsx`，补齐 props、state、fetch 参数和表格列类型。
- [x] 2.3 新增或迁移 `SyncerListPage.test.tsx`，覆盖列表渲染、新建、删除、运行同步、筛选组织、未授权和错误分支。
- [x] 2.4 确认 `SyncerEditPage.js` 继续能从 TS backend client 导入原函数，不迁移编辑页。

## 3. 验证与收口

- [x] 3.1 运行 target OpenSpec strict、changes/specs strict 和 `git diff --check`。
- [x] 3.2 在 `web-admin` 运行增量 TypeScript 门禁、`yarn typecheck`、聚焦 Jest 覆盖率和 `yarn build`。
- [x] 3.3 记录验证结果与覆盖率，完成归档前 review。
- [x] 3.4 Archive change，并按单 change commit 收口；若 Git 远端 TLS 仍失败，记录为外部网络风险，不 push `test`。
