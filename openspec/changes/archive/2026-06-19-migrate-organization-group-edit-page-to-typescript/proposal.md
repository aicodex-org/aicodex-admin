## Why

“组织账号”菜单下的群组列表和群组树已经迁移到 TSX，但群组编辑页仍是 legacy JavaScript。该页面承载 `/groups/:organizationName/:groupName` 的加载、保存、保存并退出、取消新增和删除行为，也是群组列表/树跳转后的编辑入口。继续保留 JS 会让后续群组层级、组织范围和编辑行为改动缺少类型保护。

## What Changes

- 将 `web-admin/src/GroupEditPage.js` 保守迁移为 `GroupEditPage.tsx`。
- 新增或迁移对应 React 测试为 `GroupEditPage.test.tsx`，覆盖加载、组织切换、父群组选项、保存成功/失败、保存并退出、取消新增、删除失败和网络错误。
- 在页面内补齐 props、state、路由参数、群组记录、组织记录和 backend 响应的局部类型。
- 保持 `/groups/:organizationName/:groupName` 路由、权限判断、文案、AntD 表单控件、后端 API 调用、session storage 返回逻辑和页面行为不变。
- 不迁移 `InvitationEditPage.js`、`SyncerEditPage.js`、`ManagementPage.js` 或其它组织账号/身份源页面。

## Capabilities

### New Capabilities

- 无。

### Modified Capabilities

- `web-admin-incremental-typescript`：补充“组织账号”菜单下群组编辑页的保守 TSX 迁移要求和验证场景。

## Impact

- Affected code:
  - `web-admin/src/GroupEditPage.js` -> `web-admin/src/GroupEditPage.tsx`
  - 新增 `web-admin/src/GroupEditPage.test.tsx`
- OpenSpec：新增本 change delta，并在 archive 后同步 `web-admin-incremental-typescript` 主规格。
- 不涉及后端 Go、数据库、真实组织数据、认证/OAuth/OIDC、Provider、Gateway、Insight、生产配置或 `test` 分支。
