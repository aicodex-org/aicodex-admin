## Why

“权限角色”菜单下的 Casbin 执行器页面仍包含 legacy JavaScript。既有评估已确认 `EnforcerListPage.js` 是低风险列表页：它继承 `BaseListPage`，通过 `EnforcerBackend` 完成列表、创建和删除，并跳转到执行器编辑页；高风险的 `EnforcerEditPage.js` 与 `table/PolicyTable.js` 策略 CRUD 不应混入本 change。

本 change 先迁移执行器列表页，继续推进权限角色菜单的渐进 TypeScript 路线，同时保持 JS/TS 共存、路由和接口行为兼容。

## What Changes

- 将 `web-admin/src/EnforcerListPage.js` 迁移为 `EnforcerListPage.tsx`，保持 `/enforcers` 列表、分页筛选排序、新增、删除、编辑跳转、Model/Adapter 链接和内置对象删除保护不变。
- 新增执行器列表页 focused React tests，测试文件使用 `.test.tsx`，覆盖模块后缀迁移、表格渲染、链接列、新增跳转、删除刷新、错误处理、授权拒绝和默认组织筛选参数。
- 保持 `ManagementPage.js` 对 `./EnforcerListPage` 的无后缀 import 语义和 `/enforcers` 路由不变。
- 不迁移 `EnforcerEditPage.js`、`table/PolicyTable.js`、`AdapterBackend.js`、`EnforcerBackend.js` 或其它权限角色页面。

## Capabilities

### New Capabilities

- 无。

### Modified Capabilities

- `web-admin-incremental-typescript`: 增加权限角色菜单 Casbin 执行器列表页的渐进 TSX 迁移要求，明确迁移必须保持执行器列表行为、路由、权限、接口和删除保护兼容。

## Impact

- 影响 `web-admin/src/EnforcerListPage.*` 和对应 focused tests。
- 可能需要最小局部类型来描述 account、history、pagination、enforcer record、fetch params、table columns 和 backend response。
- 不修改后端 API、权限模型、Casbin policy CRUD、执行器编辑页、`PolicyTable`、角色/权限/适配器页面、认证/OIDC、Gateway、Insight 或真实环境配置。
