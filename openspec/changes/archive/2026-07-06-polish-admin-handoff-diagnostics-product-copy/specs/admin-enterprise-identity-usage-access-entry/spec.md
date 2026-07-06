## MODIFIED Requirements

### Requirement: 用量接入二级入口

`用量接入` 页面 SHALL 作为唯一的 `Insight Admin Provider` copy-safe metadata 交接入口，承接 Admin 身份、组织、resolver、projection/trust 和 owner evidence readiness 摘要，并生成 Insight Profile 可消费的 Admin handoff package。

#### Scenario: 缺失状态以 Insight 绑定下一步表达

- **WHEN** Admin handoff 状态为 partial、missing 或 blocked，且阻断原因包含 resolver 或 projection credential reference 缺失
- **THEN** 页面默认层 SHALL 展示一个人可读阻断摘要，说明 copy-safe metadata package 可生成但 Profile 凭据闭环仍未完成
- **AND** 页面默认层 SHALL 将主下一步指向 `导入 Insight Profile 后通过 manual/secretRef binding 绑定凭据`
- **AND** 页面默认层 SHALL 以产品化文案说明 `Admin 交接包只包含元数据，不传递真实凭据`
- **AND** 页面默认层 SHALL NOT 展示 `Admin secure handoff 不在 P0`、`部署 Secret`、`外部 secret system`、`.env`、K8s Secret、Vault 或 KMS 作为用户主提示或主操作路径
- **AND** 页面默认层 SHALL NOT 将 `在 Admin 部署配置或外部 secret system 维护凭据引用` 表达为修复建议
- **AND** 页面 SHALL NOT 要求操作者先理解 `admin_outbound_resolver`、`admin_gateway_projection_producer` 或同类内部 alias 才能判断下一步

### Requirement: 用量接入页面聚焦服务凭据治理

`用量接入` 页面 SHALL 以 KISS 方式展示 `Insight Admin Provider` 交接状态和 copy-safe package 动作；旧服务凭据治理配置、诊断、修正或 provider 配置中心 UI SHALL NOT 作为默认产品 surface 保留。

#### Scenario: partial 默认态只保留一个主阻断提示

- **WHEN** `/application-usage-access` 的 Admin handoff 状态为 partial、missing 或 blocked，且 copy-safe metadata package 仍可生成
- **THEN** 页面默认层 SHALL 保留整体状态摘要、下一步 action、一个 warning 主提示和 `生成 Admin 交接包` 主 CTA
- **AND** copy-safe 交接操作区 SHALL NOT 再渲染灰底重复说明、第二个黄色告警或绿色 `材料已齐`
- **AND** 页面默认层 SHALL NOT 展示 `P0`、`secure handoff 不在 P0`、`copy-safe metadata` 或同类内部路线/实现语言
- **AND** 页面 SHALL NOT 表达 Admin secure handoff 已完成、真实凭据绑定已完成，或需要在 Admin 内配置 API/Gateway 用量 provider

#### Scenario: 诊断展开层隐藏环境维护噪声

- **WHEN** 管理员展开 `诊断摘要`
- **THEN** 诊断详情 SHALL 保留阻断项、可用能力、wrapper route 和可操作 owner evidence
- **AND** 诊断详情 SHALL NOT 展示 `环境维护项`
- **AND** 诊断详情 SHALL NOT 将 `部署配置`、`外部 secret system`、`.env`、K8s Secret、Vault 或 KMS 表达为用户动作
- **AND** 诊断详情 SHALL NOT 恢复旧 `服务凭据治理` 或 API/Gateway 用量 provider 配置中心式入口
