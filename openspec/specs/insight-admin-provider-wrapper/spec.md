# insight-admin-provider-wrapper Specification

## Purpose
定义 Admin 向 Insight 提供当前用户身份、可查询用量范围、可见组织树、稳定错误语义与脱敏审计信息的只读 provider 契约，确保跨服务身份映射和授权范围由 Admin 可信计算并保持 fail-closed。
## Requirements
### Requirement: provider 必须提供当前 admin 用户身份
系统 MUST 提供 `GET /api/admin-provider/insight/v1/current-user`，用于让 `aicodex-insight` 只读获取当前登录 admin 用户的稳定身份、展示字段、角色、分组、平台组织信息和用量用户映射状态。

#### Scenario: 已认证用户读取当前身份
- **WHEN** `aicodex-insight` 使用有效的 admin 用户访问令牌请求 current-user provider
- **THEN** 系统 MUST 返回当前用户的 `adminUserId`、`username`、`displayName`、`organization`、`roles`、`groups`、`usageIdentity`、`generatedAt`、`orgVersion` 或 `scopeVersion`
- **THEN** 外部来源同步用户的 `displayName` MUST 优先使用平台组织主模型确认后的展示名，而不是通用账号友好名
- **THEN** 当当前用户配置了 `aicodex-api` 用量组织映射时，系统 MUST 返回 `apiOrganizationId`，且该字段表示用量侧组织 UUID 而不是 admin 权限域名称
- **THEN** 响应 MUST NOT 返回密码、访问令牌、刷新令牌、密钥、手机号明文或邮箱明文等敏感字段

#### Scenario: 未认证请求读取当前身份
- **WHEN** 请求缺少有效用户令牌或登录态
- **THEN** 系统 MUST 拒绝请求
- **THEN** 系统 MUST 返回稳定错误码 `UNAUTHENTICATED`

### Requirement: provider 必须由 admin 服务端计算 insight scope
系统 MUST 提供 `GET /api/admin-provider/insight/v1/current-user/scope`，由 admin 服务端根据当前用户、平台组织主模型、角色、部门管理关系、直属上级关系、生命周期、权限和用量用户映射计算 insight 可用 scope。

#### Scenario: 管理员获得全公司 scope
- **WHEN** 当前用户是全局管理员，或当前用户在所属 `organization/owner` 下 `IsAdmin=true`
- **THEN** 系统 MUST 返回该用户被授权组织范围内的 `scopeType=ALL_COMPANY`
- **THEN** 系统 MUST 在 scope 顶层返回当前调用人的 `adminUserId`，用于 insight 和 usage provider 审计
- **THEN** 系统 MUST 显式返回 `organization`、`includeChildDepartments=true`、`lifecycleStatus`、`generatedAt`、`scopeVersion` 或 `orgVersion`、`freshness`
- **THEN** 当当前用户配置了 `aicodex-api` 用量组织映射时，系统 MUST 在 scope 中返回 `apiOrganizationId`
- **THEN** 组织管理员 scope MUST NOT 覆盖到其他 organization

#### Scenario: 成功 scope 顶层返回调用人生命周期
- **WHEN** scope provider 返回任意成功的 `ALL_COMPANY`、`DEPARTMENT_TREE`、`SELF`、`CUSTOM_USERS` 或 `EMPTY` scope
- **THEN** 系统 MUST 在 scope 顶层返回当前调用人的 `lifecycleStatus`
- **THEN** 非 `ACTIVE` 或不可判定 lifecycle MUST NOT 被降级为更宽 scope

#### Scenario: 分组负责人获得部门树 scope
- **WHEN** 当前用户是一个或多个平台部门的负责人，且这些部门存在可查询成员
- **THEN** 系统 MUST 返回 `scopeType=DEPARTMENT_TREE`
- **THEN** 系统 MUST 返回当前用户可管理的 `departmentIds` 和展开后的 `adminUserIds`
- **THEN** 系统 MUST 返回 `departments[]`，且每个部门条目包含 `departmentId`、`adminUserIds`、`apiUserIds`、`includeChildDepartments`、`mappingStatus`、`lifecycleStatus` 和来源元数据
- **THEN** 顶层 `apiUserIds` MUST 是所有部门 `apiUserIds` 的去重并集

#### Scenario: 普通用户仅获得本人 scope
- **WHEN** 当前用户没有全局、组织、分组或自定义用户列表管理权限，但存在确定的本人用量用户映射
- **THEN** 系统 MUST 返回 `scopeType=SELF`
- **THEN** 系统 MUST 仅返回当前用户对应的 `adminUserIds` 和 `apiUserIds`

#### Scenario: 无可用范围返回空 scope
- **WHEN** 当前用户无法确定任何可查询范围，且不存在用量用户映射缺失、歧义、冲突或 provider 不可用
- **THEN** 系统 MUST 返回 `scopeType=EMPTY`
- **THEN** 系统 MUST NOT 通过空列表隐式表达 `ALL_COMPANY`

#### Scenario: 部门或全公司 scope 跳过缺失成员
- **WHEN** `DEPARTMENT_TREE`、`ALL_COMPANY` 或 `ORGANIZATION` scope 内部分成员缺少确定的 `aicodex-api` 用量用户 ID 映射
- **THEN** 系统 MUST 从返回给 insight 的 `apiUserIds` 中排除缺失成员
- **THEN** 系统 MUST 保留已成功映射成员的 `apiUserIds`
- **THEN** 系统 MUST NOT 因单个缺失成员拒绝整个部门或全公司 scope

#### Scenario: 精确 scope 映射缺失时拒绝报表 scope
- **WHEN** 当前用户的 `SELF` scope 或显式 `CUSTOM_USERS` scope 内必要用户缺少确定的 `aicodex-api` 用量用户 ID 映射，或映射存在一对多歧义
- **THEN** 系统 MUST 返回稳定错误码 `AUTHORIZATION_FAILED`
- **THEN** 系统 MUST 返回 `mappingStatus=MISSING` 或 `mappingStatus=AMBIGUOUS`
- **THEN** 系统 MUST NOT 将映射问题返回为 `scopeType=EMPTY`

#### Scenario: 关键组织状态冲突时拒绝扩权
- **WHEN** 当前用户、目标用户、部门、成员关系或 ExternalIdentity 处于 `CONFLICTED`、`DISABLED`、过期或生命周期不可判定状态
- **THEN** provider MUST 返回 `AUTHORIZATION_FAILED` 或 `PROVIDER_UNAVAILABLE`
- **THEN** provider MUST NOT 将该状态降级为全公司、部门树或其他更宽 scope
- **THEN** provider MUST NOT 将该错误场景伪装成业务成功的 `scopeType=EMPTY`

### Requirement: provider 必须提供可管理组织树
系统 MUST 提供 `GET /api/admin-provider/insight/v1/current-user/organization-tree`，返回当前用户可见或可管理的平台组织/部门树，供 insight 做部门筛选和展示。

#### Scenario: 用户有可管理组织树
- **WHEN** 当前用户拥有可管理的平台部门、分组兼容节点或组织节点
- **THEN** 系统 MUST 返回节点列表或树结构
- **THEN** 每个节点 MUST 包含 `departmentId`、`departmentName`、`parentDepartmentId`、`departmentPath`、`hasChildren`、`sourceType`、`sourceConnectionId` 或脱敏来源元数据、`lifecycleStatus`

#### Scenario: 直属上级关系不扩成部门子树
- **WHEN** 当前用户仅通过直属上级关系拥有可见下属
- **THEN** organization-tree provider MUST NOT 将这些下属关系推断为整棵部门树或部门子树权限
- **AND** 如果 provider 为展示返回部门节点，节点 MUST 只覆盖已确认下属所在的 enabled 部门，并 MUST NOT 自动包含祖先、兄弟或子孙部门

#### Scenario: 组织树 provider 返回版本化 envelope
- **WHEN** organization-tree provider 成功返回
- **THEN** 响应 MUST 保持现有 `InsightProviderEnvelope` 传输层
- **AND** 成功响应的 `data` MUST 提供组织树 read model envelope，包含 `organization`、`nodes[]`、`orgVersion` 或 `scopeVersion`、`freshness`、`generatedAt`、lineage metadata 和 `readModelSource`
- **AND** `orgVersion` 和 `scopeVersion` MUST 位于成功响应的 `data` 内，smoke 和 consumer MUST NOT 从顶层 envelope 读取这些字段
- **AND** `readModelSource` MUST 能区分 `platform_department`、`mixed_platform_group` 或 `compat_group`
- **AND** 响应 MUST NOT 暴露访问令牌、刷新令牌、密钥、手机号明文、邮箱明文或来源系统敏感配置

#### Scenario: 旧数组响应兼容
- **WHEN** 现有 consumer 仍按节点数组读取 organization-tree provider
- **THEN** 系统 MAY 通过明确的兼容响应形态或 consumer 兼容解包方式保留旧数组读取
- **AND** 新 envelope 字段 MUST 有明确迁移路径和退出条件
- **AND** 系统 MUST NOT 让同一个 JSON 字段同时承担数组和对象两种不兼容语义

#### Scenario: 组织树 lineage 脱敏且可诊断
- **WHEN** organization-tree provider 返回 lineage metadata
- **THEN** lineage MUST 至少能定位 `sourceService`、`sourceType`、`sourceConnectionId`、`batchId` 或 `sourceOrgVersion` 中可用的脱敏诊断字段
- **AND** lineage MUST NOT 包含来源租户密钥、访问令牌、Cookie、手机号、邮箱、完整原始响应体或客户真实组织明细

#### Scenario: 用户无可管理组织树
- **WHEN** 当前用户没有可管理分组或部门节点
- **THEN** 系统 MUST 返回空列表或空 `nodes[]`
- **THEN** 系统 MUST 将该场景作为业务空结果处理，而不是 provider 失败
- **AND** 该业务空结果 MUST 只用于 scope 已确定且无可见节点的场景，不能掩盖生命周期、映射、来源连接或 read model 不可信错误

#### Scenario: 业务空树仍返回可诊断版本 envelope
- **WHEN** 当前用户 scope 已可信确定且没有可管理组织树节点
- **THEN** provider MAY 返回空 `nodes[]` 和空 `list[]`
- **AND** 成功响应的 `data` MUST 仍包含非空 `scopeVersion` 或 `orgVersion`
- **AND** 成功响应的 `data` MUST 仍包含 `freshness`、`generatedAt`、`lineage.digest` 和 `readModelSource`
- **AND** 该空树结果 MUST NOT 被用作非空组织树能力 smoke 的通过依据

#### Scenario: 不可信组织树数据 fail closed
- **WHEN** 当前用户、部门、父子关系、成员关系、负责人关系、ExternalIdentity 或来源连接处于 disabled、deleted、conflicted、stale 或不可判定状态
- **THEN** provider MUST 排除该记录或返回稳定错误码
- **AND** provider MUST NOT 因兼容旧 Group、前端筛选或展示字段而扩大可见范围
- **AND** provider MUST NOT 将该错误场景伪装成全公司组织树或成功空树

### Requirement: 用量用户映射必须确定且可审计
系统 MUST 只使用明确配置或确定性字段返回 `aicodex-api` 用量用户 ID，MUST NOT 使用昵称、手机号、邮箱或展示名作为唯一映射 key。返回给 insight 的 `apiUserId` / `apiUserIds` 字段 MUST 是可转换为 `aicodex-api` 内部正整数用户 ID 的十进制字符串。

#### Scenario: 用户存在确定用量组织映射
- **WHEN** 当前 admin 用户存在明确的 `aicodex-api` 用量组织 UUID 映射
- **THEN** current-user provider 和 scope provider MUST 返回 `apiOrganizationId`
- **THEN** `apiOrganizationId` MUST 与 admin 的 `organization` 字段分开表达，避免把 admin 权限域名称误传给用量 provider

#### Scenario: 用户存在确定用量 ID 映射
- **WHEN** 当前 admin 用户存在明确的 `aicodex-api` 用量用户 ID 映射
- **THEN** current-user provider MUST 返回 `usageIdentity.apiUserId`
- **THEN** scope provider MUST 在对应范围内返回顶层 `apiUserIds`
- **THEN** 如果 scope 包含部门维度，scope provider MUST 返回 `departments[].apiUserIds`

#### Scenario: current-user 诊断用量 ID 映射缺失
- **WHEN** 当前 admin 用户缺少确定的 `aicodex-api` 用量用户 ID 映射
- **THEN** current-user provider MUST 返回 `usageIdentity.mappingStatus=MISSING`
- **THEN** current-user provider MUST NOT 返回猜测的 `usageIdentity.apiUserId`

#### Scenario: current-user 诊断用量 ID 格式非法
- **WHEN** 当前 admin 用户配置的 `aicodex-api` 用量用户 ID 不是正整数文本
- **THEN** current-user provider MUST 返回 `usageIdentity.mappingStatus=INVALID`
- **THEN** scope provider MUST 返回 `AUTHORIZATION_FAILED` 和 `mappingStatus=INVALID`
- **THEN** provider MUST NOT 返回该非法 `apiUserId` 或把映射失败降级为 `EMPTY`

### Requirement: provider 必须统一错误语义和审计日志

系统 MUST 为 Insight Admin Provider 提供稳定 HTTP status、错误码和 AI 可读脱敏审计日志，并支持普通 Provider JWT与已确认的Admin secure-handoff runtime credential。

#### Scenario: provider 参数或权限校验失败

- **WHEN** 请求 token、audience、issuer、scope、用户状态或权限校验失败
- **THEN** 系统 MUST 返回 `UNAUTHENTICATED`、`AUTHORIZATION_FAILED`、`INVALID_ARGUMENT` 或 `PROVIDER_UNAVAILABLE` 中的一个稳定错误码
- **THEN** 系统 MUST 返回可关联的 `traceId`
- **AND** 当 Admin 已保存 enabled `insight_provider_trust` runtime policy 时，audience、issuer 和 scope校验 MUST 使用 saved policy
- **AND** 当 Admin 已保存 disabled `insight_provider_trust` runtime policy 时，Provider MUST fail closed并返回 `AUTHORIZATION_FAILED`
- **AND** saved policy拒绝 token后，Provider MUST NOT 回退 legacy env/config

#### Scenario: provider 调用完成后写入审计日志

- **WHEN** current-user、scope 或 organization-tree Provider处理完成
- **THEN** 系统 MUST 写入结构化审计日志
- **THEN** 日志 MUST 至少包含 `traceId`、`adminUserId`、`organization`、`scopeType`、`groupCount`、`adminUserCount`、`apiUserCount`、`mappingStatus`、`status` 和 `errorCode`

#### Scenario: secure-handoff runtime credential调用Provider

- **WHEN** Insight使用已redeem并confirm、未过期且target/verifier有效的handoff runtime credential请求`current-user`、`current-user/scope`或`current-user/organization-tree`
- **THEN** `AutoSigninFilter` MUST在精确Provider路径执行专用credential验证并把只读身份claims传给Provider controller
- **AND** Provider controller MUST继续使用同一次typed `insight_provider_trust` snapshot校验audience、issuer和required scopes
- **AND** controller MUST加载credential绑定的真实Admin user并执行现有active-user与scope授权逻辑
- **AND** credential MUST NOT创建普通登录session或获得其它Admin API权限

#### Scenario: Provider路径无效Bearer返回稳定HTTP错误

- **WHEN** 三个Provider路径收到格式错误、签名/验证失败、过期、撤销、未confirm或授权不匹配的Bearer
- **THEN** 系统 MUST返回HTTP 401或403，而不是HTTP 200通用filter错误
- **AND** 响应 MUST使用`InsightProviderEnvelope`并包含`UNAUTHENTICATED`或`AUTHORIZATION_FAILED`稳定错误码和可关联trace id
- **AND** filter/controller/audit MUST NOT输出Bearer、credential material、Cookie、完整secretRef、私有URL或底层存储错误文本

#### Scenario: typed trust解析继续fail closed

- **WHEN** handoff credential本身有效但saved `insight_provider_trust`被disabled、配置store不可用、saved policy非法或audience/issuer/scope不匹配
- **THEN** Provider MUST返回HTTP 403和`AUTHORIZATION_FAILED`
- **AND** Provider MUST NOT回退到legacy env/config、普通OAuth lookup或session

#### Scenario: 认证分流保持兼容边界

- **WHEN** Provider路径收到非handoff Bearer
- **THEN** controller MUST继续执行现有JWT signature、Application、subject和typed trust校验
- **AND** `AutoSigninFilter` MUST NOT先把该Bearer作为OAuth database token吞掉
- **WHEN** 非Provider路径收到Bearer
- **THEN** 现有organization sync API key、OAuth access token和session行为 MUST保持不变

#### Scenario: current-user 缺少个人用量映射时返回成功诊断

- **WHEN** 已认证调用人的本地用量映射为`MISSING`，或saved resolver不可用且只能确认`mappingStatus=MISSING`
- **THEN** current-user MUST返回HTTP 200成功envelope和`usageIdentity.mappingStatus=MISSING`
- **AND** current-user MUST NOT猜测或返回`usageIdentity.apiUserId`
- **AND** resolver返回`INVALID`或`AMBIGUOUS`时 MUST继续fail closed
- **AND** typed `insight_provider_trust` saved disabled、store unavailable、invalid policy或认证失败 MUST继续返回`AUTHORIZATION_FAILED`，不得被该诊断语义降级

#### Scenario: handoff credential 使用已验证目标组织

- **WHEN** 内置全局管理员签发的有效handoff credential绑定一个非`built-in` target organization并请求current-user、scope或organization-tree
- **THEN** Provider MUST只从已验证credential auth context取得target organization
- **AND** current-user MUST保留真实签发者身份，但其`organization`、`apiOrganizationId`和组织版本上下文 MUST使用target organization
- **AND** scope与organization-tree MUST在target organization内计算确定范围
- **AND** handoff请求query MUST NOT覆盖credential target organization
- **AND** 普通JWT/session的既有组织解析和全局管理员query行为 MUST保持不变

#### Scenario: target organization 范围不伪造成员映射

- **WHEN** handoff credential target organization的`ALL_COMPANY`或`DEPARTMENT_TREE`范围包含已确认和缺失的成员映射
- **THEN** Provider MUST只在`apiUserIds`中包含该target organization内confirmed正整数映射成员
- **AND** Provider MUST排除缺失成员且不得因创建者属于`built-in`而混入其它组织成员
- **AND** `SELF`或显式`CUSTOM_USERS`必要成员为`MISSING`，以及任何`INVALID`/`AMBIGUOUS`映射 MUST继续fail closed

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

### Requirement: queryable scope 必须隔离非必要成员的 resolver 缺失

Admin provider MUST 在 `ALL_COMPANY`、`DEPARTMENT_TREE` 或 `ORGANIZATION` queryable scope 中隔离非必要成员的用量身份解析失败；当 resolver 对这些成员不可用且只能确认 `mappingStatus=MISSING` 时，provider MUST 排除未确定成员并保留已确定映射成员，MUST NOT 猜测 `apiUserId` 或扩大授权范围。

#### Scenario: 聚合 scope 跳过 unavailable 且 missing 的非必要成员

- **WHEN** 当前调用人的用量映射确定，queryable scope 内至少一个成员存在 confirmed 正整数 API user id，且其他非必要成员因 resolver unavailable 返回 `mappingStatus=MISSING`
- **THEN** provider MUST 返回成功的聚合 scope，并只在 `apiUserIds` 中包含已确定映射成员
- **THEN** provider MUST NOT 因这些非必要成员返回 `PROVIDER_UNAVAILABLE`

#### Scenario: 精确 scope 的 resolver unavailable 继续 fail closed

- **WHEN** `SELF` 或显式 `CUSTOM_USERS` scope 的必要用户因 resolver unavailable 返回 `mappingStatus=MISSING`
- **THEN** provider MUST 返回 `AUTHORIZATION_FAILED` 或 `PROVIDER_UNAVAILABLE`
- **THEN** provider MUST NOT 返回成功 scope 或猜测 `apiUserId`

#### Scenario: 非缺失型不确定映射不得被跳过

- **WHEN** queryable scope 成员的映射为 `INVALID`、`AMBIGUOUS` 或其他不能归类为 unavailable+missing 的不可信状态
- **THEN** provider MUST 保持 fail-closed
- **THEN** provider MUST NOT 把该状态转换为普通缺失成员或扩大可查询范围
