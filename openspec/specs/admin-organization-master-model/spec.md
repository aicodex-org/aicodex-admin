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

### Requirement: Admin 必须提供组织主数据质量 readiness
Admin SHALL provide a read-only organization master data quality readiness summary for operators before gateway projection publish or projection diagnostics workflows.

#### Scenario: Operator reads quality readiness
- **WHEN** an authorized Admin operator requests quality readiness for an organization
- **THEN** Admin SHALL evaluate Admin-owned `PlatformDepartment`, `PlatformMembership`, `PlatformUser`, `PlatformApiUserMapping`, `SourceConnection` and `OrgSyncBatch` snapshot data
- **AND** Admin SHALL return `status`, `generatedAt`, quality counts, stable `reasonAliases`, source freshness/trust summary and sync batch lineage summary
- **AND** Admin SHALL NOT query API/Gateway/Insight internal databases or trigger gateway projection publish

#### Scenario: Quality readiness returns stable status
- **WHEN** source lineage is missing, source connection is disabled/stale/unavailable, duplicate source keys exist, active membership references a missing active user, or no publishable active/tombstone subject exists
- **THEN** Admin SHALL return `status=blocked` with stable reason aliases
- **WHEN** non-blocking data quality gaps exist such as orphan departments, disabled/tombstone/unknown/conflicted/stale subjects, unmapped subjects, untrusted mappings or memberships referencing missing departments
- **THEN** Admin SHALL return `status=warning`
- **WHEN** source lineage is usable and no blocked or warning aliases exist
- **THEN** Admin SHALL return `status=ready`

#### Scenario: Quality readiness remains sanitized and owner-scoped
- **WHEN** quality readiness is returned, logged, documented or shown in web-admin
- **THEN** Admin SHALL expose only counts, status, aliases and remediation summary
- **AND** Admin SHALL NOT expose token, Cookie, private URL, phone, email, full organization tree, raw source response, complete user detail or complete organization structure
- **AND** the readiness summary SHALL be treated as Admin producer diagnostics, not gateway authorization facts

### Requirement: Web admin 必须展示组织主数据质量 readiness
Admin web UI SHALL expose a compact organization master data quality readiness area near Platform API mapping and gateway projection manual publish context.

#### Scenario: Operator reviews quality before publish
- **WHEN** operator opens the mapping/projection console for an organization
- **THEN** the UI SHALL show quality `status`, stable reason aliases, source/sync summary and key counts
- **AND** the UI SHALL provide a refresh action for the read-only quality readiness
- **AND** the UI SHALL explain that quality readiness is an Admin-owned preflight signal and does not prove API/Gateway/Insight authorization success

### Requirement: Admin SHALL expose organization directory quality details
Admin SHALL provide a read-only organization directory quality API for Admin-owned `PlatformDepartment`, `PlatformUser`, and `PlatformMembership` records so operators can locate concrete master-data quality problems behind organization readiness summaries.

#### Scenario: Operator lists quality details by entity type
- **WHEN** an authorized Admin operator requests directory quality details for an organization and `entityType=department`, `entityType=user`, or `entityType=membership`
- **THEN** Admin SHALL evaluate only Admin-owned platform organization master data and related Admin-owned mapping/lineage records
- **AND** Admin SHALL return paged records with `qualityStatus`, stable `reasonCodes`, lifecycle status, source summary, sync batch/version summary, and remediation hints
- **AND** Admin SHALL NOT query API, Gateway, or Insight internal databases
- **AND** Admin SHALL NOT trigger gateway projection publish or write gateway authorization facts

#### Scenario: Operator filters quality details
- **WHEN** the operator provides filters such as `keyword`, `sourceType`, `sourceConnectionIdHash`, `qualityStatus`, `reasonCode`, `lifecycleStatus`, `p`, or `pageSize`
- **THEN** Admin SHALL apply those filters inside the Admin directory quality read model
- **AND** Admin SHALL return `items`, `total`, `page`, `pageSize`, and summary counts for the filtered result
- **AND** Admin SHALL return an empty result rather than exposing data from another organization when no record matches

#### Scenario: Invalid directory quality query fails closed
- **WHEN** the operator provides an unsupported `entityType`, unsupported status filter, or invalid pagination value
- **THEN** Admin SHALL reject the request with an operator-readable error
- **AND** Admin SHALL NOT silently return an empty success response that could be mistaken for a clean directory

#### Scenario: Directory details classify retry and repair blockers
- **WHEN** a department has missing/disabled/untrusted source lineage, duplicate source keys, missing source keys, an orphan parent, stale source freshness, or non-active lifecycle
- **THEN** Admin SHALL classify the department with stable reason codes and `qualityStatus=blocked` for fail-closed blockers or `qualityStatus=warning` for repairable non-blocking diagnostics
- **WHEN** a user has missing/duplicate admin subject, missing or untrusted API user mapping, unavailable lineage freshness, source freshness gaps, or non-active lifecycle
- **THEN** Admin SHALL classify the user with stable reason codes and `qualityStatus=blocked` or `qualityStatus=warning`
- **WHEN** a membership references a missing active user, missing active department, disabled/untrusted source lineage, stale source freshness, or non-active lifecycle
- **THEN** Admin SHALL classify the membership with stable reason codes and `qualityStatus=blocked` or `qualityStatus=warning`

#### Scenario: Directory quality response is sanitized
- **WHEN** Admin returns directory quality list or detail data
- **THEN** the response SHALL expose only local Admin identifiers, display labels, source type, hashed source connection/external identifiers, lifecycle/mapping/status fields, sync batch/version summaries, reason codes, and remediation hints
- **AND** the response SHALL NOT expose token, Secret, Cookie, private URL, phone, email, full organization tree payload, raw source response, or complete external profile
- **AND** the response SHALL be treated as Admin producer diagnostics, not Gateway authorization facts or Insight derived metadata

### Requirement: Web admin SHALL provide organization directory quality console
Admin web UI SHALL expose a dedicated organization directory quality console for operators to inspect Admin-owned directory quality details without overloading the Platform API mapping page.

#### Scenario: Operator opens the directory quality console
- **WHEN** an Admin operator opens the organization directory quality page
- **THEN** the UI SHALL provide organization input/selection, entity type tabs or segmented control, filters, a paged table, refresh action, and an item detail panel
- **AND** the UI SHALL show quality status, reason codes, source/batch/version summary, and remediation hints for selected records
- **AND** the UI SHALL include loading, empty, no-match, and error states

#### Scenario: Directory quality console remains read-only
- **WHEN** the operator filters, refreshes, opens details, or changes page
- **THEN** the UI SHALL call only the Admin directory quality read API
- **AND** the UI SHALL NOT trigger gateway projection publish, write mapping records, write gateway authorization facts, or call API/Gateway/Insight internal services

### Requirement: Admin SHALL expose organization directory remediation plans
Admin SHALL provide a read-only organization directory remediation plan API that aggregates Admin-owned directory quality details into prioritized operator actions.

#### Scenario: Operator reads remediation plan
- **WHEN** an authorized Admin operator requests a remediation plan for an organization
- **THEN** Admin SHALL evaluate Admin-owned directory quality details for `PlatformDepartment`, `PlatformUser`, and `PlatformMembership`
- **AND** Admin SHALL return prioritized plan groups with stable `actionAlias`, `priority`, `reasonCodes`, `affectedCounts`, sanitized samples, source/org version summaries, safe summaries, operator actions, and blocked reasons
- **AND** Admin SHALL NOT execute repairs, write gateway authorization facts, trigger gateway projection publish, or query API/Gateway/Insight internal databases

#### Scenario: Remediation plan maps quality reasons to operator actions
- **WHEN** source connection, freshness, lineage, mapping, duplicate identity, lifecycle, department, user, or membership quality reasons are present
- **THEN** Admin SHALL map them into stable action aliases such as `source_refresh`, `blocked_by_credentials`, `mapping_review`, `identity_conflict_review`, `lifecycle_cleanup`, `membership_repair`, and `manual_investigation`
- **AND** Admin SHALL assign deterministic priorities so credentials/source blockers and identity conflicts sort before mapping, membership, lifecycle, and manual investigation work

#### Scenario: Operator filters remediation plan
- **WHEN** the operator provides filters such as `entityType`, `qualityStatus`, `reasonCode`, `sourceType`, `sourceConnectionIdHash`, `keyword`, `limit`, or `topN`
- **THEN** Admin SHALL apply those filters to the Admin directory quality read model before aggregating the plan
- **AND** Admin SHALL aggregate only `blocked` and `warning` records by default
- **AND** Admin SHALL return an empty plan when `qualityStatus=ready` is requested
- **AND** Admin SHALL reject unsupported entity/status/limit values with an operator-readable error
- **AND** Admin SHALL return an empty plan for empty organization scope rather than scanning across organizations

#### Scenario: Remediation plan export remains sanitized
- **WHEN** Admin returns or exports remediation plan data
- **THEN** the response SHALL include only plan keys, priorities, action aliases, counts, reason codes, safe summaries, sanitized entity IDs or hashes, source/org version summaries, and operator action text
- **AND** the response SHALL NOT expose token, Secret, Cookie, private URL, phone, email, full organization tree payload, raw source response, complete external profile, or execute any remediation
- **AND** the plan SHALL be treated as Admin producer diagnostics, not Gateway authorization facts or Insight fallback data

### Requirement: Web admin SHALL show organization directory remediation plan
Admin web UI SHALL show a read-only remediation plan panel for organization directory quality issues.

#### Scenario: Operator reviews prioritized remediation plan
- **WHEN** an Admin operator opens the organization directory quality page
- **THEN** the UI SHALL show remediation plan groups for the selected organization and filters
- **AND** the UI SHALL show priority, action alias, affected count, reason codes, sanitized samples, safe summary, and operator actions
- **AND** the UI SHALL provide refresh and sanitized export actions that do not write data

#### Scenario: Remediation plan UI remains read-only
- **WHEN** the operator refreshes, filters, opens details, or exports the plan
- **THEN** the UI SHALL call only the Admin remediation plan read API or perform client-side download of sanitized data
- **AND** the UI SHALL NOT trigger gateway projection publish, write mapping records, write gateway authorization facts, call API/Gateway/Insight internal services, or perform source-system repairs

### Requirement: Admin SHALL expose organization directory remediation action drafts
Admin SHALL provide a read-only organization directory remediation action draft API that turns Admin-owned directory quality remediation actions into sanitized manual-review draft checklists.

#### Scenario: Operator reads remediation action drafts
- **WHEN** an authorized Admin operator requests remediation action drafts for an organization
- **THEN** Admin SHALL evaluate only Admin-owned organization directory quality details and remediation action metadata
- **AND** Admin SHALL return draft groups with `draftId`, `actionAlias`, `priority`, `entityType`, `affectedCount`, `safeSummary`, `blockedReason`, `preconditions`, `operatorSteps`, `executionMode`, and sanitized samples
- **AND** every draft SHALL set `executionMode=manual_review_only` or an equivalent value that prevents the response from being interpreted as an executable repair
- **AND** Admin SHALL NOT write organization master data, repair relationships, trigger gateway projection publish, write Gateway facts, or query API/Gateway/Insight internal databases

#### Scenario: Operator filters remediation action drafts
- **WHEN** the operator provides filters such as `actionAlias`, `reasonCode`, `entityType`, `qualityStatus`, `sourceType`, `sourceConnectionIdHash`, `keyword`, `limit`, or `topN`
- **THEN** Admin SHALL apply those filters to the Admin directory quality read model before generating drafts
- **AND** Admin SHALL default to blocked and warning quality records
- **AND** Admin SHALL return an empty draft result when `qualityStatus=ready` is requested
- **AND** Admin SHALL return an empty draft result for empty organization scope rather than scanning across organizations
- **AND** Admin SHALL reject unsupported entity/status/action/limit values with an operator-readable error

#### Scenario: Remediation action draft failures fail closed
- **WHEN** the operator is not authorized for the requested organization
- **THEN** Admin SHALL deny the request through the normal organization-scoped authorization path
- **WHEN** the Admin-owned directory quality read model returns an internal error
- **THEN** Admin SHALL return an error response rather than a successful empty draft that could be mistaken for a clean state
- **AND** Admin SHALL NOT include token, Cookie, private URL, source payload, raw organization tree, or credential details in the error response

#### Scenario: Remediation action draft samples remain sanitized
- **WHEN** Admin returns or exports remediation action draft data
- **THEN** draft samples SHALL expose only stable hashes, display-safe labels, entity type, source type, quality status, reason/status codes, lifecycle status, hashed source connection identifiers, and source/org version summaries
- **AND** draft samples SHALL NOT expose token, Secret, Cookie, private URL, phone, email, raw source payload, full organization tree, full external profile, complete personnel details, or source-system credentials
- **AND** the draft SHALL be treated as Admin producer diagnostics, not Gateway authorization facts or Insight fallback data

### Requirement: Web admin SHALL show remediation action drafts from organization directory plans
Admin web UI SHALL let operators open read-only remediation action drafts from the organization directory remediation plan panel.

#### Scenario: Operator opens an action draft
- **WHEN** an Admin operator clicks a draft/detail action for a remediation plan group
- **THEN** the UI SHALL open a drawer or panel that calls only the Admin remediation action draft read API
- **AND** the UI SHALL show `executionMode=manual_review_only`, priority, affected count, blocked reason, preconditions, operator steps, and sanitized samples
- **AND** the UI SHALL provide copy/export actions for sanitized draft JSON

#### Scenario: Remediation action draft UI remains read-only
- **WHEN** the operator opens, refreshes, copies, or exports a draft
- **THEN** the UI SHALL NOT trigger source-system repairs, write Admin organization records, write mapping records, trigger gateway projection publish, write Gateway facts, or call API/Gateway/Insight internal services

### Requirement: Admin SHALL expose organization directory remediation preflight
Admin SHALL provide a read-only remediation preflight API that evaluates Admin-owned organization directory action drafts before any future manual repair execution.

#### Scenario: Operator reads remediation preflight
- **WHEN** an authorized Admin operator requests remediation preflight for an organization and draft or action filter
- **THEN** Admin SHALL evaluate only Admin-owned organization directory quality details and remediation action draft metadata
- **AND** Admin SHALL return `preflightId`, `draftId`, `actionAlias`, `executionMode`, `readyForManualReview`, `autoExecutionAllowed`, `blockedReasons`, `preconditions`, `safetyChecklist`, `affectedCounts`, `sampleDigests`, `exportSummary`, and `operatorNextSteps`
- **AND** every preflight SHALL set `executionMode=manual_review_only`
- **AND** every preflight SHALL set `autoExecutionAllowed=false`
- **AND** Admin SHALL NOT write organization master data, repair relationships, trigger gateway projection publish, write Gateway facts, or query API/Gateway/Insight internal databases

#### Scenario: Operator filters remediation preflight
- **WHEN** the operator provides `draftId` or filters such as `actionAlias`, `reasonCode`, `entityType`, `qualityStatus`, `sourceType`, `sourceConnectionIdHash`, `keyword`, `limit`, or `topN`
- **THEN** Admin SHALL apply those filters to the action draft and directory quality read models before generating preflight
- **AND** Admin SHALL return an empty preflight result for empty organization scope rather than scanning across organizations
- **AND** Admin SHALL return an empty preflight result when `qualityStatus=ready` is requested
- **AND** Admin SHALL reject unsupported entity/action/limit values with an operator-readable error
- **AND** Admin SHALL return a blocked preflight when a requested `draftId` does not match any generated draft

#### Scenario: Remediation preflight failures fail closed
- **WHEN** the operator is not authorized for the requested organization
- **THEN** Admin SHALL deny the request through the normal organization-scoped authorization path
- **WHEN** the Admin-owned directory quality read model or action draft generation returns an internal error
- **THEN** Admin SHALL return an error response rather than a successful ready preflight
- **AND** Admin SHALL NOT include token, Cookie, private URL, source payload, raw organization tree, or credential details in the error response

#### Scenario: Remediation preflight samples remain sanitized
- **WHEN** Admin returns or exports remediation preflight data
- **THEN** `sampleDigests` SHALL expose only stable hashes, display-safe labels, entity type, source type, quality status, reason/status codes, lifecycle status, hashed source connection identifiers, and source/org version summaries
- **AND** `sampleDigests` SHALL NOT expose token, Secret, Cookie, private URL, phone, email, raw source payload, full organization tree, full external profile, complete personnel details, or source-system credentials
- **AND** the preflight SHALL be treated as Admin producer diagnostics, not Gateway authorization facts or Insight fallback data

### Requirement: Web admin SHALL show remediation preflight from action drafts
Admin web UI SHALL let operators open read-only remediation preflight from organization directory action draft details.

#### Scenario: Operator opens remediation preflight
- **WHEN** an Admin operator opens preflight for an action draft
- **THEN** the UI SHALL call only the Admin remediation preflight read API
- **AND** the UI SHALL show `executionMode=manual_review_only`, `autoExecutionAllowed=false`, ready/blocker state, safety checklist, affected counts, operator next steps, and sanitized sample digests
- **AND** the UI SHALL provide export for sanitized preflight JSON

#### Scenario: Remediation preflight UI remains read-only
- **WHEN** the operator opens, refreshes, or exports preflight
- **THEN** the UI SHALL NOT trigger source-system repairs, write Admin organization records, write mapping records, trigger gateway projection publish, write Gateway facts, or call API/Gateway/Insight internal services

### Requirement: Admin SHALL expose organization directory remediation execution approval preview
Admin SHALL provide a read-only organization directory remediation execution approval preview API that aggregates Admin-owned action draft and remediation preflight results before any future repair execution.

#### Scenario: Operator reads remediation execution approval preview
- **WHEN** an authorized Admin operator requests an execution approval preview for an organization and draft or action filter
- **THEN** Admin SHALL evaluate only Admin-owned organization directory action draft and remediation preflight metadata
- **AND** Admin SHALL return `approvalPreviewId`, `approvalPreviewHash`, `draftId`, `actionAlias`, `executionMode`, `autoExecutionAllowed`, `affectedCount`, `riskLevel`, `preconditions`, `blockedReasons`, `requiredApprovals`, `operatorChecklist`, `safeSummary`, `exportSummary`, and sample stable hashes
- **AND** every approval preview SHALL set `executionMode=manual_review_only`
- **AND** every approval preview SHALL set `autoExecutionAllowed=false`
- **AND** Admin SHALL NOT write organization master data, repair relationships, trigger gateway projection publish, write Gateway facts, or query API/Gateway/Insight internal databases

#### Scenario: Operator filters remediation execution approval preview
- **WHEN** the operator provides `draftId` or filters such as `actionAlias`, `reasonCode`, `entityType`, `qualityStatus`, `sourceType`, `sourceConnectionIdHash`, `keyword`, `limit`, or `topN`
- **THEN** Admin SHALL apply those filters through the action draft and preflight read models before generating the approval preview
- **AND** Admin SHALL return an empty approval preview result for empty organization scope rather than scanning across organizations
- **AND** Admin SHALL return an empty approval preview result when `qualityStatus=ready` is requested
- **AND** Admin SHALL reject unsupported entity/action/limit values with an operator-readable error
- **AND** Admin SHALL return a blocked approval preview when a requested `draftId` does not match any generated draft or preflight result

#### Scenario: Remediation execution approval preview failures fail closed
- **WHEN** the operator is not authorized for the requested organization
- **THEN** Admin SHALL deny the request through the normal organization-scoped authorization path
- **WHEN** the Admin-owned action draft or remediation preflight generation returns an internal error
- **THEN** Admin SHALL return an error response rather than a successful ready-for-approval preview
- **WHEN** the matching preflight is blocked, has no sample digests, or cannot be generated
- **THEN** Admin SHALL set `autoExecutionAllowed=false`, include stable blocked reasons or checklist blockers, and avoid representing the preview as executable
- **AND** Admin SHALL NOT include token, Cookie, private URL, source payload, raw organization tree, or credential details in the error response

#### Scenario: Remediation execution approval preview samples remain sanitized
- **WHEN** Admin returns or exports remediation execution approval preview data
- **THEN** sample stable hashes and `exportSummary` SHALL expose only stable hashes, display-safe labels, entity type, source type, quality status, reason/status codes, lifecycle status, hashed source connection identifiers, and source/org version summaries
- **AND** samples and export SHALL NOT expose token, Secret, Cookie, private URL, phone, email, raw source payload, full organization tree, full external profile, complete personnel details, or source-system credentials
- **AND** the approval preview SHALL be treated as Admin producer diagnostics, not Gateway authorization facts or Insight fallback data

### Requirement: Web admin SHALL show remediation execution approval preview from action drafts and preflight
Admin web UI SHALL let operators open read-only remediation execution approval preview from organization directory action draft or preflight details.

#### Scenario: Operator opens remediation execution approval preview
- **WHEN** an Admin operator opens approval preview for an action draft or preflight
- **THEN** the UI SHALL call only the Admin remediation execution approval preview read API
- **AND** the UI SHALL show `executionMode=manual_review_only`, `autoExecutionAllowed=false`, affected count, risk level, required approvals, operator checklist, safe summary, blocked reasons, and sample stable hashes
- **AND** the UI SHALL cover loading, empty, error, disabled, blocked, and ready-for-approval states
- **AND** the UI SHALL provide copy and export for sanitized approval preview JSON

#### Scenario: Remediation execution approval preview UI remains read-only
- **WHEN** the operator opens, refreshes, copies, or exports approval preview
- **THEN** the UI SHALL NOT trigger source-system repairs, write Admin organization records, write mapping records, trigger gateway projection publish, write Gateway facts, call API/Gateway/Insight internal services, or expose an execute/repair button

### Requirement: Admin SHALL expose organization directory remediation approval packet audit
Admin SHALL provide a read-only organization directory remediation approval packet audit API that derives approval packet search/history records from Admin-owned approval preview, remediation preflight, and action draft metadata.

#### Scenario: Operator searches remediation approval packet audit
- **WHEN** an authorized Admin operator requests approval packet audit for an organization and packet, preview, draft, action, risk, status, or keyword filter
- **THEN** Admin SHALL evaluate only Admin-owned organization directory approval preview, preflight, and action draft metadata
- **AND** Admin SHALL return `packetAuditId`, `packetHash`, `approvalPreviewHash`, `draftId`, `actionAlias`, `executionMode`, `autoExecutionAllowed`, `eventTypes`, `packetStatus`, `riskLevel`, `affectedCount`, `blockedReasons`, `requiredApprovals`, `operatorChecklistDigest`, `sampleStableHashes`, `exportSummary`, `storageScope`, and `retentionPolicy`
- **AND** every audit record SHALL set `executionMode=manual_review_only`
- **AND** every audit record SHALL set `autoExecutionAllowed=false`
- **AND** P0 audit records SHALL set `storageScope=derived_non_persistent` and `retentionPolicy=not_persisted` unless a later Admin-owned persistent audit store is explicitly introduced
- **AND** Admin SHALL NOT write organization master data, repair relationships, trigger gateway projection publish, write Gateway facts, or query API/Gateway/Insight internal databases

#### Scenario: Operator filters remediation approval packet audit
- **WHEN** the operator provides `packetAuditId`, `packetHash`, `approvalPreviewHash`, `draftId`, or filters such as `actionAlias`, `reasonCode`, `entityType`, `qualityStatus`, `sourceType`, `sourceConnectionIdHash`, `riskLevel`, `packetStatus`, `keyword`, `limit`, or `topN`
- **THEN** Admin SHALL apply those filters through the approval preview and preflight read models before deriving audit records
- **AND** Admin SHALL return an empty audit result for empty organization scope rather than scanning across organizations
- **AND** Admin SHALL return an empty audit result when `qualityStatus=ready` is requested
- **AND** Admin SHALL reject unsupported entity/action/risk/status/limit values with an operator-readable error
- **AND** Admin SHALL return an empty audit result when a requested packet or preview identifier does not match any generated approval preview

#### Scenario: Remediation approval packet audit failures fail closed
- **WHEN** the operator is not authorized for the requested organization
- **THEN** Admin SHALL deny the request through the normal organization-scoped authorization path
- **WHEN** Admin-owned approval preview, preflight, or action draft generation returns an internal error
- **THEN** Admin SHALL return an error response rather than a successful audit record
- **WHEN** the matching approval preview is blocked, has no samples, or cannot be generated
- **THEN** Admin SHALL keep `autoExecutionAllowed=false`, include stable blocked reasons or checklist blockers, and avoid representing the packet as executable
- **AND** Admin SHALL NOT include token, Cookie, private URL, source payload, raw organization tree, or credential details in the error response

#### Scenario: Remediation approval packet audit samples remain sanitized
- **WHEN** Admin returns or exports remediation approval packet audit data
- **THEN** `sampleStableHashes`, `operatorChecklistDigest`, and `exportSummary` SHALL expose only stable hashes, display-safe labels, entity type, source type, quality status, reason/status codes, lifecycle status, hashed source connection identifiers, risk/checklist/approval summary, and source/org version summaries
- **AND** samples and export SHALL NOT expose token, Secret, Cookie, private URL, phone, email, raw source payload, full organization tree, full external profile, complete personnel details, or source-system credentials
- **AND** the approval packet audit SHALL be treated as Admin producer diagnostics, not Gateway authorization facts or Insight fallback data

### Requirement: Web admin SHALL show remediation approval packet audit from approval preview
Admin web UI SHALL let operators open read-only remediation approval packet audit/search/history from organization directory approval preview details.

#### Scenario: Operator opens remediation approval packet audit
- **WHEN** an Admin operator opens approval packet audit from an action draft, preflight, or approval preview panel
- **THEN** the UI SHALL call only the Admin remediation approval packet audit read API
- **AND** the UI SHALL show `storageScope=derived_non_persistent`, `retentionPolicy=not_persisted`, `executionMode=manual_review_only`, `autoExecutionAllowed=false`, packet status, event types, risk level, affected count, required approvals, checklist digest, blocked reasons, safe/export summary, and sample stable hashes
- **AND** the UI SHALL cover loading, empty, error, disabled, blocked, long text, and ready states
- **AND** the UI SHALL provide copy and export for sanitized approval packet audit JSON

#### Scenario: Remediation approval packet audit UI remains read-only
- **WHEN** the operator opens, refreshes, copies, exports, filters, or views approval packet audit history
- **THEN** the UI SHALL NOT trigger source-system repairs, write Admin organization records, write mapping records, trigger gateway projection publish, write Gateway facts, call API/Gateway/Insight internal services, or expose an execute/repair button

### Requirement: Admin SHALL expose organization directory remediation approval packet operator notes
Admin SHALL provide a read-only organization directory remediation approval packet operator notes API that derives sanitized handoff note drafts from Admin-owned approval packet audit, approval preview, remediation preflight, and action draft metadata.

#### Scenario: Operator generates approval packet handoff notes
- **WHEN** an authorized Admin operator requests operator notes for an organization and packet, preview, draft, action, risk, status, or keyword filter
- **THEN** Admin SHALL evaluate only Admin-owned approval packet audit, approval preview, preflight, and action draft metadata
- **AND** Admin SHALL return `noteId`, `noteHash`, `packetHash`, `approvalPreviewHash`, `draftId`, `actionAlias`, `executionMode`, `autoExecutionAllowed`, `noteScope`, `retentionPolicy`, `noteFormat`, `handoffSummary`, `riskSummary`, `statusSummary`, `checklistSummary`, `cannotInfer`, `operatorNextSteps`, `sampleStableHashes`, `exportSummary`, and `markdownSummary`
- **AND** every note SHALL set `executionMode=manual_review_only`
- **AND** every note SHALL set `autoExecutionAllowed=false`
- **AND** P0 notes SHALL set `noteScope=derived_note_draft` and `retentionPolicy=not_persisted` unless a later Admin-owned persistent notes store is explicitly introduced
- **AND** Admin SHALL NOT write organization master data, repair relationships, trigger gateway projection publish, write Gateway facts, or query API/Gateway/Insight internal databases

#### Scenario: Operator filters approval packet operator notes
- **WHEN** the operator provides `noteId`, `noteHash`, `packetAuditId`, `packetHash`, `approvalPreviewHash`, `draftId`, or filters such as `actionAlias`, `reasonCode`, `entityType`, `qualityStatus`, `sourceType`, `sourceConnectionIdHash`, `riskLevel`, `packetStatus`, `keyword`, `limit`, or `topN`
- **THEN** Admin SHALL apply those filters through the approval packet audit and approval preview read models before deriving note drafts
- **AND** Admin SHALL return an empty notes result for empty organization scope rather than scanning across organizations
- **AND** Admin SHALL return an empty notes result when `qualityStatus=ready` is requested
- **AND** Admin SHALL reject unsupported entity/action/risk/status/limit values with an operator-readable error
- **AND** Admin SHALL return an empty notes result when a requested note, packet, or preview identifier does not match any generated approval packet audit

#### Scenario: Approval packet operator notes fail closed
- **WHEN** the operator is not authorized for the requested organization
- **THEN** Admin SHALL deny the request through the normal organization-scoped authorization path
- **WHEN** Admin-owned audit, approval preview, preflight, or action draft generation returns an internal error
- **THEN** Admin SHALL return an error response rather than a successful note draft
- **WHEN** the matching approval packet is blocked, has no samples, or cannot be generated
- **THEN** Admin SHALL keep `autoExecutionAllowed=false`, include stable blocked reasons, checklist blockers, and `cannotInfer`, and avoid representing the notes as an executable approval
- **AND** Admin SHALL NOT include token, Cookie, private URL, source payload, raw organization tree, or credential details in the error response

#### Scenario: Approval packet operator notes remain sanitized
- **WHEN** Admin returns or exports approval packet operator notes
- **THEN** `handoffSummary`, `riskSummary`, `statusSummary`, `checklistSummary`, `cannotInfer`, `sampleStableHashes`, `exportSummary`, and `markdownSummary` SHALL expose only stable hashes, display-safe labels, entity type, source type, quality status, reason/status codes, lifecycle status, hashed source connection identifiers, risk/checklist/approval summary, manual-review-only status, and source/org version summaries
- **AND** notes and export SHALL NOT expose token, Secret, Cookie, private URL, phone, email, raw source payload, full organization tree, full external profile, complete personnel details, or source-system credentials
- **AND** the operator notes SHALL be treated as Admin producer diagnostics and handoff drafts, not Gateway authorization facts, Insight fallback data, persistent audit records, or execution approval decisions

### Requirement: Web admin SHALL show remediation approval packet operator notes from approval packet audit
Admin web UI SHALL let operators open read-only remediation approval packet operator notes from organization directory approval packet audit details.

#### Scenario: Operator opens approval packet operator notes
- **WHEN** an Admin operator opens operator notes from an approval preview or approval packet audit panel
- **THEN** the UI SHALL call only the Admin remediation approval packet operator notes read API
- **AND** the UI SHALL show `noteScope=derived_note_draft`, `retentionPolicy=not_persisted`, `executionMode=manual_review_only`, `autoExecutionAllowed=false`, handoff summary, risk/status/checklist summary, cannotInfer, operator next steps, sample stable hashes, and JSON/Markdown export
- **AND** the UI SHALL cover loading, empty, error, disabled, blocked, long text, and ready states
- **AND** the UI SHALL provide copy and export for sanitized approval packet operator notes JSON/Markdown

#### Scenario: Approval packet operator notes UI remains read-only
- **WHEN** the operator opens, refreshes, copies, exports, filters, or views approval packet operator notes
- **THEN** the UI SHALL NOT trigger source-system repairs, write Admin organization records, write mapping records, trigger gateway projection publish, write Gateway facts, call API/Gateway/Insight internal services, or expose an execute/repair button

### Requirement: Admin SHALL expose organization directory remediation operator note persistence readiness
Admin SHALL provide a read-only organization directory remediation operator note persistence readiness API that evaluates whether a derived approval packet operator note has the minimum Admin-owned contract evidence needed before any future persistent operator notes store is introduced.

#### Scenario: Operator reads operator note persistence readiness
- **WHEN** an authorized Admin operator requests persistence readiness for an organization and note, packet, preview, draft, action, risk, status, or keyword filter
- **THEN** Admin SHALL evaluate only Admin-owned approval packet operator notes, approval packet audit, approval preview, remediation preflight, and action draft metadata
- **AND** Admin SHALL return `readinessId`, `readinessHash`, `noteHash`, `packetHash`, `approvalPreviewHash`, `executionMode`, `autoExecutionAllowed`, `storageScope`, `persistenceAllowed`, `storeDecisionRequired`, `readinessStatus`, `readyForPersistenceDesignReview`, `idempotencyKey`, `idempotencyComponents`, `permissionChecklist`, `retentionChecklist`, `auditSemanticsChecklist`, `redactionChecklist`, `manualReviewGate`, `cannotInfer`, `blockedReasons`, `safeSummary`, and `exportSummary`
- **AND** every readiness record SHALL set `executionMode=manual_review_only`
- **AND** every readiness record SHALL set `autoExecutionAllowed=false`
- **AND** every readiness record SHALL set `storageScope=readiness_only`, `persistenceAllowed=false`, and `storeDecisionRequired=true`
- **AND** Admin SHALL NOT create or update a persistent notes store, write organization master data, repair relationships, trigger gateway projection publish, write Gateway facts, or query API/Gateway/Insight internal databases

#### Scenario: Operator filters operator note persistence readiness
- **WHEN** the operator provides `readinessId`, `readinessHash`, `noteId`, `noteHash`, `packetAuditId`, `packetHash`, `approvalPreviewHash`, `draftId`, or filters such as `actionAlias`, `reasonCode`, `entityType`, `qualityStatus`, `sourceType`, `sourceConnectionIdHash`, `riskLevel`, `packetStatus`, `keyword`, `limit`, or `topN`
- **THEN** Admin SHALL apply those filters through the operator notes and approval packet audit read models before deriving persistence readiness
- **AND** Admin SHALL return an empty readiness result for empty organization scope rather than scanning across organizations
- **AND** Admin SHALL return an empty readiness result when `qualityStatus=ready` is requested
- **AND** Admin SHALL reject unsupported entity/action/risk/status/limit values with an operator-readable error
- **AND** Admin SHALL return an empty readiness result when a requested readiness, note, packet, or preview identifier does not match any generated operator note

#### Scenario: Operator note persistence readiness fails closed
- **WHEN** the operator is not authorized for the requested organization
- **THEN** Admin SHALL deny the request through the normal organization-scoped authorization path
- **WHEN** Admin-owned operator notes, audit, approval preview, preflight, or action draft generation returns an internal error
- **THEN** Admin SHALL return an error response rather than a successful persistence readiness record
- **WHEN** the matching operator note is blocked, has no samples, lacks manual-review-only metadata, lacks cannotInfer boundaries, or cannot be generated
- **THEN** Admin SHALL set `persistenceAllowed=false`, include stable blocked reasons, and avoid representing readiness as a persistent write approval
- **AND** Admin SHALL NOT include token, Cookie, private URL, source payload, raw organization tree, or credential details in the error response

#### Scenario: Operator note persistence readiness remains sanitized
- **WHEN** Admin returns or exports operator note persistence readiness data
- **THEN** `idempotencyKey`, `idempotencyComponents`, `permissionChecklist`, `retentionChecklist`, `auditSemanticsChecklist`, `redactionChecklist`, `manualReviewGate`, `cannotInfer`, `blockedReasons`, `safeSummary`, and `exportSummary` SHALL expose only stable hashes, display-safe labels, status/reason aliases, risk/checklist/approval summary, manual-review-only status, and source/org version summaries
- **AND** readiness data SHALL NOT expose token, Secret, Cookie, private URL, phone, email, raw source payload, full organization tree, full external profile, complete personnel details, source-system credentials, or real remediation execution details
- **AND** the readiness SHALL be treated as Admin producer diagnostics and future-store readiness evidence, not Gateway authorization facts, Insight fallback data, persistent audit records, saved operator notes, or execution approval decisions

### Requirement: Web admin SHALL show operator note persistence readiness from operator notes
Admin web UI SHALL let operators open read-only operator note persistence readiness from organization directory approval packet operator notes.

#### Scenario: Operator opens operator note persistence readiness
- **WHEN** an Admin operator opens persistence readiness from an approval packet operator notes panel
- **THEN** the UI SHALL call only the Admin operator note persistence readiness read API
- **AND** the UI SHALL show `storageScope=readiness_only`, `persistenceAllowed=false`, `storeDecisionRequired=true`, readiness status, idempotency key/components, permission checklist, retention checklist, audit semantics checklist, redaction checklist, manual review gate, cannotInfer, blocked reasons, safe summary, and sanitized JSON export
- **AND** the UI SHALL cover loading, empty, error, disabled, blocked, long text, and ready-for-design-review states
- **AND** the UI SHALL provide copy and export for sanitized persistence readiness JSON

#### Scenario: Operator note persistence readiness UI remains read-only
- **WHEN** the operator opens, refreshes, copies, exports, filters, or views operator note persistence readiness
- **THEN** the UI SHALL NOT save operator notes, create persistent audit records, trigger source-system repairs, write Admin organization records, write mapping records, trigger gateway projection publish, write Gateway facts, call API/Gateway/Insight internal services, or expose an execute/repair/save button
