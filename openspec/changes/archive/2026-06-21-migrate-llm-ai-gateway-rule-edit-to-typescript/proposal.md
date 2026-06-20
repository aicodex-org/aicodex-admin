## Why

LLM AI/Gateway 菜单下的治理规则编辑页仍是 legacy `RuleEditPage.js`，而同一路线的 AI Agent、入口配置以及多个治理规则相关 RC 已经按增量 TypeScript 方式推进。继续迁移该编辑页可以补齐治理规则页面级入口，同时保持后端 API、规则表格组件和组合规则组件的现有边界不变。

## What Changes

- 将 `web-admin/src/RuleEditPage.js` 迁移为 `web-admin/src/RuleEditPage.tsx`。
- 新增聚焦 `.test.tsx`，覆盖规则加载、组织加载、字段编辑、类型切换、表达式回写、保存成功/失败和表格/组合规则渲染入口。
- 保持 `ManagementPage.js` 的无后缀 import、`/rules/:organizationName/:ruleName` 路由、权限、文案、Rule API 调用和页面行为不变。
- 不迁移 `RuleBackend.js`、`OrganizationBackend.js`、`WafRuleTable`、`IpRuleTable`、`UaRuleTable`、`IpRateRuleTable`、`CompoundRule` 或其它治理规则页面。

## Capabilities

### New Capabilities

无。

### Modified Capabilities

- `admin-enterprise-identity-llm-ai-gateway-center`: 增加治理规则编辑页 TSX 迁移的行为兼容要求。
- `web-admin-incremental-typescript`: 增加 LLM AI/Gateway 治理规则编辑页渐进 TypeScript 迁移和验证要求。

## Impact

- Affected code: `web-admin/src/RuleEditPage.tsx`、`web-admin/src/RuleEditPage.test.tsx`。
- Affected docs/specs: 本 change 的 OpenSpec artifacts 和两个 delta specs。
- API impact: 无新增 API；不改变 `RuleBackend.updateRule/getRule`、`OrganizationBackend.getOrganizations` 的调用边界或 payload shape。
- Security/config impact: 不触碰 secrets、真实环境配置、Gateway projection publish、认证/OIDC、生产/类生产配置或破坏性数据操作。
