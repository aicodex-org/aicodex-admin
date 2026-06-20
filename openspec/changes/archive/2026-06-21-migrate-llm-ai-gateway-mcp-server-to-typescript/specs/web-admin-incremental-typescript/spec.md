## ADDED Requirements

### Requirement: LLM AI/Gateway MCP Server 页面渐进迁移
Admin 前端 SHALL 支持将 LLM AI/Gateway 菜单下的 MCP Server 页面从 legacy JavaScript 渐进迁移为 TSX，并在不扩大到 MCP Store、站点范围、治理规则或后端 wrapper 的前提下保持现有行为兼容。

#### Scenario: MCP Server 页面迁移
- **WHEN** 后续 change 触碰 `LLM AI/Gateway` 菜单下的 MCP Server 列表和编辑页面
- **THEN** `ServerListPage` 和 `ServerEditPage` SHOULD 迁移为 `.tsx` 并使用明确局部类型描述 props、state、Server 记录、Tool 记录、列表 fetch 参数、表格列、路由参数和编辑表单字段
- **AND** 对应 React 测试 SHOULD 使用 `.test.tsx`
- **AND** 迁移 SHALL 保持 `/servers` 和 `/servers/:organizationName/:serverName` 路由、权限、接口、文案、Server 列表操作、MCP Store 跳转、编辑保存删除语义和页面行为不变
- **AND** 迁移 SHALL NOT 要求同一 change 迁移 `ServerBackend.js`、`ServerStorePage.js`、`ToolTable.js`、站点范围、治理规则、规则表格、应用接入、组织账号或权限角色页面

#### Scenario: MCP Server 迁移验证
- **WHEN** `ServerListPage` 和 `ServerEditPage` 被迁移为 TSX
- **THEN** 增量 TypeScript gate、`yarn typecheck`、聚焦 Jest/coverage 和 `yarn build` 或等价导入边界验证 SHALL pass for touched TSX and JS coexistence paths
- **AND** 覆盖率证据 SHALL 以迁移后的 MCP Server 页面和对应测试为重点，不得用全仓平均覆盖率替代受影响文件覆盖率
