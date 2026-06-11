## MODIFIED Requirements

### Requirement: Subject 映射必须确定且 fail closed
系统 SHALL 只发布具有确定 gateway 主体映射的用户 subject。系统 MUST NOT 使用昵称、展示名、手机号、邮箱、Insight report scope 或部门报表 `apiUserIds` 作为 gateway `apiSubjectId` 的自动匹配来源。runtime projection SHALL 只消费一等 `PlatformApiUserMapping` 中经过确认的 `ApiUserId`；旧 `ExternalIdentity.Lineage.apiSubjectId`、`User.Properties.apiUserId` 或 `User.Properties.aicodexApiUserId` 只能作为迁移候选输入，不能在 runtime builder 中直接发布。

#### Scenario: 发布确定映射用户
- **WHEN** PlatformUser lifecycle 可判定且存在确定 `apiSubjectId`
- **THEN** builder SHALL 输出一个 `ProjectedSubject`
- **AND** `stableSubjectId` SHALL 使用 admin 稳定主体
- **AND** `apiSubjectId` SHALL 使用确定的 aicodex-api 主体 ID
- **AND** `departmentIds` SHALL 来自 active PlatformMembership 并去重排序
- **AND** `projectionVersion` SHALL 随主体 lifecycle、departmentIds、roleIds、positionIds 或 gateway orgVersion 变化而变化

#### Scenario: 缺少确定 apiSubjectId
- **WHEN** PlatformUser 缺少明确 `apiSubjectId`
- **THEN** builder SHALL NOT 为该用户猜测 gateway subject
- **AND** builder SHALL 在 summary 或审计日志中记录 `mapping_missing`
- **AND** publisher SHALL NOT 将缺失用户扩大为全公司、部门或默认 allow 事实

#### Scenario: active 外部身份不可信
- **WHEN** PlatformUser lifecycle 为 `ACTIVE`
- **AND** ExternalIdentity mappingStatus 为 `PENDING_REVIEW`、`DUPLICATE`、`CONFLICTED` 或 `DISABLED`
- **THEN** builder SHALL NOT 将该身份作为自动 join 或 active gateway subject 映射依据
- **AND** builder SHALL 记录对应 skipped reason

#### Scenario: 旧 lineage 不能作为 runtime publish 来源
- **WHEN** PlatformUser 存在旧 `ExternalIdentity.Lineage.apiSubjectId` 或旧 `User.Properties.apiUserId`
- **AND** 不存在同 `organizationId + adminSubject` 的 confirmed `PlatformApiUserMapping.ApiUserId`
- **THEN** builder SHALL NOT 发布该用户为 gateway subject
- **AND** builder SHALL 记录 `mapping_missing`

### Requirement: Projection observability smoke MUST be repeatable and sanitized
系统 SHALL 提供可重复的 smoke asset 或 runbook，用于 projection observability readiness 验证。smoke SHALL 默认保持只读；当 operator 已准备受控 publishable subject fixture 时，smoke MAY 通过私有环境变量启用 subject count 断言。

#### Scenario: Smoke validates readiness without leaking environment data
- **WHEN** 测试人员在已批准的测试环境运行 projection observability smoke
- **THEN** smoke SHALL 验证 service health、projection observability response shape、publisher/refresh enabled state、interval-vs-TTL diagnostic、latest audit visibility when available 和 sanitized field absence
- **AND** smoke SHALL 将 disabled/missing config 或 missing latest audit 记录为 runtime gap，而不是伪造成成功
- **AND** verification records SHALL 使用环境别名和变量名，不写具体环境地址、凭据或真实组织明细

#### Scenario: Smoke validates publishable subject fixture readiness
- **WHEN** 私有测试环境设置 `gatewayProjectionRequireLatestAudit=true`
- **AND** 设置 `gatewayProjectionMinSubjectCount` 为大于 `0` 的整数
- **THEN** smoke SHALL require latest publish audit 存在
- **AND** smoke SHALL fail closed when `latestPublish.subjectCount` 小于 `gatewayProjectionMinSubjectCount`
- **AND** 如果设置 `gatewayProjectionMinTombstoneSubjectCount`，smoke SHALL fail closed when `latestPublish.tombstoneSubjectCount` 小于该值
- **AND** smoke SHALL NOT print token、Cookie、真实账号、手机号、邮箱、完整组织结构或完整 gateway response
