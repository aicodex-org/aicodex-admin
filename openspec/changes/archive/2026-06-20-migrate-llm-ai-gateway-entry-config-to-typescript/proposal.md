## Why

LLM AI/Gateway 菜单已经完成 AI Agent 入口页的保守 TSX 迁移，下一步应按路线迁移低风险的入口配置管理页，继续减少该菜单下 legacy JS 页面数量。入口配置页承载 `/entries` 列表和编辑路径，本 change 只做 TypeScript 后缀和局部类型收口，避免改变管理员现有操作流。

## What Changes

- 将 `web-admin/src/EntryListPage.js` 迁移为 `EntryListPage.tsx`，保留列表、新增、删除、分页、搜索、排序、表格列和后端 API 调用行为。
- 将 `web-admin/src/EntryEditPage.js` 迁移为 `EntryEditPage.tsx`，保留读取、组织/应用下拉、字段编辑、保存、保存并退出、取消新增、删除和 404 跳转行为。
- 新增或迁移入口配置页面的聚焦 `.test.tsx` 测试，覆盖列表渲染、新增/删除和编辑页基础加载/保存关键路径。
- 保持 `ManagementPage.js` 现有路由和 import 语义，仅依赖扩展名解析，不做路由重构。
- 不迁移 `EntryPage.js` 登录入口容器、`EntryBackend.js`、MCP Server、MCP Store、站点范围、治理规则或规则表格组件。
- 不新增 API、不修改后端接口、不改变 Entry 保存/删除语义、不触发 Gateway projection publish、不引入新 UI 库或视觉重设计。

## Capabilities

### New Capabilities

- 无。

### Modified Capabilities

- `admin-enterprise-identity-llm-ai-gateway-center`: 明确入口配置页面迁移为 TSX 时必须保持 `/entries` 列表和编辑行为兼容，并且不扩大到 MCP、站点或规则页面。
- `web-admin-incremental-typescript`: 补充 LLM AI/Gateway 入口配置页面作为后续渐进 TS 迁移场景，约束测试、typecheck、coverage 和 build 验证。

## Impact

- 影响前端文件：`web-admin/src/EntryListPage.tsx`、`web-admin/src/EntryEditPage.tsx` 及对应 `.test.tsx`。
- 影响 OpenSpec 文档：本 change delta specs，归档后同步到 `admin-enterprise-identity-llm-ai-gateway-center` 与 `web-admin-incremental-typescript` 主规格。
- 不影响后端 API、数据库、权限、认证、OAuth/OIDC、Provider、Gateway projection、真实密钥或生产/类生产配置。
