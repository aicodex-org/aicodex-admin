## ADDED Requirements

### Requirement: LLM AI/Gateway 治理规则表达式表格渐进迁移
Admin 前端 SHALL 支持将 LLM AI/Gateway 治理规则表达式表格从 legacy JavaScript 渐进迁移为 TSX，并通过局部类型和聚焦测试证明迁移保持行为兼容。

#### Scenario: 表达式表格使用 TSX 和局部类型
- **WHEN** `WafRuleTable`、`IpRuleTable`、`UaRuleTable` 和 `IpRateRuleTable` 被迁移
- **THEN** 对应生产组件文件 SHALL 使用 `.tsx`
- **AND** 组件 props、state、规则行、字段 key、AntD 表格列和输入回调 SHALL 使用明确局部 TypeScript 类型
- **AND** 迁移 SHALL NOT use unexplained `any`
- **AND** 迁移 SHALL NOT 要求同一 change 迁移 `RuleEditPage.js`、`CompoundRule.js`、`RuleBackend.js` 或 TypeScript 基建

#### Scenario: 表达式表格迁移测试和验证
- **WHEN** 治理规则表达式表格迁移准备收口
- **THEN** 对应 React 测试 SHALL 使用 `.test.tsx`
- **AND** 聚焦测试 SHALL 覆盖默认规则、restore、添加、删除、上下移动、字段更新、IP tags 拼接、UA blur trim 和 IP rate number/string 转换
- **AND** 增量 TypeScript gate、`yarn typecheck`、focused Jest coverage、`git diff --check` 和必要的 `yarn build` SHALL pass for touched TSX and JS coexistence paths
- **AND** 覆盖率记录 SHALL 以迁移后的四个表格组件为统计对象，不得用全仓平均覆盖率替代受影响文件覆盖率
