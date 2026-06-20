## Why

治理规则迁移路线已经把列表页和普通表达式表格拆成独立候选 change；组合规则编辑器仍是 legacy JavaScript，并且承载候选规则加载和自引用过滤这一关键不变量。若直接把它并入 `RuleEditPage` 迁移，会扩大编辑页回归面，因此需要先单独迁移 `CompoundRule`。

## What Changes

- 将 `web-admin/src/common/CompoundRule.js` 迁移为 `CompoundRule.tsx`，补充 props、state、表达式行、Rule API 响应和 AntD 表格列的局部类型。
- 新增 `web-admin/src/common/CompoundRule.test.tsx`，覆盖默认 begin/and 表达式、候选规则加载、过滤当前规则、字段回写、添加、删除、上下移动、restore 和渲染入口。
- 保持 `RuleEditPage` 现有无后缀 import、`/rules/:organizationName/:ruleName` 编辑链路、组合规则 row shape、`onUpdateTable(table)` 回调、i18n key、按钮、文案和可见行为不变。
- 不迁移 `RuleEditPage.js`、`RuleBackend.js`、普通规则表达式表格、站点范围 `RuleTable`、MCP Store、MCP Server、入口配置、应用接入、组织账号或权限角色页面。
- 不新增 API，不修改后端 Rule API path/payload，不改变规则保存/删除语义、权限或 Gateway projection publish 行为。

## Capabilities

### New Capabilities

- 无。

### Modified Capabilities

- `admin-enterprise-identity-llm-ai-gateway-center`: 增加组合规则编辑器 TSX 迁移必须保持候选规则加载、自引用过滤和表达式回写行为兼容的要求。
- `web-admin-incremental-typescript`: 增加治理规则 `CompoundRule` 渐进迁移的测试、覆盖率和 JS/TS 共存约束。

## Impact

- 前端生产代码：`web-admin/src/common/CompoundRule.js -> CompoundRule.tsx`。
- 前端测试：新增 `web-admin/src/common/CompoundRule.test.tsx`。
- OpenSpec：新增本 change proposal、design、tasks、verification 和两个 delta spec。
- 不影响后端接口、数据库、认证/授权、OAuth/OIDC、Provider、Gateway projection、真实密钥或生产/类生产配置。
