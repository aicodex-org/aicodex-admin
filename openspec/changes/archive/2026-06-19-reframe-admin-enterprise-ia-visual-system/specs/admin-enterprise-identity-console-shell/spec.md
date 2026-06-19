## ADDED Requirements

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
