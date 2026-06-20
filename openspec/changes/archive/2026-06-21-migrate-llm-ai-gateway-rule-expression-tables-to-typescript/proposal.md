## Why

治理规则 TSX 迁移已经先完成低风险的 RuleList 页面；下一步需要把规则编辑链路中复用的表达式表格先迁移到 TSX，为后续 RuleEditPage 和 CompoundRule 迁移降低边界风险。四个表达式表格仍是 legacy JS，缺少局部类型和聚焦回归测试，后续编辑页迁移时会放大类型与行为回归风险。

## What Changes

- 将 `web-admin/src/table/WafRuleTable.js`、`IpRuleTable.js`、`UaRuleTable.js`、`IpRateRuleTable.js` 迁移为 `.tsx`。
- 为四个表格补充局部 TypeScript 类型，覆盖 props、state、规则行、字段更新和 AntD 表格列类型。
- 新增 `.test.tsx` 聚焦测试，覆盖默认规则、restore、添加、删除、上下移动、字段更新、IP tags 拼接、UA blur trim 和 IP rate number/string 转换等现有行为。
- 保持现有 UI、文案、回调、规则行 shape、默认规则、路由/import 解析和 RuleEditPage 对这些表格的调用方式不变。
- 不迁移 `RuleEditPage`、`CompoundRule`、`RuleBackend.js`、MCP Server、MCP Store、入口配置、站点范围、应用接入、组织账号或权限角色页面。

## Capabilities

### New Capabilities

- 无。

### Modified Capabilities

- `admin-enterprise-identity-llm-ai-gateway-center`: 记录 LLM AI/Gateway 治理规则表达式表格迁移为 TSX 时必须保持的可见行为和边界。
- `web-admin-incremental-typescript`: 记录治理规则表达式表格作为渐进 TSX 迁移的新增约束和验证要求。

## Impact

- Affected code: `web-admin/src/table/WafRuleTable.*`、`IpRuleTable.*`、`UaRuleTable.*`、`IpRateRuleTable.*` 及对应 `.test.tsx`。
- APIs/backends: 无新增或修改；`RuleBackend.js` 和后端接口保持不变。
- Dependencies/config: 不修改 `package.json`、lockfile、`tsconfig.json` 或构建基础设施。
- Validation: OpenSpec strict 校验、增量 TS gate、`yarn typecheck`、聚焦 Jest coverage；如导入边界受迁移影响，运行 `yarn build`。
