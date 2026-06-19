## Why

“组织账号”菜单下的用户列表页仍是 legacy JavaScript，但它是管理员查看、筛选、新建、删除、导入用户以及在组织树中移出用户的核心入口。前序列表页迁移已经形成可复用的保守模式，下一步可以迁移用户列表页，但应避免把用户编辑、验证码、MFA、登录和购物车等更广的用户链路一起纳入。

## What Changes

- 将 `web-admin/src/UserListPage.js` 迁移为 `UserListPage.tsx`，为 props、state、用户记录、组织记录、默认用户模板、fetch 参数、上传预览和表格列补齐局部类型。
- 保持 `UserBackend.js` 为 legacy JS，本 change 只在页面内用局部兼容类型约束本页调用的 `getGlobalUsers`、`getUsers`、`addUser`、`deleteUser`、`removeUserFromGroup` 和 `impersonateUser`，避免扩大到验证码、MFA、登录、购物车和用户编辑链路。
- 新增 `UserListPage.test.tsx`，覆盖用户列表渲染、全局/组织/群组 fetch、新建、删除、移出群组、冒充、上传预览、下载模板、未授权和后端错误路径。
- 更新 `web-admin-incremental-typescript` 主规格，记录“组织账号”菜单下用户列表页迁移规则。

## Capabilities

### New Capabilities

- 无。

### Modified Capabilities

- `web-admin-incremental-typescript`: 补充组织账号菜单用户列表页的渐进 TSX 迁移约定。

## Impact

- Affected code:
  - `web-admin/src/UserListPage.js` -> `web-admin/src/UserListPage.tsx`
  - 新增 `web-admin/src/UserListPage.test.tsx`
- 不迁移 `UserBackend.js`、`UserEditPage.js`、`GroupTreePage.js`、`OrganizationEditPage.js` 或其它组织账号页面。
- 不改变 `/users`、`/organizations/:organizationName/users`、`GroupTreePage` 内嵌用户列表、用户编辑路由、上传接口、冒充接口、删除/移出群组接口或可见页面行为。
