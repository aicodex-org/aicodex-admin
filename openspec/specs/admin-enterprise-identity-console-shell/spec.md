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

### Requirement: 企业 SaaS 管理台视觉
身份控制台 Shell SHALL 使用安静、专业、信息密度合理且按业务域分化的管理台视觉，避免大 hero、装饰渐变、营销式介绍、卡片套卡片和所有列表页套同一工作台模板；总览、组织身份、认证源、应用接入、LLM AI/Gateway 和审计运维 SHALL 使用一致的控制台基础语言，但首屏结构、文案、指标和操作入口 SHALL 服务各自业务域。

#### Scenario: 桌面端首屏
- **WHEN** 管理员在桌面端打开总览或身份控制台子页面
- **THEN** 首屏展示可扫描的状态区、风险区、入口区和对应页面的核心列表或核心操作
- **AND** 文案服务于操作决策

#### Scenario: 工作台视觉一致但不模板化
- **WHEN** 管理员在总览、组织身份、认证源中心、应用接入中心、LLM AI/Gateway 和审计运维页面之间切换
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
- **AND** 导引步骤 SHALL 使用企业身份治理、认证源、应用接入、审计运维、LLM AI/Gateway 等当前信息架构文案
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
- **THEN** 左侧主导航 SHALL 优先展示中心总览、组织与账号、应用接入、身份源、权限与角色、审计运维和 LLM AI/Gateway 等稳定业务域
- **AND** 主导航 SHALL NOT use implementation history, helper modules or abstract governance terms as the default top-level taxonomy

#### Scenario: 一级菜单命名保持四字中文优先
- **WHEN** 后续 change 新增或调整 Admin 身份控制台一级菜单标签、菜单分组名或菜单文档命名
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

### Requirement: 身份控制台一级菜单命名门禁
Admin 身份控制台 Shell SHALL 保持一级导航标签简洁、面向业务域且受测试门禁保护。常规中文一级菜单标签 MUST 使用四个中文字符，`LLM AI/Gateway` 等专有技术词 MAY 通过显式 allowlist 保留；没有明确产品例外时，新的抽象“中心/工作台/任务中心/快捷入口”式一级入口 SHALL NOT 被新增。

#### Scenario: 中文一级菜单使用四字业务名
- **WHEN** 管理员使用中文界面打开桌面侧栏或组织导航配置树
- **THEN** 每个常规中文一级分组标签 SHALL 正好包含四个中文字符
- **AND** `LLM AI/Gateway` 等允许保留的专有技术标签 SHALL 记录在导航测试 allowlist 中

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

#### Scenario: 桌面端打开页面生成标签
- **WHEN** 管理员在桌面端通过左侧菜单或 deep link 访问 `/applications`、`/providers`、`/records`、`/organizations`、`/users`、`/agents` 或其它可见身份控制台路由
- **THEN** Shell SHALL 在 header 下方展示对应工作页面标签
- **AND** 当前 route 的标签 SHALL 以克制蓝色文字、蓝点或上边线/边框表达激活态
- **AND** 非激活标签 SHALL 使用低对比灰底灰字
- **AND** 左侧菜单选中态和原有 route 渲染 SHALL 保持不变

#### Scenario: 总览标签固定不可关闭
- **WHEN** workspace tabs 渲染打开页面
- **THEN** `/` 总览类标签 SHALL 始终存在
- **AND** 总览标签 SHALL 不展示关闭按钮
- **AND** 关闭其它标签 SHALL NOT 移除总览标签

#### Scenario: 关闭标签时导航到可用页面
- **WHEN** 管理员关闭一个非当前标签
- **THEN** 当前页面 SHALL 保持不变
- **WHEN** 管理员关闭当前激活标签
- **THEN** Shell SHALL 导航到最近仍打开的标签
- **AND** 如果没有其它非固定标签可用，Shell SHALL 导航到 `/`

#### Scenario: 标签数量受控
- **WHEN** 打开的工作页面超过 8 个
- **THEN** Shell SHALL 只在标签栏直接展示约 8 个标签
- **AND** 其它标签 SHALL 通过“更多”菜单或等价降级入口可达
- **AND** 标签栏 SHALL NOT 让页面出现无限横向撑开或页面级横向溢出

#### Scenario: 标签栏与内容区分隔清晰
- **WHEN** 管理员打开任一桌面身份控制台页面
- **THEN** 标签栏与主页面内容之间 SHALL 使用 `1px` 分隔线和 `6-8px` 浅灰 gutter/divider
- **AND** 标签栏 SHALL NOT 贴住页面标题、筛选区或主表格工具栏

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

### Requirement: 工作区标签状态轻量持久化
Admin 身份控制台 Shell SHALL 通过 route-driven state 和浏览器会话级存储轻量保存已打开标签，不得依赖 iframe、复杂 keep-alive 或跨页面业务状态缓存。

#### Scenario: 会话内恢复打开标签
- **WHEN** 管理员在同一浏览器会话中刷新 Admin 页面
- **THEN** Shell MAY 从 sessionStorage 恢复已打开标签顺序
- **AND** 如果存储内容不可解析、版本不匹配或包含无效路径，Shell SHALL 安全降级为只包含总览和当前页面

#### Scenario: 不缓存业务页面状态
- **WHEN** 管理员在标签间切换
- **THEN** Shell SHALL 使用现有 React route 渲染对应页面
- **AND** Shell SHALL NOT 使用 iframe、隐藏页面 keep-alive 或本地伪造页面状态替代真实 route 行为

### Requirement: AICodex 身份基础设施总览
Admin 身份控制台总览 SHALL 以 `AICodex 身份基础设施总览` 呈现 AICodex 四个产品域的身份运行状态、接入覆盖、待核对事项和审计证据，而不是泛企业认证中心入口集合。

#### Scenario: 总览标题和面包屑使用身份控制台口径
- **WHEN** local admin 访问 `/`
- **THEN** 页面主标题 SHALL 为 `AICodex 身份基础设施总览`
- **AND** 面包屑 SHALL 为 `身份控制台 / 身份总览`
- **AND** 页面 SHALL NOT 使用 `企业认证中心` 作为用户可见产品名

#### Scenario: 总览覆盖 AICodex 四个产品域
- **WHEN** 页面展示产品域覆盖
- **THEN** 页面 SHALL 展示 `应用规格`、`用量洞察`、`身份控制台`、`API 网关` 四个业务名
- **AND** `aicodex-app-spec`、`aicodex-insight`、`aicodex-admin`、`aicodex-api` SHALL 仅作为二级 code tag 或证据标识展示
- **AND** 产品域卡片 SHALL 帮助管理员理解接入声明、用量归因、组织身份配置、Gateway 授权和审计事实

#### Scenario: 总览优先状态和证据
- **WHEN** 管理员在 `1440x900` 桌面视口打开 `/`
- **THEN** 首屏 SHALL 可见覆盖指标、四产品域、待核对事项、接入健康或最近审计证据
- **AND** `身份资产关系`、`治理任务中心`、`接入预检中心` SHALL NOT 作为总览显眼入口堆叠出现
- **AND** 指向既有能力的链接 MAY 以核对建议、状态操作或低噪上下文入口保持可达

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
- **AND** 新增 React 组件、共享逻辑和测试 SHALL 遵循 web-admin 渐进 TypeScript 规则
