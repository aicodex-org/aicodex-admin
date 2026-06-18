## ADDED Requirements

### Requirement: 业务域信息架构和抽象能力降级
Admin 企业认证中心 Shell SHALL organize primary navigation by administrator business domains, and SHALL keep cross-domain governance capabilities contextual unless a follow-up product decision proves they need prominent primary navigation.

#### Scenario: 主导航展示业务域
- **WHEN** 已登录管理员打开桌面端 Admin 壳层
- **THEN** 左侧主导航 SHALL 优先展示中心总览、组织与账号、应用接入、身份源、权限与角色、审计运维和 LLM AI/Gateway 等稳定业务域
- **AND** 主导航 SHALL NOT use implementation history, helper modules or abstract governance terms as the default top-level taxonomy

#### Scenario: 抽象治理能力不默认扩张为显眼入口
- **WHEN** 系统提供身份资产关系、接入预检、治理任务、快捷操作或等价横向能力
- **THEN** Shell SHALL expose those capabilities from overview pending issues, object details, row actions, configuration flows or result pages by default
- **AND** Shell SHALL NOT promote those capabilities as additional prominent primary navigation groups or repeated workbench pages unless the change records why contextual placement cannot satisfy the administrator workflow

#### Scenario: 既有能力保持可达
- **WHEN** 后续实现降低某个抽象入口的导航层级
- **THEN** existing routes, stable route keys and deep links SHALL remain reachable through contextual links, overview links or compatibility redirects
- **AND** permission filtering SHALL continue to use stable route keys rather than renamed group labels

### Requirement: 企业控制台视觉系统和首屏密度
Admin 企业认证中心 Shell SHALL present a mature enterprise console through operational density, hierarchy, table tooling and object context rather than decorative or explanatory page layers.

#### Scenario: 页面首屏保留核心操作
- **WHEN** 管理员在 `1440x900` 桌面视口打开企业认证中心总览或业务域页面
- **THEN** 页面 SHALL show the page purpose, primary status, primary safe action and core list or core operation within the first meaningful viewport unless a documented legacy table constraint prevents it
- **AND** 页面 SHALL NOT push the core list or core operation below large repeated KPI cards, explanation cards or generic workbench panels

#### Scenario: 控制台视觉专业但不营销化
- **WHEN** 管理员在组织账号、应用接入、身份源、权限角色、审计运维或 LLM AI/Gateway 页面之间切换
- **THEN** page headers, spacing, typography, status tags, toolbar controls and object entry affordances SHALL remain visually consistent
- **AND** each business domain SHALL retain domain-specific structure, metrics and actions
- **AND** pages SHALL NOT rely on hero sections, decorative gradients, bokeh/orbs, large illustration blocks or card-in-card layouts to create product feel

#### Scenario: 移动端保持可读密度
- **WHEN** 管理员在 `390x844` 或 equivalent mobile viewport 打开企业认证中心页面
- **THEN** text, buttons, status tags and cards SHALL remain readable without page-level horizontal overflow
- **AND** page header, status summary and core list or operation SHALL use compact responsive spacing rather than excessive blank space

### Requirement: 专业表格工具面和对象上下文
Admin 企业认证中心 pages SHALL make common administrator workflows feel like enterprise operations by using professional table toolbars, status language and object context instead of standalone explanatory centers.

#### Scenario: 列表页提供专业工具栏
- **WHEN** 管理员查看应用、身份源、组织、用户、角色、权限、审计记录、会话、令牌、验证记录或 LLM AI/Gateway lists
- **THEN** the page SHALL provide a coherent toolbar for search, filtering, status scanning, safe next actions and object detail access as applicable
- **AND** toolbar controls SHALL use administrator-facing labels and SHALL NOT expose raw provider fields, implementation-only names or temporary debugging copy as primary UI language

#### Scenario: 对象详情承载关系和证据
- **WHEN** 管理员 needs to understand an application, provider, user, role, permission, audit item, token, verification, agent or Gateway mapping
- **THEN** relationship, evidence, timeline, risk and next-action information SHALL be available from object details, drawers, row actions or object-scoped pages
- **AND** the list page SHALL remain optimized for scanning, comparison, filtering, pagination and batch-safe operations

#### Scenario: 状态表达支持决策
- **WHEN** 页面展示 risk, health, completeness, cannot-infer, current-scope or evidence status
- **THEN** the status copy SHALL explain what the administrator can safely do next
- **AND** status copy SHALL distinguish current scope, current filter and backend source-of-truth facts without presenting implementation trace wording as the main product message

### Requirement: 产品语言和 i18n 收敛
Admin 企业认证中心 Shell SHALL use consistent product language for enterprise authentication and identity governance, and SHALL remove visible implementation traces from primary navigation, page headers and core actions.

#### Scenario: 中文界面使用业务语言
- **WHEN** 管理员使用中文界面
- **THEN** primary navigation, page headers, toolbar actions and object detail labels SHALL use business terms such as 身份源、应用接入、授权关系、审计证据、运行健康、风险处理 and LLM AI/Gateway where appropriate
- **AND** UI SHALL NOT expose hardcoded English fallback, raw internal route names, temporary debug labels or implementation-only phrases as primary product copy

#### Scenario: 英文界面同步
- **WHEN** 管理员切换到英文界面
- **THEN** the same navigation, page header, toolbar, status and object detail copy SHALL be available through locale resources
- **AND** adding or changing user-visible Chinese copy SHALL require matching English copy unless the report documents a deliberate product term exception

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
