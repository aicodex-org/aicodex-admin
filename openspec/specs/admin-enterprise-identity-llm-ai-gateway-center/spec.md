# admin-enterprise-identity-llm-ai-gateway-center Specification

## Purpose
TBD - created by archiving change improve-admin-enterprise-llm-ai-gateway-center. Update Purpose after archive.
## Requirements
### Requirement: LLM AI 网关中心工作台
Admin 企业认证中心 SHALL 在原 `/agents` 路由提供列表优先的 AI Agent 入口页，使管理员能够直接查看、查询和操作 AI Agent 列表；LLM AI 网关其它对象入口 SHALL 继续通过左侧菜单、顶部页签或既有路由触达，不得在 Agent 列表上方重复渲染中心式快捷入口墙。

#### Scenario: AI Agent 入口页迁移保持列表行为
- **WHEN** `AgentListPage` 和 `AgentEditPage` 迁移为 TSX
- **THEN** `/agents` 页面 SHALL 继续展示 Agent 表格、新增、编辑、删除、分页、搜索和排序行为
- **AND** `/agents` 页面 SHALL 使用统一列表标题、右上动作区、查询工具栏、表格壳和分页布局作为首屏主任务
- **AND** `/agents` 页面 SHALL NOT 在表格上方渲染 `LlmAiGatewayCenter` 大块总览、快捷入口墙、风险矩阵或重复左侧菜单的配置入口组
- **AND** `/agents/:organizationName/:agentName` 页面 SHALL 继续保持 Agent 读取、组织/应用下拉、字段编辑、保存、保存并退出、取消新增、删除和 404 跳转行为
- **AND** 迁移 SHALL NOT 改变后端 Agent API 契约、Agent 保存/删除语义、Gateway projection publish 行为、MCP Server、MCP Store、入口配置、站点范围或治理规则页面

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

### Requirement: 只读摘要与敏感信息边界
LLM AI 网关中心 SHALL 只基于当前列表视图和既有路由展示可扫描摘要，不得把 token、Cookie、client secret、私有 URL、完整认证头或原始 Gateway 响应写入工作台摘要、测试快照、locale 或报告。

#### Scenario: Agent 行包含敏感字段
- **WHEN** 当前 Agent 列表行包含 `token`、私有 `url` 或其它凭据字段
- **THEN** 工作台摘要 SHALL 只展示数量、状态、缺口类别和跳转入口
- **AND** 工作台摘要和风险列表 SHALL NOT 包含敏感字段原值

#### Scenario: 当前列表为空或加载中
- **WHEN** Agent 列表正在加载或返回空数组
- **THEN** 工作台 SHALL 展示加载或待接入提示
- **AND** 页面仍提供新增 Agent、MCP Server、MCP Store、API 网关身份映射和审计记录入口

### Requirement: 管理员可理解的 Gateway 命名
Admin 企业认证中心 SHALL 避免把 `Gateway 投影` / `Gateway Projection` 作为面向管理员的主导航、总览卡片或区域标题；如需保留 projection 术语，SHALL 限定在低层诊断、实现边界或后端 contract 说明中。

#### Scenario: 侧边栏和组织 navItems 配置树
- **WHEN** 管理员查看侧边栏或组织 navItems 配置树
- **THEN** LLM AI/Gateway 分组 SHALL 使用管理员可理解的 `LLM AI 网关` 或等价英文标签
- **AND** 不得展示 `Gateway 投影` 或 `Gateway Projection` 作为分组标题

#### Scenario: 身份治理总览
- **WHEN** 管理员打开企业认证中心总览
- **THEN** LLM AI/Gateway 相关卡片 SHALL 使用 `LLM AI 网关中心` 或等价标题
- **AND** 卡片描述 SHALL 强调 AI 入口、MCP 资源、网关身份映射和只读巡检，不把 projection publish 表述为主要操作

#### Scenario: 网关身份映射诊断区
- **WHEN** 管理员打开 `/platform-api-mappings`
- **THEN** Gateway 相关主要区域标题 SHALL 使用网关身份同步、网关接入回执、网关身份发布记录或等价管理员语义
- **AND** 低层说明 MAY 保留 projection、producer diagnostics、authorization facts 等术语以描述安全边界

### Requirement: 企业管理台视觉与响应式
LLM AI 网关中心 SHALL 复用企业认证中心视觉语言，使用安静、信息密度合理的管理台布局，避免营销式 hero、装饰背景和卡片套卡片，并在桌面和窄屏上保持可读可操作。

#### Scenario: 桌面和窄屏访问
- **WHEN** 管理员在桌面端或窄屏访问 `/agents`
- **THEN** 文本、状态标签、按钮、入口卡和 Agent 表格区域不发生重叠或不可读溢出
- **AND** 关键入口仍可触达
- **AND** 页头、AI/Gateway 摘要和入口区域 SHALL 使用紧凑间距，避免移动端几千像素后才出现 Agent 列表

#### Scenario: LLM AI 语义不被卡片堆叠稀释
- **WHEN** 管理员查看 `/agents` 首屏
- **THEN** 页面 SHALL 同时保留 Agent、MCP、Gateway identity mapping 和审计证据语义
- **AND** 页面 SHALL NOT 在 Agent 列表前堆叠多层说明卡、入口卡和风险卡
- **AND** 浏览器验证 SHALL 记录 Agent 列表或列表入口的 y 坐标

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

### Requirement: MCP Server 页面 TSX 迁移保持行为兼容
Admin 企业认证中心 SHALL 支持将 LLM AI/Gateway 菜单下的 MCP Server 列表和编辑页迁移为 TSX，并保持 `/servers` 列表和编辑路径的现有管理员行为兼容。

#### Scenario: MCP Server 列表页迁移
- **WHEN** `ServerListPage` 迁移为 `.tsx`
- **THEN** `/servers` 页面 SHALL 继续展示 MCP Server 表格、新增、编辑、删除、分页、搜索、排序和 MCP Store 跳转行为
- **AND** 页面 SHALL 继续通过现有 Server API 边界读取、新增和删除 MCP Server
- **AND** 迁移 SHALL NOT 改变表格文案、路由、权限判断、MCP Store 路由或 Gateway projection publish 行为

#### Scenario: MCP Server 编辑页迁移
- **WHEN** `ServerEditPage` 迁移为 `.tsx`
- **THEN** `/servers/:organizationName/:serverName` 页面 SHALL 继续保持 MCP Server 读取、组织/应用下拉、名称、显示名、URL、访问令牌、应用、工具表、Base URL 展示、保存、保存并退出、取消新增、删除和 404 跳转行为
- **AND** 迁移 SHALL NOT 修改 Server 保存/删除 payload shape、后端 API path、ToolTable 运行时行为、MCP Store、站点范围、治理规则或规则表格组件

#### Scenario: MCP Server 迁移验证
- **WHEN** 本 change 迁移 MCP Server 页面
- **THEN** 对应 React 测试 SHALL 使用 `.test.tsx` 并覆盖列表页渲染、新增、删除、MCP Store 跳转、编辑页加载、保存、保存并退出、取消新增、删除和 ToolTable 更新关键路径
- **AND** 验证 SHALL 包含增量 TypeScript gate、`yarn typecheck`、聚焦 Jest/coverage、`yarn build` 或等价导入边界验证

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

### Requirement: 治理规则表达式表格 TSX 迁移保持行为兼容
Admin 企业认证中心 SHALL 支持将 LLM AI/Gateway 治理规则编辑链路中的 WAF、IP、User-Agent 和 IP Rate Limiting 表达式表格迁移为 TSX，并保持现有规则行 shape、默认规则、表格操作、字段回写和调用方兼容。

#### Scenario: 表达式表格迁移不改变调用边界
- **WHEN** `WafRuleTable`、`IpRuleTable`、`UaRuleTable` 和 `IpRateRuleTable` 被迁移为 `.tsx`
- **THEN** 每个组件 SHALL 继续默认导出同名 React 组件
- **AND** `RuleEditPage` 的无后缀 import SHALL 继续解析到相同组件能力
- **AND** 每个组件 SHALL 继续接收 `table`、`title` 和 `onUpdateTable(table)` 调用边界
- **AND** 迁移 SHALL NOT 修改 `RuleEditPage`、`CompoundRule`、`RuleBackend.js`、后端 Rule API、权限或 Gateway projection publish 行为

#### Scenario: WAF 表格保留默认规则和行操作
- **WHEN** WAF 表格以空 `table` 渲染或点击 restore
- **THEN** 组件 SHALL 通过 `onUpdateTable` 回写三条既有 WAF/ModSecurity 默认规则
- **AND** 添加、删除、上移、下移、name 编辑和 expression 编辑 SHALL 保持既有 table 行 shape 与顺序语义

#### Scenario: IP 表格保留 tags 拼接和行操作
- **WHEN** IP 表格更新 IP List tags
- **THEN** 组件 SHALL 继续 trim 每个 tag 并以英文逗号拼接后写入当前行 `value`
- **AND** 操作符 SHALL 保持 `is in` 与 `is not in` 两个既有选项
- **AND** 默认规则、添加、删除、上移、下移和 restore SHALL 保持既有行为

#### Scenario: User-Agent 表格保留空白归一化
- **WHEN** User-Agent 表格的 value 输入框 blur
- **THEN** 组件 SHALL 继续将连续空白压缩为一个空格并 trim 后写入当前行 `value`
- **AND** 默认规则 SHALL 继续使用当前 `window.navigator.userAgent`
- **AND** 添加、删除、上移、下移、restore 和五类操作符 SHALL 保持既有行为

#### Scenario: IP Rate 表格保留数值字符串回写
- **WHEN** IP Rate Limiting 表格编辑 name、rate 或 block duration
- **THEN** 组件 SHALL 继续把字段值通过 `String(value)` 写回当前行
- **AND** restore SHALL 继续回写 `Default IP Rate`、`100` 和 `6000`
- **AND** 本表格 SHALL NOT 新增添加、删除、上移或下移操作

### Requirement: 组合规则编辑器 TSX 迁移保持行为兼容
Admin 企业认证中心 SHALL 支持将 LLM AI/Gateway 治理规则编辑链路中的 `CompoundRule` 组件迁移为 TSX，并保持组合规则候选加载、自引用过滤和表达式回写行为兼容。

#### Scenario: 组合规则候选加载与自过滤
- **WHEN** `CompoundRule` 被迁移为 `.tsx` 并以当前 `owner` 与 `ruleName` 加载候选规则
- **THEN** 组件 SHALL 继续通过现有 Rule API 边界读取当前 owner 下的规则
- **AND** 候选规则 SHALL 继续以 `owner/name` 形式展示
- **AND** 候选规则 SHALL 继续过滤当前正在编辑的 `owner/ruleName`，避免组合规则引用自身

#### Scenario: 组合规则表达式编辑保持兼容
- **WHEN** 管理员编辑组合规则表达式
- **THEN** 默认表达式、operator 选择、规则选择、添加、删除、上移、下移、restore 和 `onUpdateTable(table)` 回写 SHALL 保持现有行为
- **AND** 迁移 SHALL NOT 修改 `/rules/:organizationName/:ruleName` 路由、Rule API path、payload shape、规则保存/删除语义、权限或 Gateway projection publish 行为

#### Scenario: 规则编辑页调用边界保持兼容
- **WHEN** `RuleEditPage` 继续通过 `./common/CompoundRule` 无后缀路径引用组合规则组件
- **THEN** 构建和运行时模块解析 SHALL 继续找到同名 `.tsx` 组件
- **AND** 本迁移 SHALL NOT 要求同一 change 迁移 `RuleEditPage.js`、`RuleBackend.js` 或普通规则表达式表格组件

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
