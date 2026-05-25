# insight-admin-provider-wrapper Specification

## Purpose
TBD - created by archiving change add-insight-admin-provider-wrapper. Update Purpose after archive.
## Requirements
### Requirement: provider 必须提供当前 admin 用户身份
系统 MUST 提供 `GET /api/admin-provider/insight/v1/current-user`，用于让 `aicodex-insight` 只读获取当前登录 admin 用户的稳定身份、展示字段、角色、分组和用量用户映射状态。

#### Scenario: 已认证用户读取当前身份
- **WHEN** `aicodex-insight` 使用有效的 admin 用户访问令牌请求 current-user provider
- **THEN** 系统 MUST 返回当前用户的 `adminUserId`、`username`、`displayName`、`organization`、`roles`、`groups`、`usageIdentity` 和 `generatedAt`
- **THEN** 当当前用户配置了 `aicodex-api` 用量组织映射时，系统 MUST 返回 `apiOrganizationId`，且该字段表示用量侧组织 UUID 而不是 admin 权限域名称
- **THEN** 响应 MUST NOT 返回密码、访问令牌、刷新令牌、密钥、手机号明文或邮箱明文等敏感字段

#### Scenario: 未认证请求读取当前身份
- **WHEN** 请求缺少有效用户令牌或登录态
- **THEN** 系统 MUST 拒绝请求
- **THEN** 系统 MUST 返回稳定错误码 `UNAUTHENTICATED`

### Requirement: provider 必须由 admin 服务端计算 insight scope
系统 MUST 提供 `GET /api/admin-provider/insight/v1/current-user/scope`，由 admin 服务端根据当前用户、角色、分组管理关系、权限和用量用户映射计算 insight 可用 scope。

#### Scenario: 管理员获得全公司 scope
- **WHEN** 当前用户是全局管理员，或当前用户在所属 `organization/owner` 下 `IsAdmin=true`
- **THEN** 系统 MUST 返回该用户被授权组织范围内的 `scopeType=ALL_COMPANY`
- **THEN** 系统 MUST 在 scope 顶层返回当前调用人的 `adminUserId`，用于 insight 和 usage provider 审计
- **THEN** 系统 MUST 显式返回 `organization`、`includeChildDepartments=true`、`generatedAt` 和 `scopeVersion`
- **THEN** 当当前用户配置了 `aicodex-api` 用量组织映射时，系统 MUST 在 scope 中返回 `apiOrganizationId`
- **THEN** 组织管理员 scope MUST NOT 覆盖到其他 organization

#### Scenario: 分组负责人获得部门树 scope
- **WHEN** 当前用户是一个或多个分组的负责人，且这些分组存在可查询成员
- **THEN** 系统 MUST 返回 `scopeType=DEPARTMENT_TREE`
- **THEN** 系统 MUST 返回当前用户可管理的 `departmentIds` 和展开后的 `adminUserIds`
- **THEN** 系统 MUST 返回 `departments[]`，且每个部门条目包含 `departmentId`、`adminUserIds`、`apiUserIds`、`includeChildDepartments` 和 `mappingStatus`
- **THEN** 顶层 `apiUserIds` MUST 是所有部门 `apiUserIds` 的去重并集

#### Scenario: 普通用户仅获得本人 scope
- **WHEN** 当前用户没有全局、组织、分组或自定义用户列表管理权限，但存在确定的本人用量用户映射
- **THEN** 系统 MUST 返回 `scopeType=SELF`
- **THEN** 系统 MUST 仅返回当前用户对应的 `adminUserIds` 和 `apiUserIds`

#### Scenario: 无可用范围返回空 scope
- **WHEN** 当前用户无法确定任何可查询范围，且不存在用量用户映射缺失或歧义
- **THEN** 系统 MUST 返回 `scopeType=EMPTY`
- **THEN** 系统 MUST NOT 通过空列表隐式表达 `ALL_COMPANY`

#### Scenario: 用量用户映射缺失时拒绝报表 scope
- **WHEN** 当前用户或 scope 内必要用户缺少确定的 `aicodex-api` 用量用户 ID 映射，或映射存在一对多歧义
- **THEN** 系统 MUST 返回稳定错误码 `AUTHORIZATION_FAILED`
- **THEN** 系统 MUST 返回 `mappingStatus=MISSING` 或 `mappingStatus=AMBIGUOUS`
- **THEN** 系统 MUST NOT 将映射问题返回为 `scopeType=EMPTY`

### Requirement: provider 必须提供可管理组织树
系统 MUST 提供 `GET /api/admin-provider/insight/v1/current-user/organization-tree`，返回当前用户可见或可管理的组织/分组树，供 insight 做部门筛选和展示。

#### Scenario: 用户有可管理分组树
- **WHEN** 当前用户拥有可管理的分组或部门节点
- **THEN** 系统 MUST 返回节点列表或树结构
- **THEN** 每个节点 MUST 包含 `departmentId`、`departmentName`、`parentDepartmentId`、`departmentPath`、`hasChildren` 和 `sourceType`

#### Scenario: 用户无可管理分组树
- **WHEN** 当前用户没有可管理分组或部门节点
- **THEN** 系统 MUST 返回空列表
- **THEN** 系统 MUST 将该场景作为业务空结果处理，而不是 provider 失败

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
系统 MUST 为 insight admin provider 提供稳定错误码和 AI 可读审计日志，便于跨服务联调、排障和权限复盘。

#### Scenario: provider 参数或权限校验失败
- **WHEN** 请求 token、audience、scope、用户状态或权限校验失败
- **THEN** 系统 MUST 返回 `UNAUTHENTICATED`、`AUTHORIZATION_FAILED`、`INVALID_ARGUMENT` 或 `PROVIDER_UNAVAILABLE` 中的一个稳定错误码
- **THEN** 系统 MUST 返回可关联的 `traceId`

#### Scenario: provider 调用完成后写入审计日志
- **WHEN** current-user、scope 或 organization-tree provider 处理完成
- **THEN** 系统 MUST 写入结构化审计日志
- **THEN** 日志 MUST 至少包含 `traceId`、`adminUserId`、`organization`、`scopeType`、`groupCount`、`adminUserCount`、`apiUserCount`、`mappingStatus`、`status` 和 `errorCode`

