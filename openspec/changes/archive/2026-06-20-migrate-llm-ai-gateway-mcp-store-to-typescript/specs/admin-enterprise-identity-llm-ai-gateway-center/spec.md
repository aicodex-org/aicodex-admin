## ADDED Requirements

### Requirement: MCP Store 页面 TSX 迁移保持行为兼容
Admin 企业认证中心 SHALL 支持将 LLM AI/Gateway 菜单下的 MCP Store 目录页迁移为 TSX，并保持 `/server-store` 的线上目录浏览、筛选和创建本地 MCP Server 行为兼容。

#### Scenario: MCP Store 目录页迁移
- **WHEN** `ServerStorePage` 迁移为 `.tsx`
- **THEN** `/server-store` 页面 SHALL 继续展示 MCP Store 标题、名称筛选、标签筛选、清空筛选、刷新、加载态、空态和线上目录卡片
- **AND** 页面 SHALL 继续通过现有 Server API 边界读取线上 MCP Server 目录
- **AND** 迁移 SHALL NOT 改变路由、权限判断、页面文案或 Gateway projection publish 行为

#### Scenario: MCP Store 创建本地 Server
- **WHEN** 管理员从线上目录项点击添加
- **THEN** 页面 SHALL 继续使用当前组织、归一化 server 名称、production endpoint、displayName 和空 application 创建本地 MCP Server 草稿
- **AND** 创建成功 SHALL 继续跳转到 `/servers/:organizationName/:serverName` 并携带 add mode
- **AND** 缺少 production endpoint 或创建失败 SHALL 保持现有错误提示行为

#### Scenario: MCP Server 管理页不纳入 Store 迁移
- **WHEN** 本 change 迁移 LLM AI/Gateway 菜单下的 MCP Store 页面
- **THEN** `ServerListPage.js`、`ServerEditPage.js` 和 `ServerBackend.js` SHALL 保持在本迁移范围之外
- **AND** 本 change SHALL NOT 改变 MCP Server 列表、编辑、保存、删除、后端 API path、入口配置、站点范围、治理规则或规则表格组件
