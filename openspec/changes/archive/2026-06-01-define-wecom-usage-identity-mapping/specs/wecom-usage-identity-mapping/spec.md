## ADDED Requirements

### Requirement: admin 必须构造稳定的用量身份解析请求
系统 MUST 基于企业微信同步数据和 admin 本地用户稳定身份，构造发往 aicodex-api 的用量身份解析请求。解析请求 MUST 使用稳定身份，MUST NOT 使用昵称、展示名、邮箱或手机号作为自动匹配 key。

#### Scenario: 企业微信同步用户构造解析身份
- **WHEN** admin 用户来自企业微信同步且存在 `corpId` 和 `userid`
- **THEN** 系统 MUST 构造 `wecomExternalId=wecom:{corpId}:{userid}`
- **THEN** 系统 MUST 同时携带当前 admin 用户稳定 `adminSubject`
- **THEN** 系统 MUST NOT 把用户展示名、邮箱或手机号作为 resolver 匹配字段发送给 api

#### Scenario: 用户存在手工用量 ID 映射
- **WHEN** admin 用户存在明确的 `aicodexApiUserId`、`aicodex_api_user_id` 或 `apiUserId`
- **THEN** 系统 MUST 先校验该值是正整数文本
- **THEN** 系统 MUST 将该手工映射作为兼容用量身份返回
- **THEN** 系统 MUST NOT 因该用户同时存在企业微信身份而覆盖手工映射

#### Scenario: 用户缺少可解析稳定身份
- **WHEN** admin 用户既没有合法手工用量 ID，也没有企业微信稳定身份
- **THEN** 系统 MUST 将该用户标记为 `mappingStatus=MISSING`
- **THEN** 系统 MUST NOT 使用姓名、邮箱、手机号或展示名猜测用量用户

### Requirement: scope 计算必须批量解析企业微信用量身份
系统 MUST 在 Insight scope 计算中收集本次授权范围内需要解析的 admin 用户，去重后批量调用 aicodex-api resolver，并把解析结果回填到顶层和部门级 `apiUserIds`。

#### Scenario: 当前用户 scope 解析本人身份
- **WHEN** current-user 或 SELF scope 需要解析当前用户用量身份
- **THEN** 系统 MUST 对当前用户执行手工映射或企业微信 resolver 解析
- **THEN** 系统 MUST 在成功时返回当前用户对应的 `apiUserIds`

#### Scenario: 部门负责人 scope 解析部门成员身份
- **WHEN** 当前用户获得 `DEPARTMENT_TREE` scope
- **THEN** 系统 MUST 收集所有可查询部门成员的 admin 用户稳定 ID
- **THEN** 系统 MUST 在一次或有限批次 resolver 调用中解析这些用户
- **THEN** 系统 MUST 回填 `departments[].apiUserIds` 和顶层去重后的 `apiUserIds`

#### Scenario: 重叠部门成员去重
- **WHEN** 同一个 admin 用户出现在多个部门或多个授权路径中
- **THEN** 系统 MUST 在同一次 scope 请求内复用该用户的解析结果
- **THEN** 系统 MUST NOT 对同一用户重复调用 api resolver

### Requirement: 映射状态必须确定且可审计
系统 MUST 对每个用量身份解析结果使用确定状态表达，不得把解析缺失、歧义、非法或服务不可用降级成 `EMPTY` scope。

#### Scenario: resolver 返回确定命中
- **WHEN** api resolver 对某个稳定身份返回唯一 `apiUserId`
- **THEN** 系统 MUST 将该用户标记为 `mappingStatus=OK`
- **THEN** 系统 MUST 在对应 scope 中返回该 `apiUserId`

#### Scenario: queryable scope 跳过缺失成员
- **WHEN** api resolver 对 `DEPARTMENT_TREE`、`ALL_COMPANY` 或 `ORGANIZATION` scope 中的部分成员返回 `MISSING`
- **THEN** scope provider MUST 跳过这些缺失成员
- **THEN** scope provider MUST 继续返回已成功解析成员的 `apiUserIds`
- **THEN** scope provider MUST NOT 把缺失成员伪装成已授权用量用户

#### Scenario: 精确 scope 返回缺失或歧义
- **WHEN** api resolver 对 `SELF` 或 `CUSTOM_USERS` scope 的必要用户返回 `MISSING` 或 `AMBIGUOUS`
- **THEN** scope provider MUST 返回 `AUTHORIZATION_FAILED`
- **THEN** 响应 MUST 包含对应 `mappingStatus`
- **THEN** 系统 MUST NOT 将该精确 scope 降级为 `EMPTY` 或部分成功

#### Scenario: resolver 不可用
- **WHEN** api resolver 超时、不可达或返回不符合契约的响应
- **THEN** scope provider MUST 返回 `PROVIDER_UNAVAILABLE`
- **THEN** 系统 MUST NOT 把 resolver 不可用误报为 `MISSING` 或 `EMPTY`

### Requirement: 映射调用必须具备服务间保护和 AI 可读日志
系统 MUST 通过服务间凭据调用 aicodex-api resolver，并为 current-user 和 scope 映射流程写入结构化审计日志。

#### Scenario: resolver 调用携带服务间凭据
- **WHEN** admin 调用 api 用量身份 resolver
- **THEN** 请求 MUST 携带配置的服务间凭据、`traceId` 和调用方标识
- **THEN** 请求 MUST 使用短超时和批量大小限制

#### Scenario: 映射审计日志写入
- **WHEN** current-user 或 scope provider 完成用量身份映射
- **THEN** 系统 MUST 写入可通过同一 `traceId` 关联的 AI 可读结构化日志
- **THEN** provider 审计日志 MUST 至少包含 `traceId`、`adminUserId`、`organization`、`scopeType`、`adminUserCount`、`apiUserCount`、`mappingStatus`、`status` 和 `errorCode`
- **THEN** resolver-client 审计日志 MUST 至少包含 `traceId`、`resolverBatchSize`、`resolverOkCount`、`resolverMissingCount`、`resolverAmbiguousCount`、`resolverInvalidCount`、`status`、`errorCode` 和 `durationMs`
- **THEN** 日志 MUST NOT 输出 access token、refresh token、client secret、手机号明文或邮箱明文
