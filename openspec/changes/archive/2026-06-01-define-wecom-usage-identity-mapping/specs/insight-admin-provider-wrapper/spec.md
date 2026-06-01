## ADDED Requirements

### Requirement: provider 必须支持企业微信稳定身份解析用量用户
Insight admin provider MUST 在现有手工 `aicodexApiUserId` 映射之外，支持通过企业微信稳定身份批量解析 aicodex-api 用量用户 ID。该能力 MUST 保持 admin provider 作为 scope 授权边界，MUST NOT 要求 Insight 直接参与身份映射。

#### Scenario: current-user 返回企业微信解析后的用量身份
- **WHEN** 当前 admin 用户没有手工用量 ID，但存在企业微信稳定身份且 api resolver 返回唯一用量用户
- **THEN** current-user provider MUST 返回 `usageIdentity.apiUserId`
- **THEN** current-user provider MUST 返回 `usageIdentity.mappingStatus=OK`
- **THEN** current-user provider MUST 记录映射来源为企业微信 resolver
- **THEN** current-user provider MUST 优先使用企业微信组织同步的 `displayName` 作为返回给 Insight 的 `displayName`

#### Scenario: scope 返回企业微信解析后的部门用量用户
- **WHEN** scope provider 计算 `DEPARTMENT_TREE` 且部门成员存在企业微信稳定身份
- **THEN** scope provider MUST 通过 api resolver 解析成员用量用户 ID
- **THEN** scope provider MUST 返回 `departments[].apiUserIds`
- **THEN** 顶层 `apiUserIds` MUST 是所有已授权部门成员 `apiUserIds` 的去重并集

#### Scenario: 部门或全公司 scope 跳过缺失成员
- **WHEN** `DEPARTMENT_TREE`、`ALL_COMPANY` 或 `ORGANIZATION` scope 中部分成员解析结果为 `MISSING`
- **THEN** provider MUST 从下发给 Insight 的 `apiUserIds` 中排除缺失成员
- **THEN** provider MUST 保留已成功解析成员的 `apiUserIds`
- **THEN** provider MUST NOT 因单个缺失成员拒绝整个部门或全公司 scope

#### Scenario: 精确 scope 缺失映射不降级
- **WHEN** `SELF` 或 `CUSTOM_USERS` scope 的必要用户解析结果为 `MISSING`
- **THEN** provider MUST 返回 `AUTHORIZATION_FAILED`
- **THEN** provider MUST 返回可诊断的 `mappingStatus`
- **THEN** provider MUST NOT 将该场景返回为 `scopeType=EMPTY`

#### Scenario: 企业微信解析异常不降级为空 scope
- **WHEN** 企业微信稳定身份解析因歧义、非法或 resolver 不可用而无法完成必要用户映射
- **THEN** provider MUST 返回 `AUTHORIZATION_FAILED` 或 `PROVIDER_UNAVAILABLE`
- **THEN** provider MUST 返回可诊断的 `mappingStatus`
- **THEN** provider MUST NOT 将该场景返回为 `scopeType=EMPTY`
