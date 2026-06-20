## Why

“权限角色”菜单下的 Casbin 执行器编辑页仍由 legacy JavaScript 承载，且内嵌 `table/PolicyTable.js` 管理 policy 同步、添加、编辑、取消、删除和分页索引。既有评估已确认该部分不适合拆成单文件迁移：`EnforcerEditPage` 直接向 `PolicyTable` 传递 `enforcer`、`modelCfg` 和 `mode`，`PolicyTable` 又通过 `AdapterBackend` 执行 policy CRUD。

本 change 将二者作为一个高风险但边界清晰的交付单元迁移到 TSX，继续完成权限角色菜单 Casbin 执行器页面的渐进 TypeScript 路线。

## What Changes

- 将 `web-admin/src/EnforcerEditPage.js` 迁移为 `EnforcerEditPage.tsx`，保持 `/enforcers/:organizationName/:enforcerName` 加载、保存、保存并退出、取消新增、组织/model/adapter 切换和字段编辑行为不变。
- 将 `web-admin/src/table/PolicyTable.js` 迁移为 `PolicyTable.tsx`，保持 policy 同步、分页索引、行内编辑、取消回滚、新增、重复 policy 提示、保存、删除和 disabled states 不变。
- 新增执行器编辑页与策略表 focused `.test.tsx`，覆盖编辑页基础加载/保存/取消和 `PolicyTable` 的高风险策略路径。
- 保持 `ManagementPage.js` 和 `EnforcerEditPage` 的无后缀 import 语义不变。
- 不迁移 `AdapterBackend.js`、`EnforcerBackend.js`、`ModelBackend.js`、`OrganizationBackend.js` 或其它权限角色页面。

## Capabilities

### New Capabilities

- 无。

### Modified Capabilities

- `web-admin-incremental-typescript`: 增加权限角色菜单 Casbin 执行器编辑页和策略表的渐进 TSX 迁移要求，明确迁移必须保持执行器编辑、policy CRUD、路由、权限、接口和保存语义兼容。

## Impact

- 影响 `web-admin/src/EnforcerEditPage.*`、`web-admin/src/table/PolicyTable.*` 和对应 focused tests。
- 可能需要局部类型描述 account、route props、history/location、enforcer record、model/adapter records、modelCfg、policy row、pagination/index state 和 backend response。
- 不修改后端 API、Casbin policy 数据结构、权限模型、Adapter/Enforcer backend wrappers、真实环境配置、角色/权限/模型/适配器/授权关系与证据页面。
