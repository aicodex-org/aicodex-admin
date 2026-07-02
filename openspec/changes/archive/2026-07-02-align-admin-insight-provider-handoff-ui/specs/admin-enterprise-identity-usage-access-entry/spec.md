## MODIFIED Requirements

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
