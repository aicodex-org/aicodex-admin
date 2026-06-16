## ADDED Requirements

### Requirement: 平台组织必须维护独立的 api organization 映射对象
系统 SHALL 为每个需要接入 `aicodex-api` 的 PlatformOrganization 维护独立的 `PlatformApiOrganizationMapping` 或等价一等映射对象。该映射对象 MUST 独立于外部租户标识、OIDC client 归属和自由属性，并具备稳定键、唯一性、状态和审计信息。

#### Scenario: confirmed organization 映射可作为下游权威来源
- **WHEN** 某个 PlatformOrganization 已完成到 `aicodex-api` 组织 UUID 的映射
- **THEN** 系统 SHALL 在独立映射对象中保存 confirmed `apiOrganizationId`
- **AND** 该映射 SHALL 成为 OIDC、后续 gateway projection 和相关 provider 共同消费的权威来源

#### Scenario: organization 映射对象包含最低治理字段
- **WHEN** 系统创建或更新 PlatformOrganization 到 `aicodex-api` 组织 UUID 的映射
- **THEN** 映射对象 SHALL 至少包含 `organizationId`、`apiOrganizationId`、`mappingStatus`、`mappingSource`、`lineage`、`createdAt` 和 `updatedAt`
- **AND** 系统 SHALL 对 `organizationId` 和 `apiOrganizationId` 建立唯一性约束，防止一对多或多对一映射静默生效

#### Scenario: organization 映射血缘由系统维护
- **WHEN** 后台页面或管理 API 创建、更新 organization 映射且 `lineage` 为空或空对象
- **THEN** 系统 SHALL 自动写入脱敏的系统维护血缘
- **AND** 系统 SHALL NOT 要求运维在页面主流程手写 `lineage` JSON
- **AND** 系统 SHALL NOT 覆盖已有迁移血缘或非空诊断血缘

#### Scenario: 外部租户标识不得替代 api organization 映射
- **WHEN** PlatformOrganization 同时存在 `sourceTenantId`、OIDC application 归属信息或外部组织展示名
- **THEN** 系统 SHALL NOT 把这些值直接当作 `apiOrganizationId`
- **AND** 系统 SHALL NOT 允许 consumer 仅凭这些值推断 `aicodex-api` 业务组织

#### Scenario: 旧 organization 属性只能作为迁移输入
- **WHEN** 旧数据中存在 `aicodexApiOrganizationId`、`aicodex_api_organization_id`、`apiOrganizationId` 或 `api_organization_id`
- **THEN** 系统 MAY 在迁移阶段读取这些值生成候选映射对象
- **AND** 系统 SHALL NOT 让运行时 OIDC、provider 或 projection 长期直接读取这些旧属性作为权威来源

#### Scenario: organization 映射不可信时 fail closed
- **WHEN** PlatformOrganization 的 `apiOrganizationId` 映射处于缺失、`PENDING_REVIEW`、`DUPLICATE`、`CONFLICTED` 或 `DISABLED` 状态
- **THEN** 系统 SHALL 阻止该 organization 进入面向 `aicodex-api` 的成功授权或后续权威投影
- **AND** 系统 SHALL 记录可审计的失败原因

### Requirement: 平台用户必须维护独立的 api user 映射对象
系统 SHALL 为需要进入 `aicodex-api` 的 PlatformUser 维护独立的 `PlatformApiUserMapping` 或等价一等映射对象。该映射 MUST 以稳定 admin subject 为主体键之一，并具备唯一性、状态、lineage 和审计信息。

#### Scenario: confirmed user 映射可作为下游权威来源
- **WHEN** 某个 PlatformUser 已完成到 `aicodex-api` 用户 ID 的映射
- **THEN** 系统 SHALL 在独立映射对象中保存 confirmed `apiUserId`
- **AND** 下游 SHALL 通过稳定 admin subject 与该映射契约解析业务用户，而不是依赖展示字段

#### Scenario: user 映射对象包含最低治理字段
- **WHEN** 系统创建或更新 PlatformUser 到 `aicodex-api` 用户 ID 的映射
- **THEN** 映射对象 SHALL 至少包含 `organizationId`、`adminSubject`、`apiUserId`、`mappingStatus`、`mappingSource`、`lineage`、`createdAt` 和 `updatedAt`
- **AND** 系统 SHALL 对 `organizationId + adminSubject` 和 `organizationId + apiUserId` 建立唯一性约束，防止一对多或多对一映射静默生效

#### Scenario: user 映射血缘由系统维护
- **WHEN** 后台页面或管理 API 创建、更新 user 映射且 `lineage` 为空或空对象
- **THEN** 系统 SHALL 自动写入脱敏的系统维护血缘
- **AND** 系统 SHALL NOT 要求运维在页面主流程手写 `lineage` JSON
- **AND** 系统 SHALL NOT 覆盖已有迁移血缘或非空诊断血缘

#### Scenario: 弱标识不得用于推断 api user
- **WHEN** PlatformUser 仅存在邮箱、手机号、姓名、昵称、部门名、外部展示名或零散用户属性
- **THEN** 系统 SHALL NOT 使用这些字段自动推断 `apiUserId`
- **AND** 系统 SHALL NOT 把自由属性当作唯一长期权威映射来源

#### Scenario: 旧 user 属性只能作为迁移输入
- **WHEN** 旧数据中存在 `aicodexApiUserId`、`aicodex_api_user_id`、`apiUserId`、`api_user_id` 或 ExternalIdentity lineage 中的 `apiSubjectId`
- **THEN** 系统 MAY 在迁移阶段读取这些值生成候选映射对象
- **AND** 系统 SHALL NOT 让运行时 OIDC、provider 或 projection 长期直接读取这些旧属性作为权威来源

#### Scenario: user 映射不可信时 fail closed
- **WHEN** PlatformUser 的 `apiUserId` 映射缺失，或 mappingStatus 为 `PENDING_REVIEW`、`DUPLICATE`、`CONFLICTED` 或 `DISABLED`
- **THEN** 系统 SHALL 阻止该用户进入面向 `aicodex-api` 的成功授权或后续权威投影
- **AND** 系统 SHALL 记录可审计的失败原因

### Requirement: OIDC、provider 和 projection 必须消费同一映射口径
系统 SHALL 让 OIDC authorize / token / userinfo、后续 provider 和 gateway projection builder 消费同一套 organization/user 映射口径。系统 MUST NOT 让不同链路分别读取不同的映射来源。

#### Scenario: OIDC 和后续投影使用同一 organization/user 映射
- **WHEN** 同一个 PlatformOrganization 和 PlatformUser 同时参与 OIDC 登录、provider 查询或 gateway projection 构建
- **THEN** 这些链路 SHALL 使用同一份 confirmed `apiOrganizationId` 和 `apiUserId` 映射契约
- **AND** 系统 SHALL NOT 允许某条链路继续读取旧自由属性，而另一条链路读取新映射对象

#### Scenario: 映射契约变更时所有消费链路同时收敛
- **WHEN** `apiOrganizationId` 或 `apiUserId` 的映射状态、目标值或生效状态发生变化
- **THEN** 系统 SHALL 让 OIDC、provider 和后续 projection 看到同一变化结果
- **AND** 系统 SHALL NOT 为“兼容旧逻辑”保留长期双轨映射口径
