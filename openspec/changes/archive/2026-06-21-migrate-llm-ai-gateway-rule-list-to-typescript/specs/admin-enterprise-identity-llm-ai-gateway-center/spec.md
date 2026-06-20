## ADDED Requirements

### Requirement: 治理规则列表页 TSX 迁移保持行为兼容
Admin 企业认证中心 SHALL 支持将 LLM AI/Gateway 菜单下的治理规则列表页迁移为 TSX，并保持 `/rules` 列表入口、规则新增、删除、分页和编辑跳转的现有管理员行为兼容。

#### Scenario: 规则列表页迁移
- **WHEN** `RuleListPage` 迁移为 `.tsx`
- **THEN** `/rules` 页面 SHALL 继续展示规则表格、新增、删除、分页、排序、表达式标签、规则类型标签和加载态行为
- **AND** 页面 SHALL 继续通过现有 Rule API 边界读取、新增和删除规则
- **AND** 迁移 SHALL NOT 改变表格文案、路由、权限判断、规则新增默认值、Rule API payload shape 或 Gateway projection publish 行为

#### Scenario: 规则列表页迁移边界
- **WHEN** `RuleListPage` 作为治理规则第一步迁移
- **THEN** 本 change SHALL NOT 要求同时迁移 `RuleEditPage`、`CompoundRule`、WAF/IP/User-Agent/IP Rate Limiting 表达式表格或 `RuleBackend.js`
- **AND** 本 change SHALL NOT 触碰站点范围、MCP Store、MCP Server、入口配置、应用接入、组织账号或权限角色页面
