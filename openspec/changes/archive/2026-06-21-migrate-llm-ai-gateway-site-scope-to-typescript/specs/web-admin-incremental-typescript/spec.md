## ADDED Requirements

### Requirement: LLM AI/Gateway 站点范围页面渐进迁移
Admin 前端 SHALL 支持将 LLM AI/Gateway 菜单下的站点范围页面从 legacy JavaScript 渐进迁移为 TSX，并在不扩大到治理规则编辑器、MCP 页面或后端 wrapper 的前提下保持现有行为兼容。

#### Scenario: 站点范围页面迁移
- **WHEN** 后续 change 触碰 `LLM AI/Gateway` 菜单下的站点范围页面
- **THEN** `SiteListPage` 和 `SiteEditPage` SHOULD 迁移为 `.tsx` 并使用明确局部类型描述 props、state、Site 记录、Rule 记录、列表 fetch 参数、表格列、路由参数和编辑表单字段
- **AND** `RuleTable` SHOULD 迁移为 `.tsx` 并使用明确 props 类型描述规则来源、站点已选规则和 `onUpdateRules` 回调
- **AND** 对应 React 测试 SHOULD 使用 `.test.tsx`
- **AND** 迁移 SHALL 保持 `/sites` 和 `/sites/:organizationName/:siteName` 路由、权限、接口、文案、站点列表操作、编辑保存语义、规则选择表格和页面行为不变
- **AND** 迁移 SHALL NOT 要求同一 change 迁移 `SiteBackend.js`、`RuleBackend.js`、`ApplicationBackend.js`、`ProviderBackend.js`、`CertBackend.js`、治理规则编辑器、MCP Server、MCP Store、应用接入、组织账号或权限角色页面

#### Scenario: 站点范围迁移验证
- **WHEN** `SiteListPage`、`SiteEditPage` 和 `RuleTable` 被迁移为 TSX
- **THEN** 增量 TypeScript gate、`yarn typecheck`、聚焦 Jest/coverage 和 `yarn build` 或等价导入边界验证 SHALL pass for touched TSX and JS coexistence paths
- **AND** 覆盖率证据 SHALL 以迁移后的站点范围页面、规则选择表格和对应测试为重点，不得用全仓平均覆盖率替代受影响文件覆盖率
