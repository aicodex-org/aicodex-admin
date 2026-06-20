## Why

“权限角色”菜单下 `角色` 和 `权限` 列表页仍是 legacy JavaScript。Casbin 模型页面已完成 TSX 迁移，下一步适合迁移两个列表页：它们都是 `BaseListPage` 子类，主要负责表格展示、分页筛选排序、新增、删除、模板下载和 `.xlsx` 上传预览，风险低于角色/权限编辑页、Casbin 适配器和执行器。

## What Changes

- 将 `web-admin/src/RoleListPage.js` 迁移为 `RoleListPage.tsx`，保持 `/roles` 列表、分页筛选排序、新增、删除、编辑跳转、下载模板、上传预览和上传 endpoint 不变。
- 将 `web-admin/src/PermissionListPage.js` 迁移为 `PermissionListPage.tsx`，保持 `/permissions` 列表、分页筛选排序、新增、删除、编辑跳转、下载模板、上传预览、权限状态/效果展示和本地管理员/submitter fetch 分支不变。
- 新增 focused `.test.tsx`，覆盖两个列表页的核心表格行为、新增/删除、错误处理、上传预览和 fetch 参数。
- 保持 `ManagementPage.js` 对 `./RoleListPage`、`./PermissionListPage` 的无后缀 import 和现有路由不变。

## Capabilities

### New Capabilities

- 无。

### Modified Capabilities

- `web-admin-incremental-typescript`: 增加权限角色菜单角色/权限列表页的渐进 TSX 迁移要求，明确迁移必须保持路由、权限、接口、文案、上传和列表操作行为兼容。

## Impact

- 影响 `web-admin/src/RoleListPage.*`、`web-admin/src/PermissionListPage.*` 和对应 focused tests。
- 不修改后端 API、权限模型、角色/权限编辑页、授权关系与证据、Casbin 模型、Casbin 适配器、Casbin 执行器、`PolicyTable`、认证/OIDC、Gateway、Insight 或真实环境配置。
