# admin-enterprise-identity-usage-access-entry Specification

## Purpose

定义 Admin 企业身份控制台中 `应用接入 / 用量接入` 二级入口的产品边界、copy-safe 交接安全约束、基础页面状态和主题一致性要求。
## Requirements
### Requirement: 用量接入二级入口

`用量接入` 页面 SHALL 承接原 `应用接入中心` 中的服务凭据治理详细能力，至少覆盖 `Insight provider trust`、`Usage identity resolver`、`Gateway organization projection` 和 `Keep in env/config` 四类治理项的状态、治理配置、保存配置、诊断/预检、交接包预览、owner 边界和下一步入口。

#### Scenario: 入口表达为 Insight Admin Provider 交接

- **WHEN** 管理员打开 Admin 侧用量接入页面
- **THEN** 页面 SHALL 将主标题或主面板表达为 `Insight Admin Provider` 交接/状态
- **AND** 页面 SHALL 明确 Admin 只提供身份、组织、resolver、projection/trust、服务凭据治理和 wrapper 能力摘要
- **AND** 页面 SHALL 使用状态边界、wrapper 能力、owner evidence 摘要、copy-safe 交接操作四块固定交接布局
- **AND** 页面 SHALL NOT 表达为 API/Gateway 用量 provider 配置中心

#### Scenario: 默认展示固定 wrapper 能力

- **WHEN** 页面展示 Admin 交接包生成入口
- **THEN** 页面 SHALL 默认展示 `/api/admin-provider/insight/v1/current-user`、`/current-user/scope`、`/current-user/organization-tree` 三条 wrapper 能力摘要
- **AND** 摘要 SHALL NOT 展示 raw payload、raw id、真实账号或完整组织树

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

页面生成和展示 Admin 交接包时 SHALL 明确说明该交接包是 copy-safe Admin owner evidence，只用于 Insight Admin Provider 元数据交接和 manual/secretRef binding 指引，不包含可直接调用的运行态凭据。

#### Scenario: 交接包生成成功

- **WHEN** 管理员生成 Admin 交接包
- **THEN** UI SHALL 只渲染脱敏治理项名称、人可读状态、copy-safe 摘要、凭据引用存在性、调用策略存在性或别名、有界运行策略摘要、keep-in-env/cannot-infer 状态和 next action 字段
- **AND** UI SHALL 明确 Insight P0 使用 copy-safe handoff 加 manual/secretRef binding 绑定 Admin provider 凭据
- **AND** UI SHALL NOT 将 Admin secure handoff 表达为默认动作

#### Scenario: 异常态指向 Admin owner 下一步

- **WHEN** Admin owner evidence 处于 blocked、missing 或 cannot infer runtime truth 状态
- **THEN** UI SHALL 指引 operator 处理 Admin owner 修复、部署配置，或交由 Insight 侧验证 manual/secretRef binding
- **AND** UI SHALL NOT 要求 operator 在 Admin 内配置 API/Gateway 用量 provider 凭据

#### Scenario: 可用状态仍展示 owner evidence

- **WHEN** Admin owner evidence 不存在待补部署配置
- **THEN** UI SHALL 仍默认展示 Insight provider trust、usage identity resolver、Gateway organization projection 和 keep-in-env/config 的 owner evidence 行
- **AND** 每行 SHALL 只展示 owner alias、readiness/status、source 或 credential class 以及 next action
- **AND** UI SHALL NOT 将 evidence 行隐藏在交接包操作之后

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
