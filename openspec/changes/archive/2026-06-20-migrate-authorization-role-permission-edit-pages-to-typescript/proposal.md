## Why

“权限角色”菜单下 `角色编辑` 和 `权限编辑` 页面仍是 legacy JavaScript。它们承载保存、保存并退出、取消新增、删除、普通用户提交人校验、审批状态和模型/资源选择等关键行为，适合作为列表页之后的独立 TSX 迁移 change，但需要比列表页更明确的测试和边界控制。

## What Changes

- 将 `web-admin/src/RoleEditPage.js` 迁移为 `RoleEditPage.tsx`，保持 `/roles/:organizationName/:roleName` 路由、加载、字段编辑、保存、保存并退出、取消新增和删除行为不变。
- 将 `web-admin/src/PermissionEditPage.js` 迁移为 `PermissionEditPage.tsx`，保持 `/permissions/:organizationName/:permissionName` 路由、加载、模型加载、Application 资源加载、资源/动作/效果/状态编辑、普通用户 submitter 校验、保存、保存并退出、取消新增和删除行为不变。
- 新增 focused `.test.tsx`，覆盖两个编辑页的加载、默认新增对象、字段更新、保存/删除导航、权限编辑校验和审批状态关键路径。
- 保持 `ManagementPage.js` 对 `./RoleEditPage`、`./PermissionEditPage` 的无后缀 import 和现有路由不变。

## Capabilities

### New Capabilities

- 无。

### Modified Capabilities

- `web-admin-incremental-typescript`: 增加权限角色菜单角色/权限编辑页的渐进 TSX 迁移要求，明确迁移必须保持路由、权限、接口、文案、保存删除、审批和选择器行为兼容。

## Impact

- 影响 `web-admin/src/RoleEditPage.*`、`web-admin/src/PermissionEditPage.*` 和对应 focused tests。
- 不修改后端 API、权限模型、角色/权限列表页、授权关系与证据、Casbin 模型、Casbin 适配器、Casbin 执行器、`PolicyTable`、认证/OIDC、Gateway、Insight 或真实环境配置。
- 不迁移 `RoleBackend.js`、`PermissionBackend.js`、`ModelBackend.js`、`ApplicationBackend.js`、`OrganizationBackend.js`、`UserBackend.js`、`GroupBackend.js` 或共享选择器组件。
