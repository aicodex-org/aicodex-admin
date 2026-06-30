# admin-enterprise-identity-usage-access-entry Specification

## Purpose
TBD - created by archiving change add-admin-usage-access-submenu. Update Purpose after archive.
## Requirements
### Requirement: 用量接入二级入口
Admin 身份控制台 SHALL 在 `应用接入` 分组下提供 `用量接入` 二级入口，使管理员能够直接进入用量链路治理页面，而不需要在 `/applications` 通用应用接入中心中寻找服务凭据治理内容。

#### Scenario: 管理员打开用量接入页面
- **WHEN** 已登录 local admin 通过侧栏、移动抽屉、组织导航配置树或直接 URL 访问 `/application-usage-access`
- **THEN** 系统 SHALL 展示 `用量接入` 页面
- **AND** 页面 SHALL 位于 `应用接入` 导航分组下
- **AND** `/applications` SHALL 继续展示为 `应用接入中心` 并保持可达

#### Scenario: 二级入口保持权限过滤兼容
- **WHEN** 组织配置了 `navItems` 或 `userNavItems`
- **THEN** `用量接入` SHALL 使用稳定 route key `/application-usage-access` 参与既有权限过滤
- **AND** 不得因为新增二级入口暴露未授权菜单

### Requirement: 用量接入页面聚焦服务凭据治理
`用量接入` 页面 SHALL 承接原 `应用接入中心` 中与 Admin 服务凭据治理直接相关的交接包能力，以 KISS 方式展示 `待补配置` 或 `Admin 交接包`，并避免成为新的配置中心或诊断中心。

#### Scenario: 页面展示四类治理项
- **WHEN** 管理员打开 `/application-usage-access` 且服务凭据治理状态或配置可用
- **THEN** 页面 SHALL 保留 `应用接入 / 用量接入` 面包屑和 `用量接入` 标题
- **AND** 页头 SHALL NOT 展示副标题说明文案，避免首屏重复解释 owner 边界
- **AND** 页头 SHALL NOT 将 API/Gateway 映射作为主操作入口，避免把 Admin 页面误导成 Gateway truth 配置中心
- **AND** 页头 SHALL NOT 重复展示可由左侧导航到达的横向快捷入口，避免分散交接包检查的主任务注意力
- **AND** 首屏 SHALL 优先展示服务凭据治理总状态、一个明确下一步动作和主工作区
- **AND** 当存在 Admin 部署配置缺口时，主工作区 SHALL 展示 `待补配置`，列出需要补到 Admin env/config 或部署私有配置的 key，并提示补齐后重启 Admin 再刷新本页
- **AND** 当不存在 Admin 部署配置缺口时，主工作区 SHALL 展示 `Admin 交接包`，并提供 `生成 Admin 交接包` 动作
- **AND** 交接包生成后 SHALL 提供明确的 copy-safe JSON 复制动作，作为 Insight 获取 Admin provider 辅助交接材料的默认方式
- **AND** 页面 SHALL NOT 在 UI 内保存 secret、凭据引用、调用策略或运行策略修正
- **AND** 页面 SHALL NOT 展示 `高级修正` 折叠区，且 SHALL NOT 暴露与读取当前值语义重复的恢复回读入口
- **AND** 页面 SHALL NOT 展示 `Dry-run/Readiness`、`Doctor`、诊断详情、排障详情、保存修正、读取当前值或二级机器字段
- **AND** reason code、stable alias、owner/provenance、handoff schema、metadata、doctor detail 和 evidence payload SHALL NOT 在 UI 中展示；需要排障时以开发日志或后续专门诊断入口处理

### Requirement: 用量接入 copy-safe 安全边界
`用量接入` 页面 SHALL 只处理 Admin-owned 身份、组织、resolver、projection 和服务间凭据入口治理配置，不得承接 API/Gateway 或 Insight 自己的 truth，也不得执行真实下游动作。

#### Scenario: 页面保持脱敏
- **WHEN** 页面展示服务凭据治理状态、配置、诊断或交接包信息
- **THEN** UI SHALL render only sanitized group labels, human-readable statuses, copy-safe summaries, credential reference presence, caller policy presence or alias, bounded runtime policy summary, keep-in-env/cannot-infer status and next-action fields
- **AND** 首屏 MUST NOT render reason code, raw policy or boundary tags, owner/provenance details, doctor metadata, evidence payload, trace/debug fields, raw secret references, complete private URLs, token values, Authorization headers, Cookies, DSNs, client secrets, private keys, raw provider responses, raw downstream responses, raw ids, real accounts or complete organization trees
- **AND** UI SHALL NOT render advanced diagnostic aliases or metadata; the first version SHALL keep only copy-safe human-readable status, next action, deployment-config gap hints, and Admin handoff package generation/copy actions
- **AND** generated Admin handoff package SHALL NOT include API/Gateway usage facts or API/Gateway provider runtime truth
- **AND** groups whose status is `not_applicable` SHALL NOT be converted to runtime `ready`; UI and package summaries SHALL preserve `cannot_infer` semantics when Admin cannot infer downstream runtime truth

### Requirement: 用量接入覆盖基础页面状态
`用量接入` 页面 SHALL 覆盖加载、错误、无可用治理项和窄屏状态，并保持管理员可继续前往既有应用接入、Provider、API 映射或审计入口。

#### Scenario: 加载错误和空态
- **WHEN** 服务凭据治理请求加载中、失败、被拒绝或返回空治理项
- **THEN** 页面 SHALL 展示紧凑 loading、error、unavailable 或 empty state
- **AND** 页面 SHALL 保留进入 `应用接入中心`、Provider、API 映射或审计记录的低噪入口
- **AND** 页面 SHALL NOT 因局部错误阻断 Admin 壳层导航

#### Scenario: 桌面和移动端展示
- **WHEN** 管理员在 `1440x900` 或 `390x844` 视口访问 `/application-usage-access`
- **THEN** 文本、状态标签、按钮和治理项摘要 SHALL 不重叠、不撑破页面
- **AND** 页面级 `documentElement.scrollWidth` SHALL NOT 大于 `documentElement.clientWidth + 1`
- **AND** 核心治理项和错误/空态信息 SHALL 在可扫描位置可达

### Requirement: 用量接入治理块暗黑主题一致性
`用量接入` 页面中的服务凭据治理摘要、配置块、诊断块和辅助边界信息 SHALL 在明亮与暗黑模式下复用共享主题 token 呈现，避免暗黑模式下出现白底治理块、错误边框或不可读的弱信息。

#### Scenario: 暗黑模式下治理摘要与配置块保持统一层级
- **WHEN** 管理员在暗黑模式下访问 `/application-usage-access`
- **THEN** 服务凭据治理摘要、配置块、状态条和辅助说明区域 SHALL 使用暗黑主题 surface、border 和 text token
- **AND** 页面 SHALL NOT 在暗黑背景中留下白底治理块、浅色摘要条或突兀的亮色边界

#### Scenario: 桌面与窄屏治理块都沿用同一主题语义
- **WHEN** 页面在桌面或窄屏下展示治理块、加载态、错误态或可用态
- **THEN** 这些区域 SHALL 继续沿用同一套主题 token 表达层级和状态
- **AND** 实现 SHALL NOT 因布局分支或顶部分隔线单独保留固定浅色样式
