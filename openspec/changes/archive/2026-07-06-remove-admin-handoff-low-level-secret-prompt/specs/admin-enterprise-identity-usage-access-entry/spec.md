## MODIFIED Requirements

### Requirement: 用量接入二级入口

`用量接入` 页面 SHALL 作为唯一的 `Insight Admin Provider` copy-safe metadata 交接入口，承接 Admin 身份、组织、resolver、projection/trust 和 owner evidence readiness 摘要，并生成 Insight Profile 可消费的 Admin handoff package。

#### Scenario: 缺失状态以 Insight 绑定下一步表达

- **WHEN** Admin handoff 状态为 partial、missing 或 blocked，且阻断原因包含 resolver 或 projection credential reference 缺失
- **THEN** 页面默认层 SHALL 展示一个人可读阻断摘要，说明 copy-safe metadata package 可生成但 Profile 凭据闭环仍未完成
- **AND** 页面默认层 SHALL 将主下一步指向 `导入 Insight Profile 后通过 manual/secretRef binding 绑定凭据`
- **AND** 页面默认层 SHALL NOT 展示 `部署 Secret`、`外部 secret system`、`.env`、K8s Secret、Vault 或 KMS 作为用户主提示或主操作路径
- **AND** 页面默认层 SHALL NOT 将 `在 Admin 部署配置或外部 secret system 维护凭据引用` 表达为修复建议
- **AND** 页面 SHALL NOT 要求操作者先理解 `admin_outbound_resolver`、`admin_gateway_projection_producer` 或同类内部 alias 才能判断下一步
