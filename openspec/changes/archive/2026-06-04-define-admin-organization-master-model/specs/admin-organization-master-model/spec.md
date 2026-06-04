## ADDED Requirements

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

#### Scenario: 保留来源元数据
- **WHEN** provider 响应包含来自企业微信、钉钉、飞书、LDAP、HR、北森或客户自建系统的展示字段
- **THEN** 系统 SHALL 将这些字段标记为来源元数据或展示缓存
- **AND** 系统 SHALL NOT 要求消费者使用来源专用字段作为权限或 join 权威
