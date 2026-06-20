## ADDED Requirements

### Requirement: LLM AI/Gateway 治理规则编辑页渐进迁移
Admin 前端 SHALL 支持将 LLM AI/Gateway 菜单下的治理规则编辑页从 legacy JavaScript 渐进迁移为 TSX，并在不扩大到后端 wrapper 或规则表达式组件的前提下保持现有行为兼容。

#### Scenario: 治理规则编辑页迁移
- **WHEN** 后续 change 触碰 `LLM AI/Gateway` 菜单下的治理规则编辑页
- **THEN** `RuleEditPage` SHOULD 迁移为 `.tsx` 并使用明确局部类型描述 props、route params、state、Rule 记录、表达式行、组织记录、后端响应和子组件回调
- **AND** 对应 React 测试 SHOULD 使用 `.test.tsx`
- **AND** 迁移 SHALL 保持 `/rules/:organizationName/:ruleName` 路由、`ManagementPage.js` 无后缀 import、权限、接口、文案、规则加载、字段编辑、表达式回写、保存成功和保存失败行为不变
- **AND** 迁移 SHALL NOT 要求同一 change 迁移 `RuleBackend.js`、`OrganizationBackend.js`、规则表达式表格组件、`CompoundRule`、规则列表、站点范围、MCP Server、MCP Store、应用接入、组织账号或权限角色页面

#### Scenario: 治理规则编辑页迁移验证
- **WHEN** `RuleEditPage` 被迁移为 TSX
- **THEN** 增量 TypeScript gate、`yarn typecheck`、聚焦 Jest/coverage 和 `yarn build` 或等价导入边界验证 SHALL pass for touched TSX and JS coexistence paths
- **AND** 覆盖率证据 SHALL 以迁移后的 `RuleEditPage.tsx` 和对应测试为重点，不得用全仓平均覆盖率替代受影响文件覆盖率
