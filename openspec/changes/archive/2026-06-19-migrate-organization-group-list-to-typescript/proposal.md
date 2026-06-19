## Why

“组织账号”菜单下的群组列表页仍是 legacy JavaScript，且承载群组分页、筛选、上传导入、新建和删除入口。邀请码列表迁移已经形成可复用的低风险 TSX 迁移模式，下一步应继续沿同一路线迁移群组列表，但避免一次性把群组树、编辑页和用户列表一起纳入。

## What Changes

- 将 `web-admin/src/GroupListPage.js` 迁移为 `GroupListPage.tsx`，为 props、state、群组记录、上传预览、fetch 参数和表格列补齐局部类型。
- 将 `web-admin/src/backend/GroupBackend.js` 迁移为 `GroupBackend.ts`，导出群组记录、mutation 和响应类型，保持所有 endpoint、参数顺序、HTTP 方法和 JSON 行为不变。
- 新增 `GroupListPage.test.tsx` 和 `GroupBackend.test.ts`，覆盖列表渲染、新建、删除分页回退、组织筛选、类型筛选、上传预览/上传结果、未授权、网络错误和 backend endpoint 契约。
- 更新 `web-admin-incremental-typescript` 主规格，记录“组织账号”菜单下群组列表页迁移规则。

## Capabilities

### New Capabilities

- 无。

### Modified Capabilities

- `web-admin-incremental-typescript`: 补充组织账号菜单群组列表页的渐进 TSX/TS 迁移约定。

## Impact

- Affected code:
  - `web-admin/src/GroupListPage.js` -> `web-admin/src/GroupListPage.tsx`
  - `web-admin/src/backend/GroupBackend.js` -> `web-admin/src/backend/GroupBackend.ts`
  - 新增 `web-admin/src/GroupListPage.test.tsx`
  - 新增 `web-admin/src/backend/GroupBackend.test.ts`
- 不迁移 `GroupTreePage.js`、`GroupEditPage.js`、`UserListPage.js` 或其它组织账号页面。
- 不改变 `/groups`、`/groups/:organizationName/:groupName`、`/trees/:organizationName` 路由、权限、群组 API 契约、上传 endpoint 或可见页面行为。
