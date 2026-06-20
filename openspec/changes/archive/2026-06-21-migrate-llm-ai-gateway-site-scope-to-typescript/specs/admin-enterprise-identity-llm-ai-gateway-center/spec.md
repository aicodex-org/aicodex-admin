## ADDED Requirements

### Requirement: 站点范围页面 TSX 迁移保持行为兼容
Admin 企业认证中心 SHALL 支持将 LLM AI/Gateway 菜单下的站点范围管理页迁移为 TSX，并保持 `/sites` 列表、`/sites/:organizationName/:siteName` 编辑路径和站点规则选择表格的现有管理员行为兼容。

#### Scenario: 站点范围列表页迁移
- **WHEN** `SiteListPage` 迁移为 `.tsx`
- **THEN** `/sites` 页面 SHALL 继续展示站点表格、新增、编辑、删除、分页、排序、站点链接、证书链接、规则标签、节点状态和加载态行为
- **AND** 页面 SHALL 继续通过现有 Site API 边界读取、新增和删除站点
- **AND** 迁移 SHALL NOT 改变表格文案、路由、权限判断、站点新增默认值或 Gateway projection publish 行为

#### Scenario: 站点范围编辑页迁移
- **WHEN** `SiteEditPage` 迁移为 `.tsx`
- **THEN** `/sites/:organizationName/:siteName` 页面 SHALL 继续保持站点读取、组织下拉、证书下拉、规则选择、应用下拉、告警 provider、域名、端口、host、SSL 模式、状态和其它字段编辑行为
- **AND** 页面 SHALL 继续保持保存成功后的路由跳转和重新加载行为
- **AND** 页面 SHALL 继续保持保存失败时的错误提示和站点名称恢复语义
- **AND** 迁移 SHALL NOT 修改 Site 保存 payload shape、后端 API path、证书、应用、provider、规则治理编辑器、MCP Store 或 MCP Server 页面

#### Scenario: 站点规则选择表格迁移
- **WHEN** `RuleTable` 迁移为 `.tsx` 并在 `SiteEditPage` 中继续使用
- **THEN** 表格 SHALL 继续基于 `sources` 提供规则选项，并将选择结果回写为既有 `owner/name` 字符串数组
- **AND** 表格 SHALL 继续保持添加、删除、上移和下移规则行的行为
- **AND** 本迁移 SHALL NOT 要求同一 change 迁移 `RuleListPage`、`RuleEditPage`、`CompoundRule`、`WafRuleTable`、`IpRuleTable`、`UaRuleTable` 或 `IpRateRuleTable`
