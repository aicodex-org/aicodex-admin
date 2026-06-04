## MODIFIED Requirements

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
- **THEN** 系统 MUST 显式返回 `organization`、`includeChildDepartments=true`、`generatedAt`、`scopeVersion` 或 `orgVersion`、`freshness`
- **THEN** 当当前用户配置了 `aicodex-api` 用量组织映射时，系统 MUST 在 scope 中返回 `apiOrganizationId`
- **THEN** 组织管理员 scope MUST NOT 覆盖到其他 organization

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

#### Scenario: 用户有可管理分组树
- **WHEN** 当前用户拥有可管理的分组或部门节点
- **THEN** 系统 MUST 返回节点列表或树结构
- **THEN** 每个节点 MUST 包含 `departmentId`、`departmentName`、`parentDepartmentId`、`departmentPath`、`hasChildren`、`sourceType`、`sourceConnectionId` 或脱敏来源元数据、`lifecycleStatus`

#### Scenario: 用户无可管理分组树
- **WHEN** 当前用户没有可管理分组或部门节点
- **THEN** 系统 MUST 返回空列表
- **THEN** 系统 MUST 将该场景作为业务空结果处理，而不是 provider 失败
