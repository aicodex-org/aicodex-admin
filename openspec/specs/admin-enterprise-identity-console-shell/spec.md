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

### Requirement: 总览横向能力降噪
Admin 企业认证中心总览 SHALL 以运行状态、待关注事项或上下文 deep link 呈现跨域能力，而不是显眼连续展示一组独立中心目录。

#### Scenario: 总览不连续堆叠抽象能力入口
- **WHEN** 已登录管理员访问 `/`
- **THEN** 待关注区域 SHALL 优先呈现身份基础设施健康度、审计/同步/应用状态以及当前最稳妥的下一步动作
- **AND** 身份资产关系、接入预检和治理任务 SHALL NOT 作为三个连续的主入口卡片或主操作标签出现
- **AND** 指向 `/identity-assets`、`/access-wizard` 和 `/governance-tasks` 的既有 deep link SHALL 以状态型文案保持可达

#### Scenario: 总览文案表达运行状态和待办摘要
- **WHEN** 总览展示对象关系、接入条件或风险队列相关信息
- **THEN** 文案 SHALL 描述证据上下文、接入条件核对或风险待办摘要
- **AND** 文案 SHALL NOT 要求管理员先理解新的独立中心概念，才能判断下一步应核对什么

### Requirement: 组织运营空态与目录质量诊断保持业务可读
Admin 企业认证中心的组织树运营页和组织目录质量页 SHALL 将后端实现 alias 转换为管理员可理解的业务文案，保持只读边界可见，并让移动端状态摘要足够紧凑，使核心列表或诊断区域容易到达。

#### Scenario: 无可管理部门时不直出 raw alias
- **WHEN** 管理员打开组织树运营页或组织目录质量页，且后端返回 `scope_has_no_manageable_departments` 或等价的无可管理部门 alias
- **THEN** 主空态或诊断文案 SHALL 说明当前组织在当前范围内暂无可管理部门
- **AND** 文案 SHALL 包含只读边界或下一步核对建议，引导核对组织范围、来源连接或管理员权限
- **AND** 页面 SHALL NOT 将 raw implementation alias 作为主 Alert、表格、筛选、标签或空态文案展示

#### Scenario: 目录质量原因筛选保持稳定值但展示可读标签
- **WHEN** 组织目录质量返回稳定的 `reasonAliases`、`reasonCodes`、修复动作 alias、blocked reasons 或 cannot-infer aliases
- **THEN** UI SHALL 在 API 筛选和导出 payload 中保留原始稳定值
- **AND** 可见筛选标签、表格标签、摘要标记和空态/诊断文案 SHALL 使用业务可读文案或可读兜底标签，而不是 raw snake-case implementation aliases

#### Scenario: 移动端组织运营摘要让位于诊断区域
- **WHEN** 管理员在窄移动视口打开组织树运营页
- **THEN** 状态摘要 SHALL 使用紧凑的响应式间距和卡片尺寸
- **AND** 当存在数据或空态诊断时，组织节点列表或诊断区域 SHALL NOT 被过高的状态卡堆叠压到过深位置
- **AND** 技术 lineage 字段 SHALL 继续在详情区域可用，但不主导默认摘要

### Requirement: 旧应用门户入口不得伪装为企业应用列表
Admin 企业认证中心 Shell SHALL distinguish the legacy `/apps` application portal from the `/applications` application access center. Local admin enterprise navigation SHALL NOT render `/apps` as the primary application list entry, and `/applications` SHALL remain the administrator-facing application access center under the application access business domain.

#### Scenario: Local admin 主导航隐藏旧应用门户
- **WHEN** local admin 打开企业认证中心桌面侧栏或移动端抽屉
- **THEN** “中心总览”分组 SHALL NOT include a `/apps` leaf entry
- **AND** “应用接入”分组 SHALL include `/applications` as the application access center entry

#### Scenario: 配置树不把旧门户当作应用列表
- **WHEN** 管理员查看组织导航配置树
- **THEN** 配置树 SHALL NOT present `/apps` as “应用列表” or equivalent application-list wording
- **AND** `/applications` SHALL remain configurable as the application access center route key

#### Scenario: 非 local admin 旧应用门户 fallback 保持兼容
- **WHEN** a non-local-admin user is redirected from the enterprise identity overview fallback or directly visits `/apps`
- **THEN** the legacy application portal route SHALL remain reachable
- **AND** any visible navigation label for `/apps` SHALL describe it as an application portal or application entry, not the administrator application list

### Requirement: 业务域信息架构和抽象能力降级
Admin 企业认证中心 Shell SHALL organize primary navigation by administrator business domains, and SHALL keep cross-domain governance capabilities contextual unless a follow-up product decision proves they need prominent primary navigation.

#### Scenario: 主导航展示业务域
- **WHEN** 已登录管理员打开桌面端 Admin 壳层
- **THEN** 左侧主导航 SHALL 优先展示中心总览、组织与账号、应用接入、身份源、权限与角色、审计运维和 LLM AI/Gateway 等稳定业务域
- **AND** 主导航 SHALL NOT use implementation history, helper modules or abstract governance terms as the default top-level taxonomy

#### Scenario: 一级菜单命名保持四字中文优先
- **WHEN** 后续 change 新增或调整 Admin 企业认证中心一级菜单标签、菜单分组名或菜单文档命名
- **THEN** 一级菜单命名 SHALL 默认采用四字中文业务名优先
- **AND** 菜单标签 SHALL NOT 使用过长解释性短语，也 SHALL NOT 为新增治理概念继续扩张显眼的“中心”或“工作台”入口
- **AND** LLM AI/Gateway、OAuth/OIDC、Provider、MCP 等专有技术词 MAY 保留中英混合表达

#### Scenario: 抽象治理能力不默认扩张为显眼入口
- **WHEN** 系统提供身份资产关系、接入预检、治理任务、快捷操作或等价横向能力
- **THEN** Shell SHALL expose those capabilities from overview pending issues, object details, row actions, configuration flows or result pages by default
- **AND** Shell SHALL NOT promote those capabilities as additional prominent primary navigation groups or repeated workbench pages unless the change records why contextual placement cannot satisfy the administrator workflow

#### Scenario: 既有能力保持可达
- **WHEN** 后续实现降低某个抽象入口的导航层级
- **THEN** existing routes, stable route keys and deep links SHALL remain reachable through contextual links, overview links or compatibility redirects
- **AND** permission filtering SHALL continue to use stable route keys rather than renamed group labels

### Requirement: 后续 UI 任务门禁
Future Admin enterprise identity UI tasks SHALL be judged by whether they improve administrator decision-making on identity access, source binding, application access, risk, evidence or safe next action.

#### Scenario: 拒绝填充式入口
- **WHEN** a proposed task only adds a menu entry, center, card, status strip, dashboard panel or explanatory section
- **THEN** the task SHALL be treated as filler unless it proves how the change helps administrators answer who can log in, through which identity source, which apps are accessible, where risk exists, what evidence exists or what to fix next
- **AND** worker prompts SHALL record the expected administrator decision or operational workflow improved by the task

#### Scenario: UI 实现需要浏览器证据
- **WHEN** a future change modifies enterprise identity navigation, shell layout, page header, table toolbar, object detail, status language or responsive layout
- **THEN** validation SHALL include browser evidence on representative desktop and mobile routes
- **AND** evidence SHALL check first-viewport core operation visibility, no old Tour or overlay, no page-level horizontal overflow, no console warning/error regression and no sensitive data exposure

### Requirement: 企业认证中心一级菜单命名门禁
Admin 企业认证中心 Shell SHALL 保持一级导航标签简洁、面向业务域且受测试门禁保护。常规中文一级菜单标签 MUST 使用四个中文字符，`LLM AI/Gateway` 等专有技术词 MAY 通过显式 allowlist 保留；没有明确产品例外时，新的抽象“中心/工作台/任务中心/快捷入口”式一级入口 SHALL NOT 被新增。

#### Scenario: 中文一级菜单使用四字业务名
- **WHEN** 管理员使用中文界面打开桌面侧栏或组织导航配置树
- **THEN** 每个常规中文一级分组标签 SHALL 正好包含四个中文字符
- **AND** `LLM AI/Gateway` 等允许保留的专有技术标签 SHALL 记录在导航测试 allowlist 中

#### Scenario: 一级菜单不新增抽象入口
- **WHEN** 后续 change 新增或重命名 Admin 企业认证中心一级导航分组
- **THEN** 如果标签引入泛化中心、工作台、任务中心或快捷入口等明显抽象主入口命名，导航测试 SHALL 失败
- **AND** 跨域能力默认 SHALL 通过总览状态、对象上下文、抽屉、工具栏动作、向导步骤或兼容 deep link 继续可达

#### Scenario: 配置树和运行时侧栏保持一致
- **WHEN** 管理员查看 organization `navItems` / `userNavItems` configuration tree
- **THEN** 配置树 SHALL 暴露与运行时侧栏一致的一级菜单标签集合
- **AND** 一级标签调整后，route key、叶子 key 和权限过滤 SHALL 保持稳定
