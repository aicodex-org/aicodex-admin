# admin-enterprise-identity-console-shell Specification

## Purpose
定义 Admin 身份控制台 Shell 的首页、导航信息架构、只读状态入口和安全降级边界，使管理员能够从首屏理解组织、认证源、应用接入、API 网关和审计运维的当前状态与下一步入口。
## Requirements
### Requirement: 身份治理总览首页
Admin 管理员访问根路径 `/` 时，系统 SHALL 展示身份控制台的身份总览，而不是营销落地页、旧后台趋势图优先的首页或松散卡片集合。

#### Scenario: 管理员访问总览
- **WHEN** 已登录管理员访问 `/`
- **THEN** 页面展示组织主数据、认证源、应用接入、API 网关、审计风险等身份控制台状态入口
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

### Requirement: 身份控制台导航信息架构
Admin 左侧导航 SHALL 以身份控制台语义组织既有页面入口，至少包含总览、组织与身份、认证源、应用接入、LLM AI、权限治理、审计运维这些一级分组；审计运维分组 SHALL 聚焦会话核对、审计记录、令牌核对和验证核对四类运行态入口，并与组织配置页导航树复用同一 IA。

#### Scenario: 导航展示身份控制台分组
- **WHEN** 管理员打开桌面端 Admin 壳层
- **THEN** 左侧导航展示身份控制台分组
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
身份控制台 Shell SHALL 只做只读总览、导航重组和既有入口聚合，不得触发认证、同步、Gateway projection publish、重试或真实环境探测等写入/执行行为。

#### Scenario: 总览展示同步与投影状态
- **WHEN** 总览展示企业微信、飞书、OIDC、API 映射或 Gateway 投影相关状态
- **THEN** 页面仅展示只读状态、巡检提示或跳转入口
- **AND** 不调用会改变认证链路、组织同步或 projection publish 状态的接口

#### Scenario: 无权限或无数据
- **WHEN** 当前账号无权访问某些身份控制台入口或相关数据为空
- **THEN** 页面展示无权限/无数据状态
- **AND** 不暴露隐藏入口、真实组织树、真实用户明细或敏感环境信息

#### Scenario: 桌面侧边栏宽度和收起能力
- **WHEN** 管理员在桌面端打开 Admin 壳层
- **THEN** 左侧侧边栏展开态 SHALL 使用约 `220px` 到 `224px` 的管理台宽度
- **AND** 左侧侧边栏内部 SHALL 提供收起/展开控制，且该控制只影响左侧导航区域
- **AND** 顶部 header SHALL NOT 承载桌面侧边栏收起/展开控制
- **AND** 收起态侧边栏 SHALL 使用约 `64px` 到 `72px` 的 icon-only 宽度
- **AND** 收起态菜单 SHALL 隐藏文字但保留图标识别和 hover tooltip 或 title 文本

#### Scenario: 顶部品牌区紧凑单行且不被侧边栏收起
- **WHEN** 管理员在桌面端打开 Admin 壳层
- **THEN** 顶部品牌区 SHALL 显示 logo、`AICodex Admin` 主品牌文本和较弱的 `认证中心` 模块名
- **AND** 主品牌与模块名 SHALL 使用中点或轻分隔形成一行紧凑品牌块
- **AND** 顶部品牌区 SHALL NOT 使用旧的紫色胶囊样式承载模块名
- **WHEN** 管理员将桌面侧边栏收起
- **THEN** 顶部品牌、全局操作、右上工具区和租户下拉 SHALL 保持完整横向 header 呈现
- **AND** 收起/展开 SHALL NOT 把全局 header 压缩成仅 logo 或仅图标状态

#### Scenario: 桌面收起状态持久化
- **WHEN** 管理员在桌面端切换侧边栏收起状态后刷新页面
- **THEN** Shell SHALL 从本地浏览器存储恢复最近一次桌面收起状态
- **AND** 如果存储内容不可读取或不是有效布尔值，Shell SHALL 安全回到展开态

#### Scenario: 桌面侧边栏切换不闪烁
- **WHEN** 管理员在桌面端点击侧边栏收起或展开按钮
- **THEN** Sider 宽度、主内容左边界和 Menu collapsed 状态 SHALL 同步完成
- **AND** Shell SHALL NOT 展示菜单文字、图标或侧栏宽度分阶段切换造成的闪烁
- **AND** 侧栏 hover 背景与文字颜色反馈 SHALL 保持可用

#### Scenario: 移动端不套用桌面收起状态
- **WHEN** 管理员在移动端或窄屏打开 Admin 壳层
- **THEN** Shell SHALL 继续使用现有移动 Drawer 导航行为
- **AND** 桌面 collapsed 持久化状态 SHALL NOT 强制改变移动 Drawer 的宽度、文案或可点击区域

#### Scenario: 收起侧边栏二级入口可达
- **WHEN** 管理员在桌面端收起左侧侧边栏
- **THEN** 含有子菜单的父级 icon SHALL 仍可通过 click 或 hover 打开二级菜单弹层或等效入口
- **AND** 二级入口 SHALL 继续使用既有路由、权限过滤和 AntD Menu 语义
- **AND** Shell SHALL NOT 因收起侧边栏而完全失去子菜单导航能力

#### Scenario: 桌面侧边栏高度独立于内容页
- **WHEN** 管理员在桌面端打开内容高度超过视口的 Admin 页面
- **THEN** 左侧侧边栏 SHALL 按顶部 header 下方的可视高度布局
- **AND** 左侧侧边栏 SHALL NOT 被右侧内容页高度拉伸
- **AND** 左侧菜单项超过侧边栏可视高度时 SHALL 在菜单区域内出现独立垂直滚动
- **AND** 侧边栏收起/展开按钮 SHALL 保持在侧边栏底部，展开态靠右、收起态居中
- **AND** 右侧内容需要纵向滚动时 SHALL 在右侧内容区域内滚动

#### Scenario: 侧边栏切换不制造页面级横向溢出
- **WHEN** 管理员在桌面端展开或收起侧边栏
- **THEN** 主内容区、workspace tabs、表格和页面工具栏 SHALL 随侧边栏宽度变化保持对齐
- **AND** Shell 根文档 SHALL NOT 因侧边栏宽度切换产生页面级横向溢出
- **AND** 需要横向滚动的表格或标签区 SHALL 在自身容器内滚动

#### Scenario: 登录后管理台不展示底部品牌 footprint
- **WHEN** 管理员登录后进入 Admin 身份控制台 Shell
- **THEN** Shell SHALL NOT 在主内容底部展示 `Powered by` 或等价品牌 footer footprint
- **AND** 入口页、登录页或组织自定义 footer SHALL NOT 因此被移除
- **AND** 既有隐藏账号桥接字段 SHALL 保持可用

### Requirement: 企业 SaaS 管理台视觉
身份控制台 Shell SHALL 使用安静、专业、信息密度合理且按业务域分化的管理台视觉，避免大 hero、装饰渐变、营销式介绍、卡片套卡片和所有列表页套同一工作台模板；总览、组织身份、认证源、应用接入、AI 网关和审计运维 SHALL 使用一致的控制台基础语言，但首屏结构、文案、指标和操作入口 SHALL 服务各自业务域。

#### Scenario: 桌面端首屏
- **WHEN** 管理员在桌面端打开总览或身份控制台子页面
- **THEN** 首屏展示可扫描的状态区、风险区、入口区和对应页面的核心列表或核心操作
- **AND** 文案服务于操作决策

#### Scenario: 工作台视觉一致但不模板化
- **WHEN** 管理员在总览、组织身份、认证源中心、应用接入中心、AI 网关和审计运维页面之间切换
- **THEN** 页面画布、字体层级、状态标签和操作入口 SHALL 保持一致的企业控制台视觉语言
- **AND** 每个业务域 SHALL 呈现不同首屏结构和治理语义
- **AND** 页面 SHALL NOT 依赖装饰性背景、光球、bokeh 或大面积单一渐变来表达产品感
- **AND** 页面 SHALL NOT 把核心列表长期压到 1440x900 首屏以下，除非验证记录说明 legacy 表格或数据结构限制

#### Scenario: 窄屏展示
- **WHEN** 管理员在窄屏或移动端打开身份控制台页面
- **THEN** 文本、按钮和状态卡片不发生重叠或不可读溢出
- **AND** 页头、摘要、入口和列表之间 SHALL 使用紧凑响应式间距
- **AND** 关键入口和核心列表仍可触达

### Requirement: 身份控制台旧 Tour 降级
身份控制台 Shell SHALL 避免在身份控制台路由下自动弹出旧 Casdoor 英文 Tour 遮罩；如需要导引，导引文案和步骤 MUST 使用身份控制台语义并走 `zh` / `en` locale。

#### Scenario: 首次访问身份控制台列表页
- **WHEN** 管理员首次访问 `/organizations`、`/users`、`/roles`、`/permissions`、`/providers`、`/applications`、`/sessions`、`/records`、`/tokens`、`/verifications` 或 `/agents`
- **THEN** 页面 SHALL NOT 自动展示硬编码英文 `Organization List`、`User List`、`Application List` 或等价旧 Casdoor Tour 遮罩
- **AND** 核心列表、表格或主要操作区域不被 Tour 遮挡

#### Scenario: 后续重建身份控制台导引
- **WHEN** 系统提供新的身份控制台导引
- **THEN** 导引文案 SHALL 同步 `zh` / `en` locale
- **AND** 导引步骤 SHALL 使用企业身份治理、认证源、应用接入、审计运维、AI 网关等当前信息架构文案
- **AND** 导引 SHALL 支持用户关闭或跳过，不阻塞核心列表操作

### Requirement: 核心页面 P0 信息密度和入口降级
Admin 身份控制台核心页面 SHALL prioritize operational status, table workflows and safe next actions over prominent standalone governance entrances.

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
Admin 身份控制台 P0 polish SHALL preserve existing route compatibility and SHALL be verified with source-level checks and browser evidence when tooling allows.

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
Admin 身份控制台总览 SHALL 以运行状态、待关注事项或上下文 deep link 呈现跨域能力，而不是显眼连续展示一组独立中心目录。

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
Admin 身份控制台的组织树运营页和组织目录质量页 SHALL 将后端实现 alias 转换为管理员可理解的业务文案，保持只读边界可见，并让移动端状态摘要足够紧凑，使核心列表或诊断区域容易到达。

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
Admin 身份控制台 Shell SHALL distinguish the legacy `/apps` application portal from the `/applications` application access center. Local admin enterprise navigation SHALL NOT render `/apps` as the primary application list entry, and `/applications` SHALL remain the administrator-facing application access center under the application access business domain.

#### Scenario: Local admin 主导航隐藏旧应用门户
- **WHEN** local admin 打开身份控制台桌面侧栏或移动端抽屉
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
Admin 身份控制台 Shell SHALL organize primary navigation by administrator business domains, and SHALL keep cross-domain governance capabilities contextual unless a follow-up product decision proves they need prominent primary navigation.

#### Scenario: 主导航展示业务域
- **WHEN** 已登录管理员打开桌面端 Admin 壳层
- **THEN** 左侧主导航 SHALL 优先展示中心总览、组织与账号、应用接入、身份源、权限与角色、审计运维和 AI 网关等稳定业务域
- **AND** 主导航 SHALL NOT use implementation history, helper modules or abstract governance terms as the default top-level taxonomy

#### Scenario: 一级菜单命名保持四字中文优先
- **WHEN** 后续 change 新增或调整 Admin 身份控制台一级菜单标签、菜单分组名或菜单文档命名
- **THEN** 一级菜单命名 SHALL 默认采用四字中文业务名优先
- **AND** 菜单标签 SHALL NOT 使用过长解释性短语，也 SHALL NOT 为新增治理概念继续扩张显眼的“中心”或“工作台”入口
- **AND** LLM AI、OAuth/OIDC、Provider、MCP、Gateway 等专有技术词 MAY 在二级菜单、页面标题或说明中保留中英混合表达

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

### Requirement: 身份控制台一级菜单命名门禁
Admin 身份控制台 Shell SHALL 保持一级导航标签简洁、面向业务域且受测试门禁保护。常规中文一级菜单标签 MUST 使用四个中文字符，`AI 网关` 这类明确产品例外 MUST 通过显式 allowlist 保留；没有明确产品例外时，新的抽象“中心/工作台/任务中心/快捷入口”式一级入口 SHALL NOT 被新增。

#### Scenario: 中文一级菜单使用四字业务名
- **WHEN** 管理员使用中文界面打开桌面侧栏或组织导航配置树
- **THEN** 每个常规中文一级分组标签 SHALL 正好包含四个中文字符
- **AND** `AI 网关` 等允许保留的一级产品例外 SHALL 记录在导航测试 allowlist 中

#### Scenario: 一级菜单不新增抽象入口
- **WHEN** 后续 change 新增或重命名 Admin 身份控制台一级导航分组
- **THEN** 如果标签引入泛化中心、工作台、任务中心或快捷入口等明显抽象主入口命名，导航测试 SHALL 失败
- **AND** 跨域能力默认 SHALL 通过总览状态、对象上下文、抽屉、工具栏动作、向导步骤或兼容 deep link 继续可达

#### Scenario: 配置树和运行时侧栏保持一致
- **WHEN** 管理员查看 organization `navItems` / `userNavItems` configuration tree
- **THEN** 配置树 SHALL 暴露与运行时侧栏一致的一级菜单标签集合
- **AND** 一级标签调整后，route key、叶子 key 和权限过滤 SHALL 保持稳定

### Requirement: 桌面工作区多标签
Admin 身份控制台 Shell SHALL 在桌面端 header 下方、主内容区上方展示 route-driven workspace tabs，用于表示当前工作会话中已打开的页面；左侧菜单仍负责主导航，标签栏不得替代或扩张一级菜单体系。

#### Scenario: 总览标签作为普通标签进入滚动轨道
- **WHEN** workspace tabs 渲染打开页面
- **THEN** `/` 总览类标签 SHALL 作为普通工作标签进入同一个横向滚动轨道
- **AND** 总览标签 SHALL NOT 固定在独立左侧区域
- **AND** 总览标签 SHALL 使用与其它标签一致的 active、hover、focus、右键菜单和关闭能力规则
- **AND** 如果关闭动作导致没有任何标签可用，Shell SHALL 自动回到 `/` 并重新打开普通总览 fallback 标签

#### Scenario: 桌面端标签区横向滚动
- **WHEN** 打开的标签数量超过桌面端标签可视宽度
- **THEN** Shell SHALL 使用单行横向滚动标签区展示已打开页面
- **AND** 标签顺序 SHALL 保持当前打开顺序稳定
- **AND** 激活已打开标签 SHALL NOT 重排标签顺序
- **AND** 当前激活标签切换时 SHALL 自动滚动到可视区

#### Scenario: 滚动箭头位于标签轨道两侧
- **WHEN** 滚动标签区左侧存在不可见标签
- **THEN** 左滚动箭头 SHALL 显示在标签轨道左侧
- **AND** 如果已滚到最左侧，左滚动箭头 SHALL 不显示或不占用可交互焦点
- **WHEN** 滚动标签区右侧存在不可见标签
- **THEN** 右滚动箭头 SHALL 显示在标签轨道右侧
- **AND** 如果已滚到最右侧，右滚动箭头 SHALL 不显示或不占用可交互焦点

#### Scenario: 桌面右键关闭菜单
- **WHEN** 管理员在桌面端右键某个 workspace tab
- **THEN** Shell SHALL 打开该标签上下文关闭菜单
- **AND** 菜单 SHALL 提供 `关闭当前`、`关闭左侧`、`关闭右侧`、`关闭其他`、`关闭所有`
- **AND** `关闭左侧` 与 `关闭右侧` SHALL 按当前右键目标标签两侧的标签集合计算，不依赖当前激活页
- **AND** `关闭其他` SHALL 保留右键目标标签并关闭其它可关闭标签
- **AND** `关闭所有` SHALL 导航到 `/` 并重新打开普通 `身份总览` fallback 标签

#### Scenario: 右键菜单不是唯一关闭入口
- **WHEN** 桌面右键菜单可用
- **THEN** 每个可关闭标签仍 SHALL 提供可见关闭按钮或等效可访问关闭操作
- **AND** 键盘用户 SHALL 能通过现有可见关闭 affordance 完成单标签关闭
- **AND** 移动端 SHALL NOT 依赖右键菜单才能关闭或切换工作页面

#### Scenario: 桌面标签栏不制造页面级横向溢出
- **WHEN** 桌面端标签数量很多或侧边栏在展开/收起之间切换
- **THEN** 标签栏主要降级手段 SHALL 是自身横向滚动
- **AND** 标签栏 SHALL NOT 导致页面级横向溢出
- **AND** 右键菜单、单标签关闭按钮和滚动箭头 SHALL 保持稳定高度，不挤压主内容区

### Requirement: 移动端工作区标签降级
Admin 身份控制台 Shell SHALL 在移动端避免渲染完整多标签栏，改为展示当前页面标题或路径以及一个“更多”入口，以保护首屏空间和可读性。

#### Scenario: 移动端不展示完整 tabs
- **WHEN** 管理员在 `390x844` 或等价移动视口打开身份控制台页面
- **THEN** Shell SHALL NOT 渲染完整桌面多标签列表
- **AND** Shell SHALL 展示当前页面标题或 route 路径
- **AND** Shell SHALL 提供“更多”入口访问已打开工作页面

#### Scenario: 移动端无页面级横向溢出
- **WHEN** 管理员在移动端打开 `/`、`/applications`、`/providers`、`/records`、`/organizations`、`/users` 或 `/agents`
- **THEN** workspace tabs 降级栏 SHALL NOT 导致 `document.documentElement.scrollWidth` 大于 `document.documentElement.clientWidth + 1`
- **AND** 主内容首屏 SHALL NOT 因标签栏明显下沉

#### Scenario: 移动端关闭入口不依赖右键
- **WHEN** 管理员在移动端打开 workspace tabs 更多菜单
- **THEN** 菜单 SHALL 继续提供已打开工作页面的导航入口
- **AND** 可关闭标签 SHALL 保留移动端可触达的关闭按钮或等效操作
- **AND** 桌面右键关闭菜单 SHALL NOT 成为移动端完成关闭动作的唯一入口

### Requirement: 工作区标签状态轻量持久化
Admin 身份控制台 Shell SHALL 通过 route-driven state 和浏览器会话级存储轻量保存已打开标签，不得依赖 iframe、复杂 keep-alive 或跨页面业务状态缓存。

#### Scenario: 会话内恢复打开标签
- **WHEN** 管理员在同一浏览器会话中刷新 Admin 页面
- **THEN** Shell MAY 从 sessionStorage 恢复已打开标签顺序
- **AND** 如果存储内容不可解析、版本不匹配或包含无效路径，Shell SHALL 安全降级为当前有效 route 加普通总览 fallback 标签

#### Scenario: 不缓存业务页面状态
- **WHEN** 管理员在标签间切换
- **THEN** Shell SHALL 使用现有 React route 渲染对应页面
- **AND** Shell SHALL NOT 使用 iframe、隐藏页面 keep-alive 或本地伪造页面状态替代真实 route 行为

#### Scenario: 关闭全部后恢复总览 fallback
- **WHEN** 管理员通过桌面右键菜单或等效批量动作执行 `关闭所有`
- **THEN** Shell SHALL 清空当前可关闭标签集合
- **AND** Shell SHALL 导航到 `/`
- **AND** Shell SHALL 打开一个普通 `身份总览` fallback 标签并持久化该状态

### Requirement: AICodex 身份基础设施总览
Admin 身份控制台总览 SHALL 以 `AICodex 身份基础设施总览` 呈现 AICodex 四个产品域的身份运行状态、接入覆盖、待核对事项和审计证据，而不是泛企业认证中心入口集合。

#### Scenario: 总览标题和面包屑使用身份控制台口径
- **WHEN** local admin 访问 `/`
- **THEN** 页面主标题 SHALL 为 `AICodex 身份基础设施总览`
- **AND** 面包屑 SHALL 为 `身份控制台 / 身份总览`
- **AND** 页面副标题 SHALL 使用简短控制台状态口径，而不是说明文档式长句
- **AND** 页面 SHALL NOT 使用 `企业认证中心` 作为用户可见产品名

#### Scenario: 总览覆盖 AICodex 四个产品域
- **WHEN** 页面展示产品域覆盖
- **THEN** 页面 SHALL 展示 `应用规格`、`用量洞察`、`身份控制台`、`API 网关` 四个业务名
- **AND** `aicodex-app-spec`、`aicodex-insight`、`aicodex-admin`、`aicodex-api` SHALL 仅作为次级 code tag 或证据标识展示
- **AND** 产品域卡片 SHALL 帮助管理员理解接入声明、用量归因、组织身份配置、Gateway 授权和审计事实

#### Scenario: 总览优先状态和证据
- **WHEN** 管理员在 `1440x900` 桌面视口打开 `/`
- **THEN** 首屏 SHALL 可见覆盖指标、四产品域、待核对事项、接入健康或最近审计证据
- **AND** `身份资产关系`、`治理任务中心`、`接入预检中心` SHALL NOT 作为总览显眼入口堆叠出现
- **AND** 指向既有能力的链接 MAY 以核对建议、状态操作或低噪上下文入口保持可达

#### Scenario: 总览指标口径保持可信
- **WHEN** dashboard 数据可推导用量归因完整度
- **THEN** 顶部 `用量归因完整度` 与用量洞察产品域卡片 SHALL 使用一致显示值
- **AND** 同屏 SHALL NOT 出现一个 `用量归因完整度` 显示 `-`、另一个同语义卡片显示 `98%` 的状态

#### Scenario: KPI 状态表达不得依赖无语义装饰线
- **WHEN** 页面展示顶部 KPI 指标
- **THEN** KPI SHALL NOT 使用管理员无法解释的彩色顶部边线作为主要视觉信号
- **AND** 状态语义 SHALL 通过标签、数值、描述或清晰分组表达

#### Scenario: 最近审计证据操作文案具体可辨
- **WHEN** 页面展示最近审计证据列表
- **THEN** 每条证据操作 SHALL 使用对象或证据类型相关文案
- **AND** 列表 SHALL NOT 机械重复 `查看记录` 作为所有条目的唯一 CTA

#### Scenario: 没有真实处理流时使用核对状态
- **WHEN** 总览展示风险、授权映射、用量归因、接入或审计相关状态
- **THEN** UI SHALL 使用 `待核对`、`待关注`、`核对建议`、`核对中`、`正常` 或等价只读核对文案
- **AND** UI SHALL NOT 展示 `待处理` 或暗示已有后端工单处理闭环的状态

#### Scenario: 总览不暴露内部设计或实现术语
- **WHEN** 管理员查看总览可见文案
- **THEN** 页面 SHALL NOT 展示 `国内云控制台式密度`、`避免把治理入口堆到菜单里`、`对象上下文`、`deep link`、`只读推导`、`当前列表视图` 等内部设计术语或实现痕迹

### Requirement: 身份总览导航入口收敛
Admin 身份控制台左侧首个一级菜单 SHALL 为 `身份总览`，并 SHALL 避免用独立 `快捷操作` 入口填充首页导航。

#### Scenario: 首个一级菜单为身份总览
- **WHEN** local admin 打开桌面侧栏、移动抽屉或组织导航配置树
- **THEN** 首个一级入口 SHALL 使用 `身份总览`
- **AND** 它 SHALL 指向 `/` 总览路由
- **AND** 如果首组只剩一个总览子项，壳层 SHOULD 将其直接渲染为一级菜单项，而不是展示只有一个二级入口的分组

#### Scenario: 快捷操作不作为显眼侧栏入口
- **WHEN** local admin 查看身份控制台侧栏或移动抽屉
- **THEN** 侧栏 SHALL NOT 展示独立 `快捷操作` 主入口
- **AND** `/shortcuts` 路由兼容性 MAY 保留，但不作为身份总览第一屏或首组菜单的显眼入口

### Requirement: Admin 身份控制台 UI 规则
Admin 身份控制台 UI 规则 SHALL 以 Ant Design / Ant Design Pro 为主准则，并把其他设计系统限定为补充检查来源。

#### Scenario: 设计来源边界清晰
- **WHEN** 后续 agent 阅读项目设计文档或 `web-admin/AGENTS.md`
- **THEN** 文档 SHALL 明确 Ant Design / Ant Design Pro 是本 Admin 的主设计准则
- **AND** IBM Carbon SHALL 仅用于数据表格、toolbar、搜索/筛选、列设置、批量操作和密度参考
- **AND** Microsoft Fluent 2 SHALL 仅用于可访问性、焦点顺序、对比、内容与工具型产品体验参考
- **AND** Material Design 3 / Apple HIG SHALL 仅用于通用导航、层级、响应式和平台一致性检查
- **AND** Vercel Web Interface Guidelines SHALL 仅作为语义 HTML、button/link、aria、focus-visible、长文本、overflow、URL 状态和 i18n checklist

#### Scenario: 规则可执行
- **WHEN** 后续 change 修改 Admin 身份控制台菜单、总览、表格、工具栏、状态标签、移动布局或用户可见文案
- **THEN** 项目规则 SHALL 要求菜单命名优先四字中文业务名、产品域使用业务名、仓库名仅作 code tag、禁止泛企业/内部实现文案、总览优先状态和证据、减少入口堆叠、表格/工具栏保持管理台密度、首屏不压低核心内容、桌面/移动均无页面级横向溢出
- **AND** 新增 React 组件、共享逻辑和测试 SHALL 遵循 web-admin TypeScript 稳态规则

### Requirement: 工作区标签必须过滤无效路由并保持顺序稳定

Admin 身份控制台 Shell SHALL use current enterprise navigation route metadata as the workspace tab allowlist, and SHALL keep tab order stable after hydration, navigation, repeated opens and close actions.

#### Scenario: 恢复历史标签时过滤无效路由

- **WHEN** session storage contains `/404`, empty paths, unknown paths, old shortcut paths or routes that are no longer visible in the current enterprise navigation
- **THEN** workspace tabs SHALL discard those paths before rendering or saving tabs
- **AND** `/404` SHALL NOT appear as a workspace tab
- **AND** if all restored non-default paths are invalid, Shell SHALL fall back to the fixed overview tab plus the current valid route when one exists

#### Scenario: 未知 URL 不进入工作区标签

- **WHEN** a user directly visits an unknown URL and the router renders the 404 page
- **THEN** Shell MAY show the 404 page through the normal router fallback
- **AND** Shell MUST NOT create, persist or display a workspace tab for that unknown URL or `/404`

#### Scenario: 激活已有标签不改变打开顺序

- **WHEN** a user clicks an existing workspace tab or opens a route that already has a tab
- **THEN** Shell SHALL only activate or navigate to that route
- **AND** the tab order SHALL remain the original open order
- **AND** the fixed overview tab SHALL remain first

#### Scenario: 关闭当前标签按稳定相邻规则切换

- **WHEN** a user closes the active non-fixed workspace tab
- **THEN** Shell SHALL navigate to the nearest right-side remaining tab when it exists
- **AND** Shell SHALL navigate to the nearest left-side remaining tab when no right-side tab exists
- **AND** Shell SHALL navigate to the fixed overview tab when no other non-fixed tab remains

#### Scenario: 标签栏视觉和可访问性稳定

- **WHEN** desktop workspace tabs render with active, hover, focus-visible and close-button states
- **THEN** active tabs SHALL be visually clearer than inactive tabs while preserving stable height and gutter
- **AND** inactive tabs SHALL remain quiet and scan-friendly
- **AND** long titles SHALL truncate within the tab instead of expanding the page
- **AND** close buttons SHALL have accessible labels and visible hover/focus states

### Requirement: 工作区标签关闭入口直接可见
Admin 身份控制台 workspace tabs SHALL 在桌面端提供一个直接可见的标签栏级关闭入口，并为单个可关闭标签提供 active、hover 或 focus 状态下的关闭 affordance；移动端和键盘用户不得依赖右键菜单完成关闭。

#### Scenario: 桌面标签关闭入口降噪
- **WHEN** 管理员在桌面端查看可关闭 workspace tabs
- **THEN** 标签栏 SHALL 提供直接可见的 icon-only 全局关闭菜单入口
- **AND** 全局关闭菜单 SHALL 提供 `关闭当前`、`关闭其他` 和 `关闭所有`
- **AND** 当前 active 标签的单标签关闭按钮 SHALL 默认可见
- **AND** 非活动标签的单标签关闭按钮 SHALL 仅在 hover、focus 或等效上下文状态下显示
- **AND** 单标签关闭按钮 SHALL 具备可访问名称并保留 hover 与 focus-visible 状态

#### Scenario: 桌面标签栏与内容区分隔克制
- **WHEN** 管理员在桌面端查看 workspace tabs 与页面内容之间的过渡区域
- **THEN** Shell SHALL 使用细分隔线表达标签栏边界
- **AND** Shell SHALL NOT 在标签栏下方额外展示明显高度的蓝灰色分隔带
- **AND** 标签栏、页面背景和内容卡片 SHALL NOT 形成过多横向颜色层
- **AND** 桌面标签栏 SHALL 使用紧凑高度，普通标签高度 SHOULD 接近 `30px`，整行高度 SHOULD 接近 `36px`
- **AND** 桌面内容区在标签栏下方 SHALL 使用紧凑但可读的起始留白，顶部 SHOULD 接近 `12px`，左右 SHOULD 接近 `16px`
- **AND** 移动端标签降级 SHALL NOT 因桌面紧凑高度而降低触控可达性

#### Scenario: 新旧内容页边界一致
- **WHEN** 管理员在 desktop Shell 中从 workspace tabs 切换到旧版 Card 承载页或新版无外层 Card 页面
- **THEN** 页面内容 SHALL 在标签栏下方使用一致的顶部留白、左右内缩和轻量卡片边界
- **AND** 旧版 Card 承载页 SHALL NOT 贴着标签栏或侧栏边界形成与新版身份页明显不同的分界
- **AND** 该一致性调整 SHALL NOT 改变业务页面表格、查询、排序、分页或操作语义

#### Scenario: 桌面非活动标签视觉降权
- **WHEN** 管理员在桌面端查看多个 workspace tabs
- **THEN** 当前 active 标签 SHALL 作为唯一主要焦点，保留白底、克制的蓝色顶边和较高文字权重
- **AND** 非 active 标签 SHALL 使用更轻的边框、文字权重和状态点
- **AND** 左右滚动按钮与标签栏级关闭入口 SHALL 在常态下低于 active 标签视觉权重
- **AND** 标签栏级关闭入口 SHALL 保留可识别的关闭图标和可访问名称
- **AND** active 标签的单标签关闭按钮 SHALL NOT 在常态下使用高权重蓝底或 primary button 观感

#### Scenario: 桌面标签横向滚动按段移动
- **WHEN** 管理员点击 workspace tabs 左右滚动按钮
- **THEN** 标签轨道 SHALL 按较小段距平滑滚动
- **AND** 单次点击 SHOULD NOT 在常见桌面宽度下一次性跳到最左或最右
- **AND** 左右滚动按钮 SHALL 继续只在对应方向存在隐藏标签时可用

#### Scenario: 总览普通标签关闭后 fallback
- **WHEN** 管理员关闭 `身份总览` 或执行 `关闭所有` 后没有其它标签可用
- **THEN** Shell SHALL 自动导航到 `/`
- **AND** Shell SHALL 重新打开一个普通 `身份总览` fallback 标签
- **AND** 该 fallback 标签 SHALL 继续位于横向滚动轨道内而不是固定区域

### Requirement: 企业控制台视觉层级 polish
Admin 身份控制台 SHALL 使用浅冷灰页面画布、清晰 shell 分层、白底卡片、克制状态色和更强 summary band，使总览和通用壳层更像成熟企业控制台，同时保持工作型后台信息密度。

#### Scenario: 桌面总览视觉层级
- **WHEN** 管理员在 `1440x900` 桌面视口打开 `/`
- **THEN** 页面底色、顶部栏、侧边栏、workspace tabs 和内容区 SHALL 形成可辨识层级，而不是大面积纯白线框后台
- **AND** summary band SHALL 让指标数字、状态和主要操作更容易扫描
- **AND** 卡片 SHALL 保持白底，并通过边框、轻阴影、状态色左条或角标表达层级

#### Scenario: 状态色克制且不更换 icon
- **WHEN** 页面展示审计、风险、健康或指标状态
- **THEN** UI SHALL 使用正常、待关注、高影响等克制功能色辅助扫描
- **AND** 紫色 SHALL 只作为主品牌色之一，并配合蓝、青、橙等功能色避免整页单色调
- **AND** 现有 icon SHALL 保持，不得替换为另一套 icon 风格

#### Scenario: 移动端视觉 polish 不破坏降级栏
- **WHEN** 管理员在 `390x844` 移动视口打开身份控制台
- **THEN** 移动 Drawer、workspace tabs 降级栏和主要内容 SHALL 不出现文本重叠
- **AND** Shell 根文档 SHALL NOT 产生页面级横向溢出

### Requirement: Shell 侧栏选中态层级
Admin 身份控制台桌面侧栏 SHALL 让当前叶子菜单项承担主要选中态，父级菜单只表达展开或归属关系，不得与当前子项同时使用同等级高权重强调。

#### Scenario: 当前子项为主要选中态
- **WHEN** 管理员打开某个二级导航页面
- **THEN** 当前子项 SHALL 使用主要选中底色、文字色或左侧强调条
- **AND** 对应父级 SHALL 使用更轻的背景或文字色提示归属
- **AND** 父级 SHALL NOT 与当前子项同时显示同等级粗紫色左条

#### Scenario: 收起态保持父级入口可达
- **WHEN** 管理员收起桌面侧栏
- **THEN** 父级 icon SHALL 继续作为二级入口的可达触发点
- **AND** 轻量父级归属样式 SHALL NOT 破坏 AntD collapsed submenu popup 行为

### Requirement: 应用接入分组必须包含用量接入入口
Admin 身份控制台 Shell SHALL 在 `应用接入` 一级分组下新增 `/application-usage-access` 叶子入口，标签为 `用量接入`，用于承载用量链路治理聚焦页。

#### Scenario: 侧栏展示用量接入
- **WHEN** local admin 打开桌面侧栏或移动端抽屉
- **THEN** `应用接入` 分组 SHALL include `/applications` as `应用接入中心`
- **AND** `应用接入` 分组 SHALL include `/application-usage-access` as `用量接入`
- **AND** 系统 SHALL NOT 新增一级 `用量接入`、`用量中心`、`配置中心` 或等价抽象主入口

#### Scenario: 导航配置树展示用量接入
- **WHEN** 管理员在组织配置页编辑 `navItems` 或 `userNavItems`
- **THEN** 配置树 SHALL 在 `应用接入` 分组下展示 `/application-usage-access`
- **AND** 配置值 SHALL 使用稳定 route key `/application-usage-access`
- **AND** 权限过滤 SHALL 继续基于 route key 而不是标签文案

#### Scenario: 工作区标签显示用量接入
- **WHEN** 管理员打开 `/application-usage-access`
- **THEN** workspace tab、route title 或移动端降级标题 SHALL 使用当前语言的 `用量接入` 标签
- **AND** 已打开 `/applications` 与 `/application-usage-access` SHALL 作为两个可区分的页面标签

### Requirement: 控制台页面页头固定与正文内部滚动
Admin 身份控制台桌面壳层 SHALL 让工作区标签、页面页头和正文滚动边界清晰分离；长内容页面必须在正文容器内滚动，而不是把整个文档页面一起向下推走。

#### Scenario: 桌面端长页面保持标签和页头可见
- **WHEN** 管理员在桌面端打开 `/`、`/organizations`、`/server-store` 或等价的长内容身份控制台页面
- **THEN** workspace tabs 和页面页头 SHALL 保持在正文滚动容器上方可见
- **AND** 纵向滚动 SHALL 发生在当前页面正文容器内
- **AND** 根文档 SHALL NOT 因页面正文变长而承担主要纵向滚动

#### Scenario: 共享页壳提供统一滚动边界
- **WHEN** 页面采用身份控制台共享页面壳
- **THEN** 页面 SHALL 拆分为非滚动的 header 区和可滚动的 body 区
- **AND** body 区 SHALL 负责正文纵向滚动和 overscroll containment
- **AND** 页头区域 SHALL NOT 因正文变长而一起离开当前内容视口

#### Scenario: 旧 Card 页面接入后保持统一起始节奏
- **WHEN** 旧版 Card 承载页在身份控制台桌面壳层内渲染
- **THEN** 页面顶部、左右内边距和卡片外边距 SHALL 与新版无外层 Card 页面保持同一套起始节奏
- **AND** 工作区标签下方 SHALL NOT 因额外包裹层出现明显空带或分隔噪声

#### Scenario: 窄屏下保持单一可用滚动路径
- **WHEN** 管理员在窄屏或移动端打开采用共享页壳的页面
- **THEN** 页面 SHALL 保持单一可用的纵向滚动路径
- **AND** 共享页壳 SHALL NOT 额外制造难以触达的双重纵向滚动区域

### Requirement: 总览与工具页共享紧凑页头密度
Admin 身份控制台总览页和接入共享页面壳的工具页 SHALL 使用一致的页头留白、标题层级和工具栏起始节奏，并对总览右侧状态区进行降噪。

#### Scenario: 总览页头紧凑化
- **WHEN** 管理员访问 `/`
- **THEN** 页面主标题、描述、操作按钮和正文起始留白 SHALL 使用紧凑页头密度
- **AND** 页面 SHALL NOT 再额外展示与主标题重复的 eyebrow breadcrumb
- **AND** 总览右侧状态区 SHALL 使用更紧凑的列表节奏，而不是连续重卡片观感

#### Scenario: 工具页沿用同一页壳节奏
- **WHEN** 管理员访问 `/server-store` 或其他接入共享页面壳的工具页
- **THEN** 页面标题区、筛选工具栏与正文之间 SHALL 使用与身份控制台页面一致的基础间距和滚动边界
- **AND** 页面 SHALL NOT 因单独实现而出现与总览明显不同的顶部留白或滚动行为

### Requirement: 身份控制台共享页壳暗黑主题一致性
Admin 身份控制台共享 shell 与共享页壳 SHALL 通过统一主题 token 驱动外层画布、panel、toolbar 辅助区、分隔线和次级文本，在明亮与暗黑模式切换后保持一致层级，不得让近期接入共享页壳的页面残留固定浅色 surface。

#### Scenario: 暗黑模式下共享页壳不出现白色孤岛
- **WHEN** 管理员在桌面端切换到暗黑模式并访问采用共享 shell 或共享页壳的身份控制台页面
- **THEN** 页头下方的正文容器、outer panel、toolbar 辅助区和分页邻接区域 SHALL 使用暗黑主题 surface、border 和 text token
- **AND** 页面 SHALL NOT 留下显著白色外层 panel、白色分隔带或与壳层脱节的浅色信息块

#### Scenario: 页面局部自定义块复用共享主题边界
- **WHEN** 共享页壳消费者需要渲染页面局部自定义卡片、状态块、结果块、证据块或摘要条
- **THEN** 这些局部 surface SHALL 复用共享 `--admin-shell-*` 或 `--list-page-*` 主题 token
- **AND** 实现 SHALL NOT 改变既有页头固定、正文内部滚动和列表主任务优先的壳层语义

#### Scenario: 非列表型 AntD Card 页不落回默认黑色控件
- **WHEN** 管理员在暗黑模式下访问 API 网关映射或其它未改造成标准分页列表的配置/诊断型页面
- **THEN** 页面内 Card、Tabs、表单控件、默认按钮、表格、空态和默认 Tag SHALL 使用共享 shell surface、border 和 text token
- **AND** 页面 SHALL NOT 因 Ant Design 默认 `rgb(20,20,20)` surface 或纯黑控件造成与共享列表壳不一致的视觉断层

#### Scenario: Cardless 路由保持侧栏与正文间距层级
- **WHEN** 管理员在桌面端访问企业微信同步、飞书同步或其它 cardless 配置页
- **THEN** 正文滚动区 SHALL 在侧栏右侧保持与普通 Card/List 路由一致的内容间距和层级
- **AND** 该间距 SHALL NOT 改变 without-card 路由的内部滚动语义或普通 Card/List 路由的布局节奏

#### Scenario: 路由与页面壳共享同一套边界 spacing
- **WHEN** 管理员访问普通 Card route、cardless route 或使用 PageScrollShell 的管理页面
- **THEN** 页面外层横向间距、顶部间距和底部间距 SHALL 通过同一套 route/page shell spacing token 表达
- **AND** 页面消费者 SHALL NOT 再叠加第二套外层 margin/padding 造成组织、群组、用户、同步页或系统工具页边界不一致

#### Scenario: 系统信息页不使用旧大 Card route 和窄列布局
- **WHEN** 管理员在桌面端访问 `/sysinfo`
- **THEN** 系统信息页 SHALL 走 cardless route，工作页标签保持固定，正文内部滚动
- **AND** CPU、内存、磁盘、网络、API 延迟、API 吞吐量和 About 信息 SHALL 使用共享 shell surface、border 和 text token 呈现为诊断面板布局
- **AND** 页面 SHALL NOT 回退到旧的外层大 Card、居中窄列或由 API 长表直接拖长整个页面的布局

#### Scenario: MCP Store 卡片目录页使用共享 card catalog surface
- **WHEN** 管理员在桌面端访问 `/server-store`
- **THEN** MCP Store SHALL 走 cardless route，工作页标签保持固定，筛选工具栏和卡片目录在正文内部滚动
- **AND** 筛选输入、Tag 选择器、默认按钮、目录卡片、Tag、链接和添加按钮 SHALL 使用共享 shell surface、border、text 和 link token
- **AND** 页面 SHALL NOT 回退到旧的外层大 Card、纯黑卡片或标题挤压“添加”按钮的布局

### Requirement: 大编辑页只保留一个主要页面壳

Admin 身份控制台 Shell SHALL 在组织、用户、应用、Provider、Syncer 等长编辑页中避免外层内容 Card 与页面内部编辑壳叠加，页面 SHALL 只保留一个主要编辑页面壳。

#### Scenario: 组织用户群组复用统一编辑壳
- **WHEN** 管理员访问组织、用户或群组编辑页
- **THEN** 页面内部编辑壳 SHALL 使用同一套头部、滚动正文容器和底部动作栏结构
- **AND** 多 tabs 与单正文 SHALL 只是正文区域的差异
- **AND** 组织和用户 MAY 在正文上方提供页内 Tabs
- **AND** 群组 MAY 不提供页内 Tabs 并直接展示单正文

#### Scenario: 组织编辑页不叠加外层内容 Card
- **WHEN** 管理员在桌面端访问 `/organizations/:organizationName`
- **THEN** Shell SHALL 使用 cardless route 滚动容器承载组织编辑页
- **AND** route scroll 容器内 SHALL NOT 渲染 `.content-warp-card`
- **AND** 组织编辑页内部主编辑壳 SHALL 承载返回路径、Tabs、表单内容和固定底部动作栏
- **AND** 组织编辑页主要保存动作 MAY 位于同一编辑壳的固定底部栏，而不是 Card 标题内

#### Scenario: 用户编辑页不叠加外层内容 Card
- **WHEN** 管理员在桌面端访问 `/users/:organizationName/:userName`
- **THEN** Shell SHALL 使用 cardless route 滚动容器承载用户编辑页
- **AND** route scroll 容器内 SHALL NOT 渲染 `.content-warp-card`
- **AND** 用户编辑页内部主编辑壳 SHALL 承载返回路径、用户编辑标题、Tabs 或单分组正文、表单内容和固定底部动作栏
- **AND** 用户编辑页主要保存动作 SHALL 位于同一编辑壳的固定底部栏，而不是 Card 标题或页面正文末尾的重复按钮组

#### Scenario: 其它大编辑页复用同一单壳规则
- **WHEN** 管理员在桌面端访问应用、Provider 或 Syncer 的长编辑页
- **THEN** Shell SHALL 使用 cardless route 滚动容器承载页面
- **AND** route scroll 容器内 SHALL NOT 渲染 `.content-warp-card`
- **AND** 页面内部编辑 Card SHALL 保持既有标题、操作和业务表单行为

#### Scenario: 大编辑页不制造页面级横向溢出
- **WHEN** 管理员在 `1280px` 或 `1920px` 桌面宽度访问组织或用户长编辑页
- **THEN** Shell 根文档 SHALL NOT 因外层内容卡、表单 label gutter 或内部编辑壳叠加产生不必要的页面级横向 overflow
- **AND** 需要横向滚动的表格或局部组件 SHALL 在自身容器内处理

### Requirement: 大编辑页内部表单布局稳定
Admin 身份控制台 SHALL 为组织、用户、应用、Provider、Syncer 等大编辑页、应用接入与凭据编辑页以及身份对象 / 权限对象编辑页提供一致的内部主表单布局，使桌面端 label 列具备稳定宽度、内容列可伸缩且页面级不产生不必要横向溢出。

#### Scenario: 大编辑页主编辑 Card 暴露统一布局边界
- **WHEN** 管理员打开组织、用户、应用、Provider 或 Syncer 编辑页
- **THEN** 页面内部主编辑 Card SHALL 暴露统一的 `admin-large-edit-card` 样式边界
- **AND** 页面 MAY 同时保留页面专属 class 供测试、smoke 和后续局部修复定位

#### Scenario: 应用接入与凭据编辑页暴露独立布局边界
- **WHEN** 管理员打开证书、密钥、Webhook、Token、LDAP、Adapter 或 Enforcer 等应用接入、凭据或集成配置编辑页
- **THEN** 页面内部主编辑 Card SHALL 暴露 scoped 的 `admin-access-edit-card` 样式边界
- **AND** 页面根节点 MAY 暴露 `admin-access-edit-page` 以及页面专属 class 供测试、smoke 和后续局部修复定位
- **AND** 字段行 SHALL 暴露 scoped 的 `admin-access-edit-field-row` 边界，供本类页面内部 label/content 布局使用

#### Scenario: 身份对象编辑页主编辑 Card 暴露统一布局边界
- **WHEN** 管理员打开 Group、Role、Permission 或 Invitation 编辑页
- **THEN** 页面内部主编辑 Card SHALL 暴露统一的 `admin-identity-object-edit-card` 样式边界
- **AND** 普通字段行 SHALL 暴露 `admin-identity-object-edit-field-row` 供 scoped CSS 和布局测试定位
- **AND** 页面 MAY 同时保留页面专属 class 供测试、smoke 和后续局部修复定位

#### Scenario: 桌面端主表单 label 与内容列稳定
- **WHEN** 管理员在桌面端打开这些大编辑页、应用接入与凭据编辑页或身份对象 / 权限对象编辑页
- **THEN** 主表单行的 label 列 SHALL 使用稳定宽度而不是仅依赖 2/24、3/24 或 4/24 百分比宽度
- **AND** 主内容列 SHALL 使用剩余空间并允许长输入、选择器或局部组件在自身容器内处理 overflow

#### Scenario: 窄屏端主表单换行
- **WHEN** 管理员在窄屏设备打开这些大编辑页、应用接入与凭据编辑页或身份对象 / 权限对象编辑页
- **THEN** 主表单 label 与内容 SHALL 切换为单列换行
- **AND** 页面级 SHALL NOT 因主编辑 Card label/content 布局产生横向滚动

#### Scenario: 编辑页业务语义保持不变
- **WHEN** 管理员保存、保存并退出、取消新增、删除或编辑这些页面的业务字段
- **THEN** Admin SHALL 保持既有 API payload、路由跳转、按钮可用性和字段编辑语义不变

#### Scenario: 应用编辑页 tab 内容不继承主字段行布局
- **WHEN** 管理员在桌面端打开 `/applications/:organizationName/:applicationName` 并切换到 `提供商` tab
- **THEN** Provider 绑定列表或表格 SHALL 使用 tab pane 的可用宽度
- **AND** Provider tab 内的 full-width 内容 SHALL NOT 被主表单 label/content Row 规则压缩成固定 label 窄列

#### Scenario: 应用编辑页界面定制 tab 可切换渲染
- **WHEN** 管理员在应用编辑页切换到 `界面定制` tab
- **THEN** 页面 SHALL 渲染界面定制内容
- **AND** 页面 SHALL NOT 因 tab 切换出现白屏、React render exception 或 webpack overlay
- **AND** 应用编辑页保存 payload、路由语义和后端接口 SHALL 保持不变

### Requirement: 应用编辑页界面定制预览稳定
Admin 身份控制台 SHALL 在应用编辑页 `界面定制` tab 中稳定渲染登录、注册和授权提示预览，不得因预览子树本地渲染异常导致整页白屏。

#### Scenario: 直接打开界面定制 hash
- **WHEN** 管理员打开 `/applications/:organizationName/:applicationName#ui-customization`
- **AND** 应用记录包含后端可返回的空值形态，例如 `signupItems: null`、`themeData: null` 或 `orgChoiceMode: ""`
- **THEN** Admin SHALL 渲染 `界面定制` tab 的表单项和预览区域
- **AND** 页面 SHALL NOT 出现 React 渲染异常导致的白屏

#### Scenario: 切换到界面定制 tab
- **WHEN** 管理员从应用编辑页其它 tab 切换到 `界面定制`
- **THEN** Admin SHALL 挂载登录、注册和授权提示预览
- **AND** 预览中的 i18n 文案调用 SHALL NOT 因丢失 `i18next` 实例上下文而抛出异常

#### Scenario: 编辑页业务语义保持不变
- **WHEN** 管理员编辑或保存应用配置
- **THEN** Admin SHALL 保持既有 API payload、保存流程、路由语义和后端契约不变

### Requirement: 身份对象编辑页可使用单页固定操作栏

Admin 身份控制台 Shell SHALL 允许 Group、Role、Permission 或 Invitation 等身份对象编辑页按对象复杂度采用单页编辑壳和固定底部操作栏，并保持同一页面内只有一个主要编辑壳。

#### Scenario: 群组编辑页使用单页固定操作栏
- **WHEN** 管理员在桌面端访问 `/groups/:organizationName/:groupName`
- **THEN** 群组编辑页 SHALL 使用单个主编辑壳承载返回路径、基础信息表单和固定底部动作栏
- **AND** route scroll 容器与页面内部编辑壳 SHALL NOT 叠加出多套标题和保存动作
- **AND** 群组编辑页 SHALL 保留 `group-edit-page` 与 `group-edit-card` 或等价 scoped class 供测试、smoke 和后续局部修复定位

#### Scenario: 身份对象编辑页不制造页面级横向溢出
- **WHEN** 管理员在 `1280px` 或 `1920px` 桌面宽度访问群组编辑页
- **THEN** Shell 根文档 SHALL NOT 因表单 label gutter、长选择器或内部编辑壳产生不必要的页面级横向 overflow
- **AND** 长成员摘要或局部组件 SHALL 在自身容器内换行、截断或滚动

#### Scenario: 群组详情工作区标签可区分
- **WHEN** 管理员打开多个 `/groups/:organizationName/:groupName` 群组详情页
- **THEN** 工作区顶部标签 SHALL 使用群组标识或显示名称区分不同群组页
- **AND** 群组数据加载后 SHALL 能将当前标签从路由标识更新为群组显示名称

#### Scenario: 其它身份对象页可后续迁移
- **WHEN** Role、Permission 或 Invitation 编辑页尚未迁移到固定底部操作栏
- **THEN** 本 change SHALL NOT 要求同批改造这些页面
- **AND** 后续迁移 SHALL 保持各自保存 payload、路由语义和后端契约不变

### Requirement: Admin shell 响应式导航

Admin shell SHALL 保持桌面导航密度和稳定性，同时避免全局侧栏在窄视口挤压业务内容。

#### Scenario: 窄视口使用 compact shell 导航

- **WHEN** the Admin shell renders at a narrow viewport such as 390px
- **THEN** 桌面侧栏 SHALL NOT 占用横向页面宽度
- **AND** shell SHALL 暴露现有 drawer/menu 导航入口
- **AND** 桌面侧栏折叠偏好 SHALL 仍只作用于桌面布局
- **AND** route content SHALL 保持 `min-width: 0` 并避免页面级横向溢出

### Requirement: 角色编辑页应使用轻量单页固定操作栏

Admin 身份控制台 Shell SHALL 允许角色编辑页使用共享编辑框架承载角色元信息与授权范围维护，使管理员能够稳定返回、取消、保存或保存并返回，同时避免把中等数量字段拆成空 Tabs。

#### Scenario: 角色编辑页使用单页分区而不是 Tabs
- **WHEN** 管理员打开 `/roles/:organizationName/:roleName`
- **THEN** 页面 SHALL 使用单个主编辑壳展示角色编辑内容
- **AND** 页面 SHALL 以 `基础信息` 和 `授权范围` 两个区块组织字段
- **AND** 页面 SHALL NOT 为当前字段量渲染页内 Tabs
- **AND** 页面 SHALL 保留 `role-edit-page` 与 `role-edit-card` 或等价 scoped class 供测试、smoke 和后续局部修复定位

#### Scenario: 角色编辑页返回路径和底部动作保持可达
- **WHEN** 管理员在角色编辑页滚动或编辑字段
- **THEN** 页面顶部 SHALL 提供返回入口、组织账号路径和角色编辑标题
- **AND** 页面底部 SHALL 保留固定操作栏
- **AND** 操作栏按钮顺序 SHALL 为 `取消`、`保存`、`保存并返回`
- **AND** 页面 SHALL 与组织编辑页共用同类头部和底部操作栏视觉规则
- **AND** 角色编辑路由 SHALL 使用无外层 content Card 的内部滚动容器，使底部操作栏固定在编辑区域底部
- **AND** 页面 SHALL NOT 同时保留旧 Card 标题内保存按钮和正文底部重复保存按钮

#### Scenario: 角色编辑页保存语义保持兼容
- **WHEN** 管理员点击 `保存`
- **THEN** 页面 SHALL 使用现有 `RoleBackend.updateRole` 保存角色并停留在当前角色编辑页
- **AND** 页面 SHALL 保持现有保存 payload、角色名路由更新和错误回滚语义
- **WHEN** 管理员点击 `保存并返回`
- **THEN** 页面 SHALL 保存角色并返回 `/roles`

#### Scenario: 角色编辑页取消和返回保护未保存修改
- **WHEN** 管理员修改角色字段后点击返回或取消
- **THEN** 页面 SHALL 在离开前要求确认未保存修改
- **AND** 新增模式点击取消并确认离开后 SHALL 保留既有删除临时角色对象语义

#### Scenario: 角色编辑页必填字段保存前校验
- **WHEN** 管理员清空角色 `名称` 或 `显示名称` 后点击保存类按钮
- **THEN** 页面 SHALL 阻止提交到角色保存 API
- **AND** 缺失字段 SHALL 展示红色 `*` 和可读错误提示
- **AND** 页面 SHALL 展示本地化错误消息说明需补齐必填字段
