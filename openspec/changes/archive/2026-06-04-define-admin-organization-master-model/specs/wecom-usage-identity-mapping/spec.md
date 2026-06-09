## MODIFIED Requirements

### Requirement: admin 必须构造稳定的用量身份解析请求
系统 MUST 基于平台组织主模型、ExternalIdentity 和 admin 本地用户稳定身份，构造发往 aicodex-api 的用量身份解析请求。解析请求 MUST 使用稳定身份，MUST NOT 使用昵称、展示名、邮箱或手机号作为自动匹配 key。

#### Scenario: 企业微信同步用户构造解析身份
- **WHEN** admin 用户来自企业微信 source adapter 且存在确认的 ExternalIdentity
- **THEN** 系统 MUST 构造包含 `sourceConnectionId`、`externalSubjectId`、`sourceType=wecom` 和当前 admin 用户稳定 `adminSubject` 的解析身份
- **THEN** 系统 MAY 同时携带兼容字段 `wecomExternalId=wecom:{corpId}:{userid}` 供现有 api resolver 识别
- **THEN** 系统 MUST NOT 把用户展示名、邮箱或手机号作为 resolver 匹配字段发送给 api

#### Scenario: 用户存在手工用量 ID 映射
- **WHEN** admin 用户存在明确的 `aicodexApiUserId`、`aicodex_api_user_id` 或 `apiUserId`
- **THEN** 系统 MUST 先校验该值是正整数文本
- **THEN** 系统 MUST 将该手工映射作为兼容用量身份返回
- **THEN** 系统 MUST NOT 因该用户同时存在外部身份而覆盖手工映射

#### Scenario: 用户缺少可解析稳定身份
- **WHEN** admin 用户既没有合法手工用量 ID，也没有 `CONFIRMED` 的 ExternalIdentity
- **THEN** 系统 MUST 将该用户标记为 `mappingStatus=MISSING`
- **THEN** 系统 MUST NOT 使用姓名、邮箱、手机号或展示名猜测用量用户

#### Scenario: 外部身份冲突
- **WHEN** admin 用户的 ExternalIdentity 处于 `PENDING_REVIEW`、`DUPLICATE`、`CONFLICTED` 或 `DISABLED`
- **THEN** 系统 MUST 将用量身份映射标记为不可用于精确 scope
- **THEN** 系统 MUST NOT 把该身份发送为已确认 resolver 匹配条件

### Requirement: scope 计算必须批量解析企业微信用量身份
系统 MUST 在 Insight scope 计算中收集本次授权范围内需要解析的 admin 用户，去重后批量调用 aicodex-api resolver，并把解析结果回填到顶层和部门级 `apiUserIds`；该流程 SHALL 以平台 ExternalIdentity 为主，WeCom 兼容身份为过渡字段。

#### Scenario: 当前用户 scope 解析本人身份
- **WHEN** current-user 或 SELF scope 需要解析当前用户用量身份
- **THEN** 系统 MUST 对当前用户执行手工映射或 ExternalIdentity resolver 解析
- **THEN** 系统 MUST 在成功时返回当前用户对应的 `apiUserIds`

#### Scenario: 部门负责人 scope 解析部门成员身份
- **WHEN** 当前用户获得 `DEPARTMENT_TREE` scope
- **THEN** 系统 MUST 收集所有可查询部门成员的 admin 用户稳定 ID 和确认的 ExternalIdentity
- **THEN** 系统 MUST 在一次或有限批次 resolver 调用中解析这些用户
- **THEN** 系统 MUST 回填 `departments[].apiUserIds` 和顶层去重后的 `apiUserIds`

#### Scenario: 重叠部门成员去重
- **WHEN** 同一个 admin 用户出现在多个部门或多个授权路径中
- **THEN** 系统 MUST 在同一次 scope 请求内复用该用户的解析结果
- **THEN** 系统 MUST NOT 对同一用户重复调用 api resolver
