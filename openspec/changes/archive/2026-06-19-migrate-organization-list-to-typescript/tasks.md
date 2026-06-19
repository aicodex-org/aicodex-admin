## 1. OpenSpec

- [x] 1.1 创建 `migrate-organization-list-to-typescript` change，补齐 proposal、design、tasks 和 spec delta。
- [x] 1.2 完成实施前 review，确认范围仅覆盖组织列表页和必要 backend client 类型化。

## 2. 实现

- [x] 2.1 将 `web-admin/src/backend/OrganizationBackend.js` 迁移为 `OrganizationBackend.ts`，补齐组织记录、mutation 和响应类型并保持既有导出兼容。
- [x] 2.2 将 `web-admin/src/OrganizationListPage.js` 迁移为 `OrganizationListPage.tsx`，补齐 props、state、默认组织模板、fetch 参数和表格列类型。
- [x] 2.3 新增 `OrganizationListPage.test.tsx` 和 `OrganizationBackend.test.ts`，覆盖列表渲染、新建、删除、组织筛选、密码类型筛选、未授权、后端错误和 backend endpoint 契约。
- [x] 2.4 确认 `OrganizationEditPage.js`、`UserListPage.js`、选择组件和其它 JS 调用方继续能从 TS backend client 导入原函数，不迁移编辑页/用户页。

## 3. 验证与收口

- [x] 3.1 运行 target OpenSpec strict、changes/specs strict 和 `git diff --check`。
- [x] 3.2 在 `web-admin` 运行增量 TypeScript 门禁、`yarn typecheck`、聚焦 Jest 覆盖率和 `yarn build`。
- [x] 3.3 记录验证结果与覆盖率，完成归档前 review。
- [x] 3.4 Archive change，并按单 change commit 收口；不 push/merge `test`。
