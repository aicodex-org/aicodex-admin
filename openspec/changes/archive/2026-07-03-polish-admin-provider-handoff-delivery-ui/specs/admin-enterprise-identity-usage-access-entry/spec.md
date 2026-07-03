## MODIFIED Requirements

### Requirement: 用量接入二级入口

`用量接入` 页面 SHALL 承接原 `应用接入中心` 中的服务凭据治理详细能力，至少覆盖 `Insight provider trust`、`Usage identity resolver`、`Gateway organization projection` 和 `Keep in env/config` 四类治理项的状态、治理配置、保存配置、诊断/预检、交接包预览、owner 边界和下一步入口。

#### Scenario: 入口表达为 Insight Admin Provider 交接

- **WHEN** 管理员打开 Admin 侧用量接入页面
- **THEN** 页面 SHALL 将主标题或主面板表达为 `Insight Admin Provider` 交接/状态
- **AND** 页面 SHALL 明确 Admin 只提供身份、组织、resolver、projection/trust、服务凭据治理和 wrapper 能力摘要
- **AND** 页面 SHALL 默认展示交接状态、下一步、目标消费方和包类型
- **AND** 页面 SHALL 将 P0 边界说明降级为一句低噪提示或帮助说明
- **AND** 页面 SHALL NOT 表达为 API/Gateway 用量 provider 配置中心

#### Scenario: 默认展示人话能力清单

- **WHEN** 页面展示 Admin 交接包生成入口
- **THEN** 页面 SHALL 默认展示 `身份接口`、`Scope 接口`、`组织树接口`、`用量身份解析` 和 `Gateway 组织投影` 的人可读状态
- **AND** wrapper route、technical alias、owner evidence raw alias 和缺失配置 key SHALL 只出现在 `技术细节` 折叠区或同等低噪详情中
- **AND** 摘要 SHALL NOT 展示 raw payload、raw id、真实账号或完整组织树

#### Scenario: 交接主动作表达生成意图

- **WHEN** 页面展示 copy-safe 交接操作
- **THEN** 页面 SHALL 将主按钮表达为 `生成 Admin 交接包`
- **AND** 页面 SHALL 在按钮附近说明当前可生成完整包、可生成部分包或需补齐后生成
- **AND** 页面 SHALL 继续说明 Insight P0 使用 copy-safe metadata 加 manual/secretRef binding
- **AND** 页面 SHALL NOT 将 Admin secure handoff 表达为默认动作

### Requirement: 用量接入页面聚焦服务凭据治理

`用量接入` 页面 SHALL 承接原 `应用接入中心` 中与 Admin 服务凭据治理直接相关的交接包能力，以 KISS 方式展示 Insight Admin Provider 交接状态、能力状态和 copy-safe 交接动作，并避免成为新的配置中心或诊断中心。

#### Scenario: 页面展示交接摘要和能力状态
- **WHEN** 管理员打开 `/application-usage-access` 且服务凭据治理状态或配置可用
- **THEN** 页面 SHALL 保留 `应用接入 / 用量接入 / Admin Provider` 面包屑语义，并将页面标题或主面板表达为 `Insight Admin Provider` 交接
- **AND** 页头 SHALL NOT 展示副标题说明文案，避免首屏重复解释 owner 边界
- **AND** 页头 SHALL NOT 将 API/Gateway 映射作为主操作入口，避免把 Admin 页面误导成 Gateway truth 配置中心
- **AND** 页头 SHALL NOT 重复展示可由左侧导航到达的横向快捷入口，避免分散交接包检查的主任务注意力
- **AND** 首屏 SHALL 优先展示交接状态、一个明确下一步动作、目标消费方、包类型和人可读交接能力清单
- **AND** 当存在 Admin 部署配置缺口时，主工作区 SHALL 提示需补齐 Admin env/config 后生成，不在默认层铺开技术 key
- **AND** 当不存在 Admin 部署配置缺口时，主工作区 SHALL 展示 copy-safe 交接操作，并提供 `生成 Admin 交接包` 动作
- **AND** 交接包生成后 SHALL 提供明确的 copy-safe JSON 复制动作，作为 Insight 获取 Admin provider 辅助交接材料的默认方式
- **AND** 页面 SHALL NOT 在 UI 内保存 secret、凭据引用、调用策略或运行策略修正
- **AND** 页面 SHALL NOT 展示 `高级修正` 折叠区，且 SHALL NOT 暴露与读取当前值语义重复的恢复回读入口
- **AND** 页面 SHALL NOT 展示 `Dry-run/Readiness`、`Doctor`、诊断详情、排障详情、保存修正、读取当前值或二级机器字段
- **AND** reason code、stable alias、handoff schema、metadata、doctor detail、evidence payload、raw payload、raw id、真实账号和完整组织树 SHALL NOT 在 UI 中展示
- **AND** copy-safe wrapper route、owner alias、source class 和缺失部署 key MAY 只在 `技术细节` 折叠区或同等低噪详情中展示

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

#### Scenario: 可用状态默认呈现人话能力

- **WHEN** Admin owner evidence 不存在待补部署配置
- **THEN** UI SHALL 默认展示身份接口、Scope 接口、组织树接口、用量身份解析和 Gateway 组织投影的人可读能力状态
- **AND** owner alias、wrapper route、source class、缺失部署 key 和 owner evidence 技术细节 SHALL 只在 `技术细节` 折叠区或同等低噪详情中展示
- **AND** UI SHALL NOT 将 copy-safe 技术细节隐藏在交接包生成动作之后
