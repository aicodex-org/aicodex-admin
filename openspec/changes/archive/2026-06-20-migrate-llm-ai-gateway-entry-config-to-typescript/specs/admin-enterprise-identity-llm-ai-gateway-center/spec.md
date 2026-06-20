## ADDED Requirements

### Requirement: 入口配置页面 TSX 迁移保持行为兼容
Admin 企业认证中心 SHALL 支持将 LLM AI/Gateway 菜单下的入口配置管理页迁移为 TSX，并保持 `/entries` 列表和编辑路径的现有管理员行为兼容。

#### Scenario: 入口配置列表页迁移
- **WHEN** `EntryListPage` 迁移为 `.tsx`
- **THEN** `/entries` 页面 SHALL 继续展示入口配置表格、新增、编辑、删除、分页、搜索和排序行为
- **AND** 页面 SHALL 继续通过现有 Entry API 边界读取、新增和删除入口配置
- **AND** 迁移 SHALL NOT 改变表格文案、路由、权限判断或 Gateway projection publish 行为

#### Scenario: 入口配置编辑页迁移
- **WHEN** `EntryEditPage` 迁移为 `.tsx`
- **THEN** `/entries/:organizationName/:entryName` 页面 SHALL 继续保持入口配置读取、组织/应用下拉、名称、显示名、监听 URL、访问令牌、应用、消息字段编辑、保存、保存并退出、取消新增、删除和 404 跳转行为
- **AND** 迁移 SHALL NOT 修改 Entry 保存/删除 payload shape、后端 API path、认证入口容器、MCP Server、MCP Store、站点范围、治理规则或规则表格组件

#### Scenario: 认证入口容器不纳入菜单迁移
- **WHEN** 本 change 迁移 LLM AI/Gateway 菜单下的入口配置页面
- **THEN** `EntryPage.js` SHALL 保持在本迁移范围之外，因为该文件负责登录、注册、OAuth、SAML、CAS、支付、二维码、验证码和其它认证入口路由
- **AND** 本 change SHALL NOT 改变认证入口路由、主题更新、定价购买流程或登录状态跳转行为
