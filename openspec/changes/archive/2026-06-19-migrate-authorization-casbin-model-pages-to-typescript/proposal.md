## Why

“权限角色”菜单仍有多页 legacy JavaScript，其中 `Casbin模型` 页面由 `ModelListPage.js`、`ModelEditPage.js` 和 `CasbinEditor.js` 共同承载。该页面风险低于角色/权限、适配器和执行器：它只维护 Casbin model 文本，不改后端权限模型或策略执行语义，适合作为权限角色菜单 TypeScript 迁移路线的第一个交付单元。

## What Changes

- 将 `web-admin/src/ModelListPage.js` 迁移为 `ModelListPage.tsx`，保持 `/models` 列表、分页筛选排序、新增、删除、编辑跳转、内嵌 model text 预览和后端 API 调用不变。
- 将 `web-admin/src/ModelEditPage.js` 迁移为 `ModelEditPage.tsx`，保持 `/models/:organizationName/:modelName` 加载、保存、保存并退出、取消新增、组织/name/displayName/description/modelText 编辑语义不变。
- 将 `web-admin/src/CasbinEditor.js` 迁移为 `CasbinEditor.tsx`，保持 Basic/Advanced tabs、iframe editor 同步、内置对象只读保护和 `onModelTextChange` 回调不变。
- 新增或迁移 Casbin 模型相关 React tests 为 `.test.tsx`，覆盖列表页渲染/新增/删除、编辑页基础加载/保存、`CasbinEditor` tab 与文本同步。
- 保持 `ManagementPage.js` 对 `./ModelListPage`、`./ModelEditPage` 的无后缀 import 和现有路由不变。

## Capabilities

### New Capabilities

- 无。

### Modified Capabilities

- `web-admin-incremental-typescript`: 增加权限角色菜单 Casbin 模型页面的渐进 TSX 迁移要求，明确迁移必须保持路由、权限、接口、文案和 Casbin model 保存语义兼容。

## Impact

- 影响 `web-admin/src/ModelListPage.*`、`web-admin/src/ModelEditPage.*`、`web-admin/src/CasbinEditor.*` 和对应 focused tests。
- 可能需要最小 import 类型适配，但不应重构 `ManagementPage.js` 路由语义。
- 不修改后端 API、权限模型、Casbin model 保存语义、角色/权限/授权关系与证据/适配器/执行器页面、认证/OIDC、Gateway、Insight 或真实环境配置。
