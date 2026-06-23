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
`用量接入` 页面 SHALL 承接原 `应用接入中心` 中的服务凭据治理详细能力，至少覆盖 `Insight provider trust`、`Usage identity resolver`、`Gateway organization projection` 和 `Keep in env/config` 四类治理项的状态、治理配置、保存配置、诊断/预检、交接包预览、owner 边界和下一步入口。

#### Scenario: 页面展示四类治理项
- **WHEN** 管理员打开 `/application-usage-access` 且服务凭据治理状态或配置可用
- **THEN** 页面 SHALL 展示 `Insight provider trust`、`Usage identity resolver`、`Gateway organization projection` 和 `Keep in env/config` 四类治理项
- **AND** 每项 SHALL 展示脱敏状态、owner hint、reference status、caller policy、source class 或等价治理摘要
- **AND** 页面 SHALL 展示 `治理配置`、`保存配置`、`诊断/预检` 和 `生成/查看交接包` 动作
- **AND** 每项 SHALL 提供直接相关的下一步入口或核对动作

#### Scenario: 页面不扩成泛配置中心
- **WHEN** 管理员查看 `用量接入`
- **THEN** 页面 SHALL NOT 展示与用量链路无直接关系的 OAuth client、普通 Application 编辑、资源、证书、密钥、Webhook、Gateway API 映射或 Insight 内部配置表单作为主内容
- **AND** 这些通用入口 MAY 作为低噪上下文链接指向既有页面

### Requirement: 用量接入 copy-safe 安全边界
`用量接入` 页面 SHALL 只处理 Admin-owned 身份、组织、resolver、projection 和服务间凭据入口治理配置，不得承接 API/Gateway 或 Insight 自己的 truth，也不得执行真实下游动作。

#### Scenario: 页面保持运行态只读
- **WHEN** 页面渲染状态、诊断摘要、交接包摘要或下一步入口
- **THEN** Admin SHALL NOT 触发 resolver outbound call、Gateway publish 或 refresh、API/Gateway/Insight 写入、OAuth/OIDC callback、provider login、组织同步、DB fixture 写入或 runtime secret resolution
- **AND** 页面保存的仅为 Admin-owned 服务凭据治理配置别名、状态和策略摘要
- **AND** 页面 SHALL 明确显示 copy-safe 边界

#### Scenario: 页面保持脱敏
- **WHEN** 页面展示服务凭据治理状态、配置、诊断或交接包信息
- **THEN** UI SHALL render only sanitized group labels, stable aliases, owner hints, source class, credential reference summary, caller policy presence or alias, bounded runtime policy, keep-in-env, cannot-infer and next-action fields
- **AND** it MUST NOT render token values, Authorization headers, Cookies, DSNs, client secrets, private keys, complete private URLs, raw provider responses, raw downstream responses, raw ids, real accounts or complete organization trees

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
