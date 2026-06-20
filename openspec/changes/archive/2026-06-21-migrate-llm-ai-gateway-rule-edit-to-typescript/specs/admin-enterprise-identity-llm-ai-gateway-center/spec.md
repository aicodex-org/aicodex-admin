## ADDED Requirements

### Requirement: 治理规则编辑页 TSX 迁移保持行为兼容
Admin 企业认证中心 SHALL 支持将 LLM AI/Gateway 菜单下的治理规则编辑页迁移为 TSX，并保持 `/rules/:organizationName/:ruleName` 的现有管理员行为兼容。

#### Scenario: 治理规则编辑页迁移
- **WHEN** `RuleEditPage` 迁移为 `.tsx`
- **THEN** `/rules/:organizationName/:ruleName` 页面 SHALL 继续保持规则读取、管理员组织下拉、名称、类型、表达式、动作、状态码、原因、verbose 字段编辑和保存行为
- **AND** 类型切换 SHALL 继续清空 `expressions`
- **AND** 保存失败 SHALL 继续按当前规则 owner/name 跳转并重新读取规则
- **AND** 迁移 SHALL NOT 改变 Rule API 契约、保存 payload shape、Gateway projection publish 行为、规则列表、规则表格组件、组合规则组件、MCP Server、MCP Store 或站点范围页面

#### Scenario: 治理规则表达式入口保持兼容
- **WHEN** `RuleEditPage` 渲染不同治理规则类型
- **THEN** `WAF`、`IP`、`User-Agent`、`IP Rate Limiting` 和 `Compound` 类型 SHALL 继续分别渲染既有表达式表格或组合规则组件
- **AND** 子组件回传的表达式表 SHALL 继续通过 `onUpdateTable` 写回 `rule.expressions`
- **AND** 本迁移 SHALL NOT 要求同一 change 迁移任何表达式表格组件或 `CompoundRule`
