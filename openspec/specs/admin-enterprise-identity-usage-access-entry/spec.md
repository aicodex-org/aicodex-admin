# admin-enterprise-identity-usage-access-entry Specification

## Purpose

定义 Admin 企业身份控制台中 `应用接入 / 用量接入` 二级入口的产品边界、copy-safe 交接安全约束、基础页面状态和主题一致性要求。
## Requirements
### Requirement: 用量接入二级入口

`用量接入` 页面 SHALL 作为唯一的 `Insight Admin Provider` copy-safe metadata 交接入口，承接 Admin 身份、组织、resolver、projection/trust 和 owner evidence readiness 摘要，并生成 Insight Profile 可消费的 Admin handoff package。

#### Scenario: 缺失状态以 Insight 绑定下一步表达

- **WHEN** Admin handoff 状态为 partial、missing 或 blocked，且阻断原因包含 resolver 或 projection credential reference 缺失
- **THEN** 页面默认层 SHALL 展示一个人可读阻断摘要，说明 copy-safe metadata package 可生成但 Profile 凭据闭环仍未完成
- **AND** 页面默认层 SHALL 将主下一步指向 `导入 Insight Profile 后通过 manual/secretRef binding 绑定凭据`
- **AND** 页面默认层 SHALL NOT 展示 `部署 Secret`、`外部 secret system`、`.env`、K8s Secret、Vault 或 KMS 作为用户主提示或主操作路径
- **AND** 页面默认层 SHALL NOT 将 `在 Admin 部署配置或外部 secret system 维护凭据引用` 表达为修复建议
- **AND** 页面 SHALL NOT 要求操作者先理解 `admin_outbound_resolver`、`admin_gateway_projection_producer` 或同类内部 alias 才能判断下一步

### Requirement: 用量接入页面聚焦服务凭据治理

`用量接入` 页面 SHALL 以 KISS 方式展示 `Insight Admin Provider` 交接状态和 copy-safe package 动作；旧服务凭据治理配置、诊断、修正或 provider 配置中心 UI SHALL NOT 作为默认产品 surface 保留。

#### Scenario: partial 默认态只保留一个主阻断提示

- **WHEN** `/application-usage-access` 的 Admin handoff 状态为 partial、missing 或 blocked，且 copy-safe metadata package 仍可生成
- **THEN** 页面默认层 SHALL 保留整体状态摘要、下一步 action 和一条 warning 主提示，说明缺少 resolver 凭据引用或同类阻断
- **AND** copy-safe 交接操作区 SHALL 使用中性或 info 语义说明 `可生成元数据交接包，导入 Insight 后通过 manual/secretRef binding 绑定凭据`
- **AND** 页面 SHALL NOT 在 copy-safe 操作区再渲染第二个黄色告警
- **AND** P0 边界说明 SHALL 降级为低噪信息行、帮助说明或诊断摘要文案，不得成为默认视觉焦点
- **AND** 页面 SHALL NOT 表达 Admin secure handoff 已完成、真实凭据绑定已完成，或需要在 Admin 内配置 API/Gateway 用量 provider

### Requirement: 用量接入 copy-safe 安全边界

页面生成和展示 Admin 交接包时 SHALL 明确说明该交接包是 copy-safe Admin owner evidence，只用于 Insight Admin Provider 元数据交接和 manual/secretRef binding 指引，不包含可直接调用的运行态凭据。

#### Scenario: 交接包生成成功

- **WHEN** 管理员生成 Admin 交接包
- **THEN** UI SHALL 只渲染脱敏治理项名称、人可读状态、copy-safe 摘要、凭据引用存在性、调用策略存在性或别名、有界运行策略摘要、keep-in-env/cannot-infer 状态和 next action 字段
- **AND** UI SHALL 明确 Insight P0 使用 copy-safe handoff 加 manual/secretRef binding 绑定 Admin provider 凭据
- **AND** partial/generated 状态 SHALL 使用中性或 warning 语义说明 `已生成元数据包，仍需在 Insight 绑定凭据`
- **AND** UI SHALL NOT 将 Admin secure handoff 表达为默认动作

### Requirement: 用量接入覆盖基础页面状态

`用量接入` 页面 SHALL 覆盖加载、错误、无可用交接配置和窄屏状态，并保持管理员可继续前往既有应用接入、Provider、API 映射或审计入口。

#### Scenario: 加载错误和空态
- **WHEN** Insight Admin Provider 交接状态或交接配置请求加载中、失败、被拒绝或返回空治理项
- **THEN** 页面 SHALL 展示紧凑 loading、error、unavailable 或 empty state
- **AND** 页面 SHALL 保留进入 `应用接入中心`、Provider、API 映射或审计记录的低噪入口
- **AND** 页面 SHALL NOT 因局部错误阻断 Admin 壳层导航
- **AND** 页面 SHALL NOT 使用旧 `服务凭据治理配置` 或 `服务凭据治理状态` 作为用户可见错误、空态或 loading 文案

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

### Requirement: Admin copy-safe 交接包对齐 Insight Profile 草稿
Admin `用量接入 / Admin Provider` 页面生成的 copy-safe handoff package SHALL 暴露适合 Insight Profile 草稿导入的摘要，同时保留既有 owner evidence `groups[]` 摘要和 copy-safe 安全边界。

#### Scenario: 交接包包含 Profile 可解析摘要
- **WHEN** 管理员生成 Admin copy-safe 交接包
- **THEN** package SHALL 包含稳定顶层 metadata 字段 `schema`、`version`、`source`、`generatedAt`、`targetConsumerAlias` 和 `adminOwnerAlias`
- **AND** package SHALL 包含 Insight Profile 摘要，用于标识 package type `copy_safe_handoff`、target consumer alias、Admin owner alias、Admin provider component alias、wrapper capability readiness、credential reference guidance 和 owner evidence summary
- **AND** package SHALL 保留既有 `groups[]` copy-safe owner evidence，便于兼容排障

#### Scenario: 三条固定 wrapper 能力可被消费方识别
- **WHEN** package 描述 Insight Admin Provider wrapper capabilities
- **THEN** package SHALL 包含 `current-user`、`current-user/scope` 和 `current-user/organization-tree` 的 stable aliases
- **AND** 每条 wrapper capability SHALL 只暴露 copy-safe route alias/path、readiness、owner alias 和 next action
- **AND** wrapper capability SHALL NOT 暴露完整 Admin base URL、private URL、token、cookie、Authorization header 或 raw response payload

#### Scenario: partial/missing 状态传递可操作 nextAction
- **WHEN** resolver credential reference、Gateway organization projection 或其他 Admin owner evidence 处于 missing、blocked、keep-in-env 或 cannot-infer 状态
- **THEN** package SHALL 在适用时暴露 `credentialReferenceStatus`、`credentialReferenceKeySummary`、`resolverCredentialReference`、`boundedRuntimePolicy`、`stableAliases`、`blockedAliases`、`nextAction`、`cannotInferRuntimeTruth` 和 `keepInEnv` 字段
- **AND** 缺失的 resolver 或 projection credential evidence SHALL 包含 stable reason alias，以及适合 Insight manual/secretRef binding guidance 的人话 next action
- **AND** package SHALL NOT 要求操作员在 Admin 内配置 API/Gateway usage provider credentials

#### Scenario: 交接包保持脱敏
- **WHEN** Admin status/config/diagnostic inputs contain unsafe material
- **THEN** generated package SHALL 省略 token、secret、Authorization、Cookie、DSN、client secret、private key、完整 private URL、raw payload、raw id、真实账号和完整组织树
- **AND** Base URL material SHALL 只以 alias、route alias/path 或其他 copy-safe locator 表达
- **AND** Admin secure handoff SHALL NOT 在 P0 中被表达为可用或已完成

#### Scenario: 页面生成使用已保存 copy-safe 配置
- **WHEN** 页面状态和治理配置均已加载且不存在待补 Admin 部署配置
- **THEN** 点击 `生成 Admin 交接包` SHALL 使用 normalized status 和 sanitized copy-safe config 生成 package
- **AND** copied JSON SHALL 表达 copy-safe metadata 与 manual/secretRef binding guidance，而不是自动绑定凭据或 secure handoff grant
