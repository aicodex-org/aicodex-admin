# admin-enterprise-identity-console-shell Specification

## Purpose
定义 Admin 企业认证中心 Shell 的首页、导航信息架构、只读状态入口和安全降级边界，使管理员能够从首屏理解组织、认证源、应用接入、Gateway 投影和审计运维的当前状态与下一步入口。
## Requirements
### Requirement: 身份治理总览首页
Admin 管理员访问根路径 `/` 时，系统 SHALL 展示企业认证中心的身份治理总览，而不是营销落地页、旧后台趋势图优先的首页或松散卡片集合。

#### Scenario: 管理员访问总览
- **WHEN** 已登录管理员访问 `/`
- **THEN** 页面展示组织主数据、认证源、应用接入、Gateway 投影、审计风险等企业认证中心状态入口
- **AND** 页面提供跳转到既有组织、认证源、应用接入中心、API 映射和运维页面的操作入口

#### Scenario: 总览展示控制台结构
- **WHEN** 管理员访问 `/`
- **THEN** 首屏 SHALL 使用企业身份治理控制台结构展示页面角色、跨域摘要、治理状态、风险待办和能力入口
- **AND** 页面 SHALL 让管理员能判断当前状态、主要风险和下一步操作

#### Scenario: 总览数据加载中
- **WHEN** 总览所需的只读状态数据仍在加载
- **THEN** 页面展示加载状态
- **AND** 不阻塞导航菜单和账号工具区使用

#### Scenario: 总览数据不可用
- **WHEN** 只读状态接口失败或返回空数据
- **THEN** 页面展示局部错误或空态
- **AND** 仍保留可进入既有页面的操作入口

### Requirement: 企业认证中心导航信息架构
Admin 左侧导航 SHALL 以企业认证中心语义组织既有页面入口，至少包含总览、组织与身份、认证源、应用接入、LLM AI、权限治理、审计运维这些一级分组；审计运维分组 SHALL 聚焦会话核对、审计记录、令牌核对和验证核对四类运行态入口，并与组织配置页导航树复用同一 IA。

#### Scenario: 导航展示企业认证中心分组
- **WHEN** 管理员打开桌面端 Admin 壳层
- **THEN** 左侧导航展示企业认证中心分组
- **AND** 应用接入分组中的 `/applications` 叶子入口展示为“应用接入中心”
- **AND** 审计运维分组中的 `/sessions`、`/records`、`/tokens`、`/verifications` 叶子入口分别展示为会话核对、审计记录、令牌核对和验证核对
- **AND** 既有页面路由仍通过原有叶子菜单进入

#### Scenario: 导航权限过滤保持兼容
- **WHEN** 组织配置了 `navItems` 或 `userNavItems`
- **THEN** 系统仍按既有叶子路由 key 过滤可见菜单
- **AND** 不因为一级分组重命名、叶子文案调整或审计运维工作台壳层导致未授权入口显示

#### Scenario: 移动端导航复用同一信息架构
- **WHEN** 用户在窄屏或移动端打开 Admin 菜单抽屉
- **THEN** 抽屉中的分组、叶子入口和权限过滤与桌面侧栏一致

#### Scenario: 配置页导航树复用同一信息架构
- **WHEN** 管理员在组织配置页编辑 `navItems` 或 `userNavItems`
- **THEN** 导航配置树展示与运行时侧栏一致的审计运维分组和叶子文案
- **AND** 配置值仍使用 `/sessions`、`/records`、`/tokens`、`/verifications` 这些稳定叶子 key

### Requirement: Shell 边界与安全降级
企业认证中心 Shell SHALL 只做只读总览、导航重组和既有入口聚合，不得触发认证、同步、Gateway projection publish、重试或真实环境探测等写入/执行行为。

#### Scenario: 总览展示同步与投影状态
- **WHEN** 总览展示企业微信、飞书、OIDC、API 映射或 Gateway 投影相关状态
- **THEN** 页面仅展示只读状态、巡检提示或跳转入口
- **AND** 不调用会改变认证链路、组织同步或 projection publish 状态的接口

#### Scenario: 无权限或无数据
- **WHEN** 当前账号无权访问某些企业认证中心入口或相关数据为空
- **THEN** 页面展示无权限/无数据状态
- **AND** 不暴露隐藏入口、真实组织树、真实用户明细或敏感环境信息

### Requirement: 企业 SaaS 管理台视觉
企业认证中心 Shell SHALL 使用安静、专业、信息密度合理且按业务域分化的管理台视觉，避免大 hero、装饰渐变、营销式介绍、卡片套卡片和所有列表页套同一工作台模板；总览、组织身份、认证源、应用接入、LLM AI/Gateway 和审计运维 SHALL 使用一致的控制台基础语言，但首屏结构、文案、指标和操作入口 SHALL 服务各自业务域。

#### Scenario: 桌面端首屏
- **WHEN** 管理员在桌面端打开总览或企业认证中心子页面
- **THEN** 首屏展示可扫描的状态区、风险区、入口区和对应页面的核心列表或核心操作
- **AND** 文案服务于操作决策

#### Scenario: 工作台视觉一致但不模板化
- **WHEN** 管理员在总览、组织身份、认证源中心、应用接入中心、LLM AI/Gateway 和审计运维页面之间切换
- **THEN** 页面画布、字体层级、状态标签和操作入口 SHALL 保持一致的企业控制台视觉语言
- **AND** 每个业务域 SHALL 呈现不同首屏结构和治理语义
- **AND** 页面 SHALL NOT 依赖装饰性背景、光球、bokeh 或大面积单一渐变来表达产品感
- **AND** 页面 SHALL NOT 把核心列表长期压到 1440x900 首屏以下，除非验证记录说明 legacy 表格或数据结构限制

#### Scenario: 窄屏展示
- **WHEN** 管理员在窄屏或移动端打开企业认证中心页面
- **THEN** 文本、按钮和状态卡片不发生重叠或不可读溢出
- **AND** 页头、摘要、入口和列表之间 SHALL 使用紧凑响应式间距
- **AND** 关键入口和核心列表仍可触达

### Requirement: 企业认证中心旧 Tour 降级
企业认证中心 Shell SHALL 避免在企业认证中心路由下自动弹出旧 Casdoor 英文 Tour 遮罩；如需要导引，导引文案和步骤 MUST 使用企业认证中心语义并走 `zh` / `en` locale。

#### Scenario: 首次访问企业认证中心列表页
- **WHEN** 管理员首次访问 `/organizations`、`/users`、`/roles`、`/permissions`、`/providers`、`/applications`、`/sessions`、`/records`、`/tokens`、`/verifications` 或 `/agents`
- **THEN** 页面 SHALL NOT 自动展示硬编码英文 `Organization List`、`User List`、`Application List` 或等价旧 Casdoor Tour 遮罩
- **AND** 核心列表、表格或主要操作区域不被 Tour 遮挡

#### Scenario: 后续重建企业认证中心导引
- **WHEN** 系统提供新的企业认证中心导引
- **THEN** 导引文案 SHALL 同步 `zh` / `en` locale
- **AND** 导引步骤 SHALL 使用企业身份治理、认证源、应用接入、审计运维、LLM AI/Gateway 等当前信息架构文案
- **AND** 导引 SHALL 支持用户关闭或跳过，不阻塞核心列表操作

### Requirement: 核心页面 P0 信息密度和入口降级
Admin 企业认证中心核心页面 SHALL prioritize operational status, table workflows and safe next actions over prominent standalone governance entrances.

#### Scenario: 身份治理总览不再是能力入口目录
- **WHEN** 管理员在桌面端打开 `/`
- **THEN** first viewport SHALL emphasize identity coverage, application access, sync/audit health and the current safest next action
- **AND** horizontal capabilities such as identity asset relationships, access preflight and governance tasks SHALL remain reachable through contextual links or risk items
- **AND** the page SHALL NOT render those capabilities as a large primary entrance directory.

#### Scenario: 应用接入中心表格优先
- **WHEN** 管理员在 `1440x900` viewport 打开 `/applications`
- **THEN** the application table body or table toolbar SHALL be visible in the first viewport unless data loading blocks rendering
- **AND** the summary above the table SHALL be compact enough to support scanning applications rather than becoming a workbench layer
- **AND** row operations SHALL distinguish primary edit/object-context actions from lower-prominence secondary or destructive actions.

#### Scenario: 接入预检作为流程工具
- **WHEN** 管理员打开 `/access-wizard`
- **THEN** the page SHALL present access preflight as a compact workflow tool for identity sources, applications and LLM AI/Gateway mapping
- **AND** explanation cards, gap cards and no-execution safety labels SHALL be visually compact
- **AND** existing step transitions, result evidence links, cancellation and no-write safety boundaries SHALL remain available.

#### Scenario: 组织目录技术证据降级
- **WHEN** 管理员打开 organization directory quality or organization tree operations pages
- **THEN** primary status SHALL emphasize directory health, sync source, abnormal nodes, member impact and latest sync result
- **AND** engineering lineage fields such as `readModelSource`, `orgVersion`, `scopeVersion`, `batch`, `FRESH` and stable hashes SHALL be available in technical or diagnostic detail areas
- **AND** those lineage fields SHALL NOT dominate the default summary cards or main table columns.

#### Scenario: 审计记录主表不展示 raw payload
- **WHEN** 管理员打开 `/records`
- **THEN** the primary table SHALL show governance-oriented fields such as event type, audited object, result, risk level, evidence status, operator and time
- **AND** raw request URI, raw response, object payload, trace values and reason-like diagnostic text SHALL NOT be default primary table columns
- **AND** raw audit evidence SHALL remain available in a detail drawer or folded detail area with sensitive values redacted by default.

### Requirement: 核心页面 P0 响应式与验证证据
Admin 企业认证中心 P0 polish SHALL preserve existing route compatibility and SHALL be verified with source-level checks and browser evidence when tooling allows.

#### Scenario: 路由和深链保持兼容
- **WHEN** the P0 polish demotes a capability entrance or moves technical fields to details
- **THEN** existing routes, stable route keys, row actions and deep links SHALL remain reachable
- **AND** no new primary navigation entry SHALL be required for this polish.

#### Scenario: 浏览器证据覆盖核心页面
- **WHEN** the P0 polish is ready for worker handoff
- **THEN** validation SHALL include desktop `1440x900` and mobile `390x844` checks for `/`, `/applications`, `/access-wizard`, `/records`, organization sync pages and an organization directory or tree operations page when local-dev or 60 tooling is available
- **AND** evidence SHALL check no webpack overlay, no page-level horizontal overflow, readable mobile layout and no console warning/error regression
- **AND** any browser tooling blocker SHALL be recorded with lower-level evidence and a minimal follow-up verification path.

#### Scenario: 组织同步页移动端无页面级横向溢出
- **WHEN** 管理员在 `390x844` 或 equivalent mobile viewport 打开 `/wecom-org-sync` or `/feishu-org-sync`
- **THEN** `document.documentElement.scrollWidth` SHALL be less than or equal to `document.documentElement.clientWidth + 1`
- **AND** buttons, selectors, form grids and table wrappers SHALL wrap or contain their own horizontal scrolling without creating document-level horizontal overflow.
