## ADDED Requirements

### Requirement: LLM AI 网关编辑页内部表单布局一致性
LLM AI / Gateway 长编辑页 SHALL 使用 scoped 页面和编辑卡片 hook 约束内部表单布局，使普通字段行在桌面端保持稳定 label/control 列，在窄屏端可换行且不得产生页面级横向 overflow。

#### Scenario: 桌面端普通字段行列宽稳定
- **WHEN** 管理员在 1280px 桌面宽度访问 `/agents/:organizationName/:agentName`、`/entries/:organizationName/:entryName`、`/servers/:organizationName/:serverName`、`/sites/:organizationName/:siteName` 或 `/rules/:organizationName/:ruleName`
- **THEN** 页面 SHALL 暴露稳定的 LLM AI / Gateway 编辑页 class hook
- **AND** 主编辑卡片 SHALL 暴露稳定的 scoped card class hook
- **AND** 普通字段行 SHALL 不再依赖 2/22 的旧式视觉列宽造成 label 挤压或内容列不稳定

#### Scenario: 窄屏端不产生页面级横向溢出
- **WHEN** 管理员在窄屏访问上述编辑页
- **THEN** scoped 编辑卡片内的普通字段行 SHALL 允许 label 和 control 换行
- **AND** 页面级内容 SHALL NOT 因普通字段行产生横向 overflow

#### Scenario: scoped 样式不影响嵌套编辑器
- **WHEN** `RuleEditPage` 渲染 WAF、IP、User-Agent、IP Rate Limiting 或 Compound 表达式编辑器
- **THEN** scoped 编辑页样式 SHALL NOT 粗暴改写嵌套表格或表达式编辑器内部布局
- **AND** 本 change SHALL NOT 修改 Rule API 契约、表达式 table shape、保存 payload、路由、权限或 Gateway projection publish 行为
