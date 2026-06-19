## MODIFIED Requirements

### Requirement: 后续新增代码约定
Admin 前端后续新增 React 组件 SHALL 默认使用 `.tsx`；新增共享逻辑、接口模型和类型定义 SHALL 默认使用 `.ts`；既有 JS SHALL 只在被需求触及时渐进迁移。

#### Scenario: LLM AI/Gateway AI Agent 入口页迁移
- **WHEN** 后续 change 触碰 `LLM AI/Gateway` 菜单下的 AI Agent 入口页面
- **THEN** `AgentListPage` 和 `AgentEditPage` SHOULD 迁移为 `.tsx` 并使用明确局部类型描述 props、state、Agent 记录、列表 fetch 参数、表格列、路由参数和编辑表单字段
- **AND** 对应 React 测试 SHOULD 使用 `.test.tsx`
- **AND** 迁移 SHALL 保持 `/agents` 和 `/agents/:organizationName/:agentName` 路由、权限、接口、文案、`LlmAiGatewayCenter` 总览块、Agent 列表操作、编辑保存删除语义和页面行为不变
- **AND** 迁移 SHALL NOT 要求同一 change 迁移 `AgentBackend.js`、`LlmAiGatewayCenter` 视觉布局、MCP Server、MCP Store、入口配置、站点范围、治理规则、应用接入、组织账号或权限角色页面

#### Scenario: LLM AI/Gateway Agent migration is validated
- **WHEN** `AgentListPage` 和 `AgentEditPage` 被迁移为 TSX
- **THEN** 增量 TypeScript gate、`yarn typecheck`、聚焦 Jest/coverage 和 `yarn build` 或等价导入边界验证 SHALL pass for touched TSX and JS coexistence paths
- **AND** 覆盖率证据 SHALL 以迁移后的 Agent 页面和对应测试为重点，不得用全仓平均覆盖率替代受影响文件覆盖率
