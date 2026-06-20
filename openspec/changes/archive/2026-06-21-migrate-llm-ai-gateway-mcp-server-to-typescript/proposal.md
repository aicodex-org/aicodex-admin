## Why

`LLM AI/Gateway` 菜单下的 AI Agent 和入口配置页面已经按增量 TypeScript 路线迁移，但 MCP Server 列表和编辑页仍是 legacy JavaScript。MCP Server 是 MCP Store 之后的下一组核心管理页，迁移它可以继续减少该菜单的 JS surface，同时保持既有 Server API、路由、权限和页面行为不变。

## What Changes

- 将 `web-admin/src/ServerListPage.js` 迁移为 `ServerListPage.tsx`，为列表页 props、state、Server 记录、fetch 参数和 AntD 表格列补充局部 TypeScript 类型。
- 将 `web-admin/src/ServerEditPage.js` 迁移为 `ServerEditPage.tsx`，为路由参数、页面 state、Server/Organization/Application 记录、ToolTable 回调和编辑字段更新补充局部 TypeScript 类型。
- 保持 `ManagementPage.js` 对 `./ServerListPage`、`./ServerEditPage` 的无后缀 import 语义和 `/servers`、`/servers/:organizationName/:serverName` 路由不变。
- 新增聚焦 `.test.tsx` 覆盖 MCP Server 列表渲染、新增/删除、编辑页加载、保存、保存并退出、取消新增、删除和工具表更新关键路径。
- 不迁移 `ServerBackend.js`、`ServerStorePage.js`、`ToolTable.js`、站点范围、治理规则、规则表格或其它菜单页面。
- 不新增 API，不改后端接口，不改 MCP Server 保存/删除 payload shape，不触发 Gateway projection publish，不引入新 UI 库或视觉重设计。

## Capabilities

### New Capabilities

### Modified Capabilities
- `admin-enterprise-identity-llm-ai-gateway-center`: 增加 MCP Server 列表和编辑页 TSX 迁移后的行为兼容要求。
- `web-admin-incremental-typescript`: 增加 `LLM AI/Gateway` MCP Server 页面渐进迁移约束和验证场景。

## Impact

- 前端页面：
  - `web-admin/src/ServerListPage.js` -> `web-admin/src/ServerListPage.tsx`
  - `web-admin/src/ServerEditPage.js` -> `web-admin/src/ServerEditPage.tsx`
- 测试：
  - `web-admin/src/ServerListPage.test.tsx`
  - `web-admin/src/ServerEditPage.test.tsx`
- OpenSpec:
  - `openspec/changes/migrate-llm-ai-gateway-mcp-server-to-typescript/**`
- 不影响后端 API、数据库、认证/OIDC、Provider contract、Gateway projection、MCP Store、Entry、Site、Rule、真实密钥或生产/类生产配置。
