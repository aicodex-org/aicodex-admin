## ADDED Requirements

### Requirement: LLM AI/Gateway MCP Store 页面渐进迁移
Admin 前端 SHALL 支持将 LLM AI/Gateway 菜单下的 MCP Store 页面从 legacy JavaScript 渐进迁移为 TSX，并在不扩大到 MCP Server 管理或其它网关页面的前提下保持现有行为兼容。

#### Scenario: MCP Store 页面迁移
- **WHEN** 后续 change 触碰 `LLM AI/Gateway` 菜单下的 MCP Store 页面
- **THEN** `ServerStorePage` SHOULD 迁移为 `.tsx` 并使用明确局部类型描述 props、state、线上 Server 原始响应、归一化目录项、标签筛选和创建 Server payload
- **AND** 对应 React 测试 SHOULD 使用 `.test.tsx`
- **AND** 迁移 SHALL 保持 `/server-store` 路由、权限、接口、文案、目录加载、筛选、刷新、空态、加载态、创建 Server 和跳转行为不变
- **AND** 迁移 SHALL NOT 要求同一 change 迁移 `ServerBackend.js`、`ServerListPage.js`、`ServerEditPage.js`、入口配置、站点范围、治理规则、规则表格、应用接入、组织账号或权限角色页面

#### Scenario: MCP Store 迁移验证
- **WHEN** `ServerStorePage` 被迁移为 TSX
- **THEN** 增量 TypeScript gate、`yarn typecheck`、聚焦 Jest/coverage 和 `yarn build` 或等价导入边界验证 SHALL pass for touched TSX and JS coexistence paths
- **AND** 覆盖率证据 SHALL 以迁移后的 MCP Store 页面和对应测试为重点，不得用全仓平均覆盖率替代受影响文件覆盖率
