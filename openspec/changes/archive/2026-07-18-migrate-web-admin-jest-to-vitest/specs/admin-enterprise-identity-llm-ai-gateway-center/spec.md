## MODIFIED Requirements

### Requirement: MCP Server 页面 TSX 迁移保持行为兼容
Admin 企业认证中心 SHALL 支持将 LLM AI/Gateway 菜单下的 MCP Server 列表和编辑页迁移为 TSX，并保持 `/servers` 列表和编辑路径的现有管理员行为兼容。

#### Scenario: MCP Server 列表页迁移
- **WHEN** `ServerListPage` 迁移为 `.tsx`
- **THEN** `/servers` 页面 SHALL 继续展示 MCP Server 表格、新增、编辑、删除、分页、搜索、排序和 MCP Store 跳转行为
- **AND** 页面 SHALL 继续通过现有 Server API 边界读取、新增和删除 MCP Server
- **AND** 迁移 SHALL NOT 改变表格文案、路由、权限判断、MCP Store 路由或 Gateway projection publish 行为

#### Scenario: MCP Server 编辑页迁移
- **WHEN** `ServerEditPage` 迁移为 `.tsx`
- **THEN** `/servers/:organizationName/:serverName` 页面 SHALL 继续保持 MCP Server 读取、组织/应用下拉、名称、显示名、URL、访问令牌、应用、工具表、Base URL 展示、保存、保存并退出、取消新增、删除和 404 跳转行为
- **AND** 迁移 SHALL NOT 修改 Server 保存/删除 payload shape、后端 API path、ToolTable 运行时行为、MCP Store、站点范围、治理规则或规则表格组件

#### Scenario: MCP Server 迁移验证
- **WHEN** 本 change 迁移 MCP Server 页面
- **THEN** 对应 React 测试 SHALL 使用 `.test.tsx` 并覆盖列表页渲染、新增、删除、MCP Store 跳转、编辑页加载、保存、保存并退出、取消新增、删除和 ToolTable 更新关键路径
- **AND** 验证 SHALL 包含增量 TypeScript gate、`bun run typecheck`、聚焦Vitest/coverage、`bun run build`或等价导入边界验证
