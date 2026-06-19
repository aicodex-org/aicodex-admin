## 1. OpenSpec

- [x] 1.1 创建 `migrate-organization-group-list-to-typescript` change，补齐 proposal、design、tasks 和 spec delta。
- [x] 1.2 完成实施前 review，确认范围仅覆盖群组列表页和必要 backend client 类型化。

## 2. 实现

- [x] 2.1 将 `web-admin/src/backend/GroupBackend.js` 迁移为 `GroupBackend.ts`，补齐群组记录、mutation 和响应类型并保持既有导出兼容。
- [x] 2.2 将 `web-admin/src/GroupListPage.js` 迁移为 `GroupListPage.tsx`，补齐 props、state、上传预览、fetch 参数和表格列类型。
- [x] 2.3 新增 `GroupListPage.test.tsx` 和 `GroupBackend.test.ts`，覆盖列表渲染、新建、删除、组织筛选、类型筛选、上传预览/上传结果、未授权、网络错误和 backend endpoint 契约。
- [x] 2.4 确认 `GroupTreePage.js`、`GroupEditPage.js` 和其它 JS 调用方继续能从 TS backend client 导入原函数，不迁移树页/编辑页。

## 3. 验证与收口

- [x] 3.1 运行 target OpenSpec strict、changes/specs strict 和 `git diff --check`。
- [x] 3.2 在 `web-admin` 运行增量 TypeScript 门禁、`yarn typecheck`、聚焦 Jest 覆盖率和 `yarn build`。
- [x] 3.3 记录验证结果与覆盖率，完成归档前 review。
- [x] 3.4 Archive change，并按单 change commit 收口；不 push/merge `test`。
