## Why

`LLM AI/Gateway` 治理规则链路已经完成拆分评估，评估结论要求先从低耦合的规则列表入口开始迁移。`RuleListPage.js` 仍是 legacy JavaScript，承担 `/rules` 列表、新增、删除、分页和编辑跳转，是治理规则 TSX 迁移的最小可验证入口。

## What Changes

- 将 `web-admin/src/RuleListPage.js` 迁移为 `RuleListPage.tsx`，保持 `/rules` 路由、列表表格、新增默认规则、删除、分页回退、排序、编辑跳转和文案行为不变。
- 新增 `web-admin/src/RuleListPage.test.tsx`，聚焦覆盖列表加载、现有 Rule API 参数边界、新增默认 User-Agent 规则、删除成功/失败、分页回退、表格列 render 和编辑跳转。
- 保留 `RuleBackend.js`、`RuleEditPage.js`、`CompoundRule.js`、WAF/IP/User-Agent/IP Rate Limiting 表达式表格组件和后端接口不变。
- 不新增 API，不修改 Rule payload shape、规则保存/删除语义、Gateway projection publish、权限、认证、MCP、站点范围、应用接入、组织账号或权限角色页面。

## Capabilities

### New Capabilities

- 无。

### Modified Capabilities

- `admin-enterprise-identity-llm-ai-gateway-center`: 增加治理规则列表页 TSX 迁移的行为兼容要求。
- `web-admin-incremental-typescript`: 增加 LLM AI/Gateway 治理规则列表页渐进迁移的 TypeScript 和验证要求。

## Impact

- 前端页面：`web-admin/src/RuleListPage.tsx`，删除对应 legacy `RuleListPage.js`。
- 前端测试：新增 `web-admin/src/RuleListPage.test.tsx`。
- OpenSpec：新增本 change 文档和两个 delta spec。
- 不影响后端 API、数据库、权限、真实密钥、生产/类生产配置或运行态数据。
