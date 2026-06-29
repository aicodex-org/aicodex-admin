## MODIFIED Requirements

### Requirement: LLM AI 网关中心工作台
Admin 企业认证中心 SHALL 在原 `/agents` 路由提供列表优先的 AI Agent 入口页，使管理员能够直接查看、查询和操作 AI Agent 列表；LLM AI 网关其它对象入口 SHALL 继续通过左侧菜单、顶部页签或既有路由触达，不得在 Agent 列表上方重复渲染中心式快捷入口墙。

#### Scenario: AI Agent 入口页迁移保持列表行为
- **WHEN** `AgentListPage` 和 `AgentEditPage` 迁移为 TSX
- **THEN** `/agents` 页面 SHALL 继续展示 Agent 表格、新增、编辑、删除、分页、搜索和排序行为
- **AND** `/agents` 页面 SHALL 使用统一列表标题、右上动作区、查询工具栏、表格壳和分页布局作为首屏主任务
- **AND** `/agents` 页面 SHALL NOT 在表格上方渲染 `LlmAiGatewayCenter` 大块总览、快捷入口墙、风险矩阵或重复左侧菜单的配置入口组
- **AND** `/agents/:organizationName/:agentName` 页面 SHALL 继续保持 Agent 读取、组织/应用下拉、字段编辑、保存、保存并退出、取消新增、删除和 404 跳转行为
- **AND** 迁移 SHALL NOT 改变后端 Agent API 契约、Agent 保存/删除语义、Gateway projection publish 行为、MCP Server、MCP Store、入口配置、站点范围或治理规则页面

## ADDED Requirements

### Requirement: LLM AI 网关标准列表页壳统一
LLM AI 网关下的标准对象列表页 SHALL 复用统一列表壳、既有查询能力、表格密度、分页视觉和轻量行操作；目录/商店式页面 MAY 保持独立体验。

#### Scenario: 标准对象列表使用统一列表壳
- **WHEN** 管理员访问 `/agents`、`/servers`、`/entries`、`/sites` 或 `/rules`
- **THEN** 页面 SHALL 使用统一列表标题、右上动作区、表格壳和分页布局
- **AND** 已有字段查询契约的页面 SHALL 使用统一查询工具栏承载既有查询能力
- **AND** 无字段查询契约的页面 SHALL NOT 伪造跨字段或当前页查询结果
- **AND** 新增、编辑、删除、既有查询、排序和分页行为 SHALL 保持现有后端契约不变
- **AND** 行级操作 SHALL 使用低噪声文字或图标文字动作组
- **AND** 页面 SHALL NOT 在列表上方渲染重复左侧菜单的入口卡片墙

#### Scenario: 桌面可容纳时不配置固定操作列
- **WHEN** 管理员在标准桌面列表宽度访问 `/agents`、`/servers`、`/entries`、`/sites` 或 `/rules`
- **THEN** 表格列若能在列表容器内展示核心字段和操作列，页面 SHALL NOT 配置 AntD 右侧固定操作列
- **AND** 页面 SHALL NOT 因不必要的 fixed column 产生长期可见的 sticky 分割线、阴影或额外横向滚动依赖
- **AND** 窄屏、移动端或极小容器 MAY 使用表格内部横向滚动作为兜底

#### Scenario: MCP Store 暂不纳入标准列表壳
- **WHEN** 管理员访问 `/server-store`
- **THEN** 本 change SHALL NOT 强制 MCP Store 使用标准 CRUD 列表壳
- **AND** MCP Store 的线上目录浏览、筛选、刷新、空态和创建本地 MCP Server 行为 SHALL 保持现有契约
