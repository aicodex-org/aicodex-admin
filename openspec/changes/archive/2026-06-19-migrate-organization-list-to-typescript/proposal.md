## Why

“组织账号”菜单下的组织列表页仍是 legacy JavaScript，承载组织分页、筛选、新建、删除、组织身份中心摘要入口和跳转到群组/用户/编辑页的核心入口。前序列表页迁移已经证明保守 TSX 迁移模式可行，下一步可以迁移组织列表，但不应把组织编辑页、组织树运营、目录质量和用户列表一起纳入。

## What Changes

- 将 `web-admin/src/OrganizationListPage.js` 迁移为 `OrganizationListPage.tsx`，为 props、state、组织记录、默认组织模板、fetch 参数和表格列补齐局部类型。
- 将 `web-admin/src/backend/OrganizationBackend.js` 迁移为 `OrganizationBackend.ts`，导出组织记录、mutation 和响应类型，保持所有 endpoint、参数顺序、HTTP 方法和 JSON 行为不变。
- 新增 `OrganizationListPage.test.tsx` 和 `OrganizationBackend.test.ts`，覆盖列表渲染、新建、删除分页回退、组织筛选、密码类型筛选、未授权、后端错误和 backend endpoint 契约。
- 更新 `web-admin-incremental-typescript` 主规格，记录“组织账号”菜单下组织列表页迁移规则。

## Capabilities

### New Capabilities

- 无。

### Modified Capabilities

- `web-admin-incremental-typescript`: 补充组织账号菜单组织列表页的渐进 TSX/TS 迁移约定。

## Impact

- Affected code:
  - `web-admin/src/OrganizationListPage.js` -> `web-admin/src/OrganizationListPage.tsx`
  - `web-admin/src/backend/OrganizationBackend.js` -> `OrganizationBackend.ts`
  - 新增 `web-admin/src/OrganizationListPage.test.tsx`
  - 新增 `web-admin/src/backend/OrganizationBackend.test.ts`
- 不迁移 `OrganizationEditPage.js`、`OrganizationTreeOperationsPage.js`、`OrganizationDirectoryQualityPage.js`、`UserListPage.js`、`GroupTreePage.js` 或其它组织账号页面。
- 不改变 `/organizations`、`/organizations/:organizationName`、`/trees/:organizationName`、`/organizations/:organizationName/users` 路由、权限、组织 API 契约、表格列或可见页面行为。
