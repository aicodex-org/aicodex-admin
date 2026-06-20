## 验证日期

2026-06-20

## 2026-06-20 rebase 刷新验证

- 基线：`origin/hfl-test-base` = `52bc2b81bb18bcf6a0d165f5cb57f862e276ea7f`。
- 验证时提交（更新本记录前）：`eb13ab047e74d928d59463f1076c92f5835bcb53`。
- rebase：已将治理规则表达式表格 release candidate rebase 到最新基线；`origin/hfl-test-base..HEAD` 为 1 个 commit。
- 写集确认：本轮仍限定在 `WafRuleTable`、`IpRuleTable`、`UaRuleTable`、`IpRateRuleTable`、对应测试和 OpenSpec artifacts，未触碰 `RuleListPage`、`RuleEditPage`、`CompoundRule`、后端 wrapper、站点范围、MCP Store 或 MCP Server。
- 重新执行的验证包括 OpenSpec strict、增量 TypeScript gate、focused Jest、changed-file coverage、`yarn typecheck` 和 `yarn build`；结果见下方命令表。

## RED 证据

- `cd web-admin; yarn test --watchAll=false --runInBand --runTestsByPath src/table/RuleExpressionTables.test.tsx`
  - 结果：失败，符合预期。
  - 失败原因：迁移门禁测试断言 `WafRuleTable.tsx` 等 `.tsx` 文件存在、对应 `.js` 文件不存在；迁移前收到 `Expected: true / Received: false`。
  - 同次运行中四个行为测试已通过，说明测试能覆盖既有 JS 行为基线。
- `cd web-admin; yarn typecheck`
  - 结果：失败，符合预期。
  - 失败原因：新增 `RuleEditPage` 透传 props 兼容测试后，四个表达式表格 props 类型均提示 `ruleName` 不存在；这复现了组合 final-tree 中 `RuleEditPage.tsx` 调用表格组件的类型兼容问题。

## GREEN / 门禁验证

- `openspec validate migrate-llm-ai-gateway-rule-expression-tables-to-typescript --strict`
  - 结果：通过，目标 change valid。
- `openspec validate --changes --strict`
  - 结果：通过，4 个 active changes 全部 valid。
- `openspec validate --specs --strict`
  - 结果：通过，28 个 specs 全部 valid。
- `git diff --check origin/hfl-test-base...HEAD`
  - 结果：通过，无 whitespace/error marker 问题。
- `git diff --check`
  - 结果：通过，无 whitespace/error marker 问题。
- `cd web-admin; node scripts/check-incremental-typescript-gate.mjs --base origin/hfl-test-base`
  - 结果：通过，退出码 0。
- `cd web-admin; yarn typecheck`
  - 结果：通过，`tsc --noEmit` 成功。
- `cd web-admin; yarn test --watchAll=false --runInBand --runTestsByPath src/table/RuleExpressionTables.test.tsx`
  - 结果：通过，1 个 test suite、8 个 tests 全部通过。
- `cd web-admin; yarn build`
  - 结果：通过，生产构建成功。
  - 已知提示：`fs.F_OK` deprecation、Browserslist 数据过期、bundle size 较大；这些提示为现有构建环境提示，本 change 未修改依赖或构建配置。

## 覆盖率

命令：

```powershell
cd web-admin
yarn test --watchAll=false --runInBand --coverage --collectCoverageFrom=src/table/WafRuleTable.tsx --collectCoverageFrom=src/table/IpRuleTable.tsx --collectCoverageFrom=src/table/UaRuleTable.tsx --collectCoverageFrom=src/table/IpRateRuleTable.tsx --collectCoverageFrom=src/table/ruleExpressionRow.ts --runTestsByPath src/table/RuleExpressionTables.test.tsx
```

结果：

- All files: statements 96.66%，branches 87.5%，functions 97.77%，lines 96.5%。
- `WafRuleTable.tsx`: lines 97.05%。
- `IpRuleTable.tsx`: lines 95.91%。
- `UaRuleTable.tsx`: lines 94.87%。
- `IpRateRuleTable.tsx`: lines 100%。
- `ruleExpressionRow.ts`: lines 100%。

覆盖率统计对象为四个迁移后的生产组件文件和共享行类型文件；聚合 branch coverage 为 87.5%，聚合 statements/functions/lines 均超过 96%。其中 `WafRuleTable.tsx` 和 `UaRuleTable.tsx` 的单文件 branch coverage 为 75%，但 line coverage 分别为 97.05% 和 94.87%；本轮按既有 RC 口径保留为剩余覆盖率观察点，未为了覆盖率扩大行为改动。

## 证据层级与边界

- 本次验证覆盖源码类型检查、增量 TS 规则、聚焦单测/覆盖率、OpenSpec strict 校验和前端生产构建。
- 本 change 未修改后端接口、Rule API payload、权限、Gateway projection publish、真实配置或认证链路，因此未执行运行态后端/API smoke。
- `web-admin/build` 与 `web-admin/coverage` 为 ignored 产物，未纳入写集。

## 剩余风险

- `RuleEditPage.js`、`CompoundRule.js` 和 `RuleBackend.js` 仍是后续独立迁移候选，不属于本 change blocker。
- 本 change 保留 legacy 表格的原地数组更新和既有 `rowKey="index"` 行为；不可变更新或 row key 优化应另建行为重构 change。
