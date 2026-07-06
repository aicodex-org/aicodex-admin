## MODIFIED Requirements

### Requirement: 用量接入二级入口

`用量接入` 页面 SHALL 作为唯一的 `Insight Admin Provider` copy-safe metadata 交接入口，承接 Admin 身份、组织、resolver、projection/trust 和 owner evidence readiness 摘要，并生成 Insight Profile 可消费的 Admin handoff package。

#### Scenario: 缺失状态以 Insight 绑定下一步表达

- **WHEN** Admin handoff 状态为 partial、missing 或 blocked，且阻断原因包含 resolver 或 projection credential reference 缺失
- **THEN** 页面默认层 SHALL 展示一个人可读阻断摘要，说明可生成的是元数据交接包，真实凭据不会被打包
- **AND** 页面默认层 SHALL 将主下一步指向 `导入 Insight Profile 后，绑定 manual/secretRef 凭据解析器`
- **AND** 页面默认层 SHALL 以产品化文案说明真实凭据需在 Insight Profile 中后续绑定补齐
- **AND** 页面默认层 SHALL NOT 展示 `Admin secure handoff 不在 P0`、`部署 Secret`、`外部 secret system`、`.env`、K8s Secret、Vault 或 KMS 作为用户主提示或主操作路径
- **AND** 页面默认层 SHALL NOT 将 `在 Admin 部署配置或外部 secret system 维护凭据引用` 表达为修复建议
- **AND** 页面 SHALL NOT 要求操作者先理解 `admin_outbound_resolver`、`admin_gateway_projection_producer` 或同类内部 alias 才能判断下一步

### Requirement: 用量接入页面聚焦服务凭据治理

`用量接入` 页面 SHALL 以 KISS 方式展示 `Insight Admin Provider` 交接状态和 copy-safe package 动作；旧服务凭据治理配置、诊断、修正或 provider 配置中心 UI SHALL NOT 作为默认产品 surface 保留。

#### Scenario: partial 默认态只保留一个主阻断提示

- **WHEN** `/application-usage-access` 的 Admin handoff 状态为 partial、missing 或 blocked，且 copy-safe metadata package 仍可生成
- **THEN** 页面默认层 SHALL 保留整体状态摘要、下一步 action、一个 warning 主提示和 `生成元数据交接包` 主 CTA
- **AND** warning 主提示 SHALL 说明 `可生成元数据交接包；真实凭据需在 Insight Profile 中绑定 manual/secretRef 凭据解析器后补齐`
- **AND** copy-safe 交接操作区 SHALL NOT 再渲染灰底重复说明、第二个黄色告警或绿色 `材料已齐`
- **AND** 页面默认层 SHALL NOT 展示 `P0`、`secure handoff 不在 P0`、`copy-safe metadata` 或同类内部路线/实现语言
- **AND** 页面 SHALL NOT 表达 Admin secure handoff 已完成、真实凭据绑定已完成，或需要在 Admin 内配置 API/Gateway 用量 provider

#### Scenario: partial 默认态展示首个阻断摘要

- **WHEN** `/application-usage-access` 存在阻断项
- **THEN** 页面默认层 SHALL 在诊断详情收起时展示首个阻断项名称、原因和建议动作
- **AND** 页面默认层 SHALL 保持 wrapper route、owner alias、raw evidence 和完整阻断列表在诊断详情中
- **AND** 页面默认层 SHALL NOT 要求管理员展开诊断详情后才能知道第一项阻断和修复方向

### Requirement: 用量接入 copy-safe 安全边界

页面生成和展示 Admin 交接包时 SHALL 明确说明该交接包是 copy-safe Admin owner evidence，只用于 Insight Admin Provider 元数据交接和 manual/secretRef binding 指引，不包含可直接调用的运行态凭据。

#### Scenario: 元数据交接包生成成功

- **WHEN** 管理员生成元数据交接包
- **THEN** UI SHALL 只渲染脱敏治理项名称、人可读状态、copy-safe 摘要、凭据引用存在性、调用策略存在性或别名、有界运行策略摘要、keep-in-env/cannot-infer 状态和 next action 字段
- **AND** UI SHALL 明确真实凭据需导入 Insight Profile 后通过 `manual/secretRef` 凭据解析器绑定
- **AND** partial/generated 状态 SHALL 使用中性或 warning 语义说明 `已生成元数据交接包，仍需在 Insight Profile 绑定真实凭据`
- **AND** UI SHALL NOT 将 Admin secure handoff 表达为默认动作
