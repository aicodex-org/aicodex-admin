## 1. OpenSpec

- [x] 1.1 创建 `migrate-organization-user-list-to-typescript` change，补齐 proposal、design、tasks 和 spec delta。
- [x] 1.2 完成实施前 review，确认范围仅覆盖用户列表页，`UserBackend.js` 保持 legacy JS。

## 2. 实现

- [x] 2.1 将 `web-admin/src/UserListPage.js` 迁移为 `UserListPage.tsx`，补齐 props、state、用户记录、组织记录、默认用户模板、fetch 参数、上传状态和表格列类型。
- [x] 2.2 为 `BaseListPage.js`、`UserBackend.js`、`OrganizationBackend.js`、`xlsx` 和上传预览补充局部兼容类型，保持 JS 调用方导入路径和运行时行为不变。
- [x] 2.3 新增 `UserListPage.test.tsx`，覆盖列表渲染、全局/组织/群组 fetch、新建、删除、移出群组、冒充、上传预览、下载模板、未授权和后端错误路径。
- [x] 2.4 确认 `ManagementPage.js`、`FormEditPage.js`、`GroupTreePage.js` 和其它 JS 调用方继续能从 TSX 页面导入默认导出，不迁移编辑页/树页。

## 3. 验证与收口

- [x] 3.1 运行 target OpenSpec strict、changes/specs strict 和 `git diff --check`。
- [x] 3.2 在 `web-admin` 运行增量 TypeScript 门禁、`yarn typecheck`、聚焦 Jest 覆盖率和 `yarn build`。
- [x] 3.3 记录验证结果与覆盖率，完成归档前 review。
- [x] 3.4 Archive change，并按单 change commit 收口；不 push/merge `test`。
