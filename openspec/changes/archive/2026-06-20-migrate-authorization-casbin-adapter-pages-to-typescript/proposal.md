## Why

“权限角色”菜单下 `Casbin适配器` 列表页和编辑页仍是 legacy JavaScript。Casbin 模型页已完成 TSX 迁移，角色/权限列表和编辑页已有独立 release candidate；适配器页面相对执行器与 `PolicyTable` 风险更低，适合作为下一步独立 OpenSpec change。

## What Changes

- 将 `web-admin/src/AdapterListPage.js` 迁移为 `AdapterListPage.tsx`，保持 `/adapters` 路由、列表加载、分页筛选排序、新增适配器、删除适配器、内置对象删除保护、表格列和操作按钮行为不变。
- 将 `web-admin/src/AdapterEditPage.js` 迁移为 `AdapterEditPage.tsx`，保持 `/adapters/:organizationName/:adapterName` 路由、适配器加载、组织加载、字段编辑、`useSameDb` 切换、数据库连接测试、保存、保存并退出、取消新增和删除行为不变。
- 新增 focused `.test.tsx`，覆盖适配器列表/编辑页高价值行为、错误分支和导入边界。
- 保持 `ManagementPage.js` 对 `./AdapterListPage`、`./AdapterEditPage` 的无后缀 import 和现有路由不变。

## Capabilities

### New Capabilities

- 无。

### Modified Capabilities

- `web-admin-incremental-typescript`: 增加权限角色菜单 Casbin 适配器页面的渐进 TSX 迁移要求，明确迁移必须保持路由、权限、接口、文案、列表、编辑、保存删除和数据库连接测试行为兼容。

## Impact

- 影响 `web-admin/src/AdapterListPage.*`、`web-admin/src/AdapterEditPage.*` 和对应 focused tests。
- 不修改后端 API、权限模型、Casbin 模型页、角色/权限页面、授权关系与证据、Casbin 执行器、`PolicyTable`、认证/OIDC、Gateway、Insight 或真实环境配置。
- 不迁移 `AdapterBackend.js`、`BaseListPage.js`、`Setting.js`、`PopconfirmModal` 或共享表格/选择器组件。
