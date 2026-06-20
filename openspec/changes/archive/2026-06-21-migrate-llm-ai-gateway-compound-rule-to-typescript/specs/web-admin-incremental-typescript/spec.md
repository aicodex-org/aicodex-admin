## ADDED Requirements

### Requirement: LLM AI/Gateway 组合规则渐进迁移
Admin 前端 SHALL 支持将 LLM AI/Gateway 治理规则下的 `CompoundRule` 组件作为独立 TSX migration change 渐进迁移，并保持 JS/TS 共存和现有行为兼容。

#### Scenario: 组合规则组件迁移
- **WHEN** 后续 change 触碰 `web-admin/src/common/CompoundRule`
- **THEN** `CompoundRule` SHOULD 单独迁移为 `.tsx`
- **AND** 对应测试 SHOULD 使用 `.test.tsx` 覆盖候选规则加载、自引用过滤、默认表达式、字段回写、添加、删除、上移、下移和 restore
- **AND** 迁移 SHALL NOT 要求同一 change 迁移 `RuleEditPage`、`RuleBackend.js`、WAF/IP/User-Agent/IP Rate Limiting 表达式表格或 TypeScript 基建

#### Scenario: 组合规则迁移验证
- **WHEN** `CompoundRule` 被迁移为 TSX 并准备 review
- **THEN** 增量 TypeScript gate、`yarn typecheck`、focused Jest/coverage 和 `yarn build` SHALL pass for touched TSX and JS coexistence paths
- **AND** 覆盖率证据 SHALL 以迁移后的 `CompoundRule.tsx` 为统计对象，不得用全仓平均覆盖率替代
