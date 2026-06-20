## ADDED Requirements

### Requirement: LLM AI/Gateway 治理规则列表页渐进迁移
Admin 前端 SHALL 支持将 LLM AI/Gateway 菜单下的治理规则列表页从 legacy JavaScript 渐进迁移为 TSX，并在不扩大到规则编辑器、表达式表格、组合规则或后端 wrapper 的前提下保持现有行为兼容。

#### Scenario: 治理规则列表页迁移
- **WHEN** 后续 change 触碰治理规则列表页
- **THEN** `RuleListPage` SHOULD 迁移为 `.tsx` 并使用明确局部类型描述 props、state、Rule 记录、Expression 记录、列表 fetch 参数、RuleBackend response 和 AntD 表格列
- **AND** 对应 React 测试 SHOULD 使用 `.test.tsx`
- **AND** 迁移 SHALL 保持 `/rules` 路由、权限、接口、文案、规则列表操作、新增默认规则、删除语义、分页回退、排序、表达式标签和编辑跳转行为不变
- **AND** 迁移 SHALL NOT 要求同一 change 迁移 `RuleBackend.js`、`RuleEditPage`、`CompoundRule`、表达式表格组件、MCP Server、MCP Store、站点范围、应用接入、组织账号或权限角色页面

#### Scenario: 治理规则列表页迁移验证
- **WHEN** `RuleListPage` 被迁移为 TSX
- **THEN** 增量 TypeScript gate、`yarn typecheck`、聚焦 Jest/coverage 和 `yarn build` 或等价导入边界验证 SHALL pass for touched TSX and JS coexistence paths
- **AND** 覆盖率证据 SHALL 以迁移后的 `RuleListPage.tsx` 和对应测试为重点，不得用全仓平均覆盖率替代受影响文件覆盖率
