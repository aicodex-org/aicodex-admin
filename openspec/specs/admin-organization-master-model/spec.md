# admin-organization-master-model Specification

## Purpose
TBD - created by archiving change define-admin-organization-master-model. Update Purpose after archive.
## Requirements
### Requirement: 平台组织主数据模型
系统 SHALL 在 `aicodex-admin` 内定义 source-neutral 的平台组织主数据模型，作为用户、部门、成员关系、岗位、角色、生命周期、管理范围和同步批次的权威来源。

#### Scenario: 存储平台组织主对象
- **WHEN** 外部组织来源或后台管理流程创建或更新组织数据
- **THEN** 系统 SHALL 将结果归一化为 PlatformOrganization、PlatformUser、PlatformDepartment、Membership、Role、Position、LifecycleEvent 和 OrgSyncBatch 中的权威记录或兼容映射
- **AND** 系统 SHALL NOT 将 WeCom、DingTalk、Feishu、LDAP、HR、Beisen 或客户自建系统专用表直接作为跨服务权威主模型

#### Scenario: 第一阶段角色岗位使用兼容映射
- **WHEN** 报表 scope provider 或后续组织投影需要角色或岗位语义
- **THEN** 系统 SHALL 提供 source-neutral Role/Position 契约或兼容映射
- **AND** 系统 MAY 在第一阶段复用现有 Casdoor 角色、用户组、用户标题或平台成员关系字段承载该语义
- **AND** 系统 SHALL NOT 要求本 change 同时建设完整平台岗位管理产品

#### Scenario: 保持平台组织 ID 与外部租户 ID 分离
- **WHEN** 外部来源提供 Corp ID、tenant key、domain、company code 或客户系统 tenant 标识
- **THEN** 系统 SHALL 将该值记录为来源连接元数据
- **AND** 系统 SHALL NOT 直接把该外部租户标识等同于平台 `organizationId`

### Requirement: SourceConnection
系统 SHALL 使用 SourceConnection 表达某个平台组织绑定的一个外部来源连接。

#### Scenario: 创建来源连接
- **WHEN** 管理员为平台组织配置企业微信、钉钉、飞书、LDAP、HR、北森或客户自建组织来源
- **THEN** 系统 SHALL 创建或复用稳定 `sourceConnectionId`
- **AND** 记录 `organizationId`、`sourceType`、`sourceTenantId`、连接状态、启停状态、新鲜度、通用 metadata、`configRef` 和安全配置引用
- **AND** 系统 SHALL NOT 在本 change 中要求为钉钉、飞书、LDAP、HR、北森或客户自建系统预留来源专用配置字段

#### Scenario: 保持来源连接稳定
- **WHEN** 外部来源连接的密钥、回调地址、可见范围或展示名称变更
- **THEN** 系统 SHALL 保持同一业务连接的 `sourceConnectionId` 稳定
- **AND** 系统 SHALL NOT 因普通配置更新重新生成外部身份映射根键

### Requirement: ExternalIdentity 稳定映射
系统 SHALL 使用 `sourceConnectionId + externalSubjectId` 将外部主体映射到平台用户、服务账号或部门。

#### Scenario: 映射外部用户身份
- **WHEN** 外部来源返回用户、服务账号或部门主体
- **THEN** 系统 SHALL 使用 `sourceConnectionId + externalSubjectId` 查找或建立 ExternalIdentity
- **AND** 系统 SHALL 将 `sourceType`、`sourceTenantId`、外部原始 ID 和 lineage 作为来源元数据保存

#### Scenario: 禁止弱标识自动匹配
- **WHEN** 外部来源只提供姓名、昵称、手机号、邮箱或头像等展示字段
- **THEN** 系统 SHALL NOT 使用这些字段作为唯一 join key、生命周期 key、scope key 或授权 key
- **AND** 系统 MAY 将这些字段作为人工核对或展示元数据

#### Scenario: 表达映射状态
- **WHEN** 外部身份被创建、匹配、冲突、停用或解绑
- **THEN** 系统 SHALL 使用确定的 `mappingStatus` 表达 `CONFIRMED`、`PENDING_REVIEW`、`DUPLICATE`、`CONFLICTED` 或 `DISABLED`

### Requirement: 多来源冲突处理
系统 SHALL 在多个外部来源提供同一平台组织或用户字段时执行明确的字段可信度和冲突处理规则。

#### Scenario: 处理字段冲突
- **WHEN** 两个或多个来源对同一平台用户、部门、成员关系、负责人、直属上级或生命周期状态提供不一致值
- **THEN** 系统 SHALL 根据配置的来源优先级和字段可信度决定自动合并、保留候选或标记冲突
- **AND** 系统 SHALL NOT 让最后一次同步静默覆盖关键授权字段

#### Scenario: 冲突数据 fail closed
- **WHEN** 生命周期、部门归属、负责人、直属上级或 ExternalIdentity 映射处于 `CONFLICTED` 或无法判定状态
- **THEN** 系统 SHALL 阻止该数据进入精确报表 scope 或后续授权投影
- **AND** 系统 SHALL 记录可审计的冲突原因和来源批次

#### Scenario: 第一阶段冲突不要求人工确认页面
- **WHEN** 多来源同步产生 `PENDING_REVIEW`、`DUPLICATE` 或 `CONFLICTED` 状态
- **THEN** 系统 SHALL 持久化候选来源、冲突状态、来源批次和安全诊断摘要
- **AND** 系统 SHALL NOT 要求本 change 提供人工确认页面
- **AND** 系统 SHALL 对影响精确报表 scope 或后续授权投影的冲突数据执行 fail-closed

### Requirement: 生命周期和版本
系统 SHALL 为组织数据变化维护生命周期事件、组织版本、新鲜度和 lineage。

#### Scenario: 记录生命周期事件
- **WHEN** 用户入职、离职、停用、调岗、部门撤销、外部账号解绑或服务账号禁用
- **THEN** 系统 SHALL 记录 LifecycleEvent 并更新受影响组织数据的 version 或 batch metadata

#### Scenario: 发布 scope/org version
- **WHEN** provider 返回当前用户 scope、组织树、部门成员或映射结果
- **THEN** 响应 SHALL 包含 `scopeVersion` 或 `orgVersion`、`freshness`、`generatedAt` 和 lineage metadata

#### Scenario: 组织树 read model 版本可诊断
- **WHEN** provider 返回组织架构树 read model
- **THEN** 响应 SHALL 包含 admin 组织树语义的 `orgVersion` 或 `scopeVersion`
- **AND** 响应 SHALL 包含 `freshness`、`generatedAt`、lineage metadata 和 `readModelSource`
- **AND** 该版本 SHALL NOT 与 gateway projection 专用 int64 `orgVersion` 混用

#### Scenario: 组织树版本来自可用来源快照
- **WHEN** provider 为组织架构树 read model 选择版本和 lineage
- **THEN** 系统 SHALL 优先使用最新可用 `OrgSyncBatch.OrgVersion` 或平台部门快照版本作为 admin 组织树 `orgVersion`
- **AND** 最新可用同步批次 SHALL 只包含已完成、具备 `OrgVersion` 且具备完成时间的 `SUCCEEDED` 或 `PARTIAL` 批次
- **AND** `RUNNING`、`FAILED`、缺少 `OrgVersion` 或缺少完成时间的批次 SHALL NOT 覆盖上一份可用组织树版本
- **AND** 系统 SHALL NOT 仅用 provider 请求时间生成或递增组织事实版本

#### Scenario: 不确定生命周期不放宽权限
- **WHEN** 当前用户、目标用户、部门或成员关系的生命周期状态缺失、过期或不可判定
- **THEN** 系统 SHALL 返回授权失败或 provider unavailable 结果
- **AND** 系统 SHALL NOT 将该场景扩大为全公司 scope
- **AND** 系统 SHALL NOT 将该错误场景伪装成业务成功的 `scopeType=EMPTY`

### Requirement: 管理范围 provider 输入契约
系统 SHALL 从平台组织主模型计算报表管理范围，并提供给 `aicodex-insight` 使用。

#### Scenario: 计算报表 scope
- **WHEN** Insight provider 请求当前用户可见报表范围
- **THEN** 系统 SHALL 基于 PlatformUser、PlatformDepartment、Membership、Role、Position、LifecycleEvent 和 ExternalIdentity 计算 `ALL_COMPANY`、`EMPTY`、`SELF`、`DEPARTMENT_TREE` 或 `CUSTOM_USERS`
- **AND** 系统 SHALL 在响应中返回稳定 admin subject、部门集合、用户集合、mappingStatus、scope/org version、freshness 和 trace ID

#### Scenario: 组织树优先来自平台部门主模型
- **WHEN** Insight provider 请求当前用户可见或可管理组织树
- **THEN** 系统 SHALL 优先基于 PlatformDepartment、平台成员关系、生命周期、SourceConnection 和 OrgSyncBatch lineage 构建组织树 read model
- **AND** 旧 Group 树 MAY 作为兼容投影、迁移输入或展示字段来源
- **AND** 系统 SHALL NOT 将旧 Group 树继续作为跨服务长期权威组织事实来源

#### Scenario: 保留来源元数据
- **WHEN** provider 响应包含来自企业微信、钉钉、飞书、LDAP、HR、北森或客户自建系统的展示字段
- **THEN** 系统 SHALL 将这些字段标记为来源元数据或展示缓存
- **AND** 系统 SHALL NOT 要求消费者使用来源专用字段作为权限或 join 权威

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
