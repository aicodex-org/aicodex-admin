## Why

`LLM AI/Gateway` 菜单下的 AI Agent、入口配置和部分 MCP 页面已按增量 TypeScript 路线迁移；站点范围页面仍停留在 legacy JavaScript，且 `SiteEditPage` 依赖的 `RuleTable` 会影响站点规则选择的类型边界。现在应把站点范围作为独立低耦合 change 迁移，避免和治理规则编辑器的大组件组混在一起。

## What Changes

- 将 `web-admin/src/SiteListPage.js` 迁移为 `SiteListPage.tsx`，保持 `/sites` 路由、站点列表、新增、编辑、删除、分页、排序、链接和文案行为不变。
- 将 `web-admin/src/SiteEditPage.js` 迁移为 `SiteEditPage.tsx`，保持 `/sites/:organizationName/:siteName` 路由、站点加载、证书/规则/应用/provider 下拉、字段编辑、保存和错误恢复语义不变。
- 将 `web-admin/src/table/RuleTable.js` 迁移为 `RuleTable.tsx`，仅覆盖站点编辑页内的规则选择表格，保持添加、删除、上下移动和 `owner/name` 字符串数组回写行为不变。
- 新增聚焦 `.test.tsx` 测试覆盖站点列表、站点编辑和规则选择表格的关键路径，并记录 changed-file coverage。
- 不迁移 `RuleListPage`、`RuleEditPage`、`CompoundRule`、`WafRuleTable`、`IpRuleTable`、`UaRuleTable`、`IpRateRuleTable`、MCP Store、MCP Server、后端 wrapper、应用接入或 Gateway projection 相关代码。

## Capabilities

### New Capabilities

- 无。

### Modified Capabilities

- `admin-enterprise-identity-llm-ai-gateway-center`: 增加站点范围页面 TSX 迁移的行为兼容要求。
- `web-admin-incremental-typescript`: 增加 LLM AI/Gateway 站点范围页面渐进迁移的 TypeScript 和验证要求。

## Impact

- 前端页面：`web-admin/src/SiteListPage.tsx`、`web-admin/src/SiteEditPage.tsx`、`web-admin/src/table/RuleTable.tsx`。
- 前端测试：新增 `SiteListPage.test.tsx`、`SiteEditPage.test.tsx`，必要时新增 `table/RuleTable.test.tsx`。
- OpenSpec：新增本 change 文档和两个 delta spec。
- 不新增 API，不修改后端接口、权限、站点保存/删除语义、规则治理编辑器、Gateway projection publish、生产/类生产配置或真实 secret。
