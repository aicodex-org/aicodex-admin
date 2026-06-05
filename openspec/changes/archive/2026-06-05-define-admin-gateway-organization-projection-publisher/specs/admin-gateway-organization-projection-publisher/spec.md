## ADDED Requirements

### Requirement: Admin 必须构建 gateway projection batch
系统 SHALL 从 admin 平台组织主模型构建 `aicodex-api / ai-gateway` ingestion 可消费的 organization projection batch。该 batch SHALL 使用 gateway 专用 int64 `orgVersion`，并 SHALL 将 admin 字符串 `orgVersion` 保存在 `lineage.sourceVersion`，二者不得混用。

#### Scenario: 从平台主模型构建批次
- **WHEN** 平台组织存在 active PlatformUser、PlatformDepartment、PlatformMembership、SourceConnection、ExternalIdentity 和 OrgSyncBatch
- **THEN** admin projection builder SHALL 输出包含 `projectionBatchId`、int64 `orgVersion`、`generatedAt`、`freshness.expiresAt`、`lineage` 和 `subjects[]` 的 batch
- **AND** `lineage.sourceService` SHALL 等于 `aicodex-admin`
- **AND** `lineage.sourceVersion` SHALL 使用 admin source snapshot 字符串版本
- **AND** `lineage.digest` SHALL 使用 `sha256:<hex>` 格式

#### Scenario: 区分 admin source version 和 gateway projection version
- **WHEN** admin `PlatformVersionMetadata.OrgVersion` 或 `OrgSyncBatch.OrgVersion` 为 `orgv-*` 字符串
- **THEN** builder SHALL NOT 将该字符串转换或截断后写入 gateway `orgVersion`
- **AND** builder SHALL 生成独立 int64 gateway projection version
- **AND** builder SHALL 把原始 admin 字符串版本写入 `lineage.sourceVersion`

### Requirement: Subject 映射必须确定且 fail closed
系统 SHALL 只发布具有确定 gateway 主体映射的用户 subject。系统 MUST NOT 使用昵称、展示名、手机号、邮箱、Insight report scope 或部门报表 `apiUserIds` 作为 gateway `apiSubjectId` 的自动匹配来源。

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

#### Scenario: 外部身份不可信
- **WHEN** ExternalIdentity mappingStatus 为 `PENDING_REVIEW`、`DUPLICATE`、`CONFLICTED` 或 `DISABLED`
- **THEN** builder SHALL NOT 将该身份作为自动 join 或 gateway subject 映射依据
- **AND** builder SHALL 记录对应 skipped reason

### Requirement: Lifecycle 和 freshness 必须驱动投影安全边界
系统 SHALL 将 admin lifecycle 映射为 gateway lifecycle，并 SHALL 为 batch 与 subject 输出一致的 freshness 过期时间。不可判定 lifecycle MUST NOT 被映射为 active。

#### Scenario: 映射 lifecycle 状态
- **WHEN** PlatformUser lifecycleStatus 为 `ACTIVE`、`DISABLED`、`DELETED`、`CONFLICTED`、`UNKNOWN` 或 `STALE`
- **THEN** builder SHALL 分别输出 `active`、`disabled`、`deleted`、`conflicted`、`unknown` 或 `unknown`
- **AND** builder SHALL NOT 把空值、`UNKNOWN` 或 `STALE` 映射为 `active`

#### Scenario: 生成 freshness 过期时间
- **WHEN** builder 生成 projection batch
- **THEN** batch `freshness.expiresAt` SHALL 大于 `generatedAt`
- **AND** 每个 subject 的 `freshnessExpiresAt` SHALL 与 batch freshness 过期时间一致
- **AND** freshness 计算 SHALL 来自配置 TTL 或测试 fixture 固定时间

### Requirement: Publisher 必须使用服务间鉴权推送
系统 SHALL 使用独立服务间 Bearer token 调用 gateway projection ingestion endpoint。系统 MUST NOT 复用浏览器 session、普通 gateway token、Insight provider token 或用户 Cookie。

#### Scenario: 成功推送 projection batch
- **WHEN** publisher 已配置 gateway projection endpoint、projection token、caller 和 timeout
- **THEN** publisher SHALL 调用 `POST /api/gateway-organization-projection/v1/batches`
- **AND** 请求头 SHALL 包含 `Authorization: Bearer <projection-token>`
- **AND** 请求体 SHALL 包含 `caller=aicodex-admin`、`traceId` 和 projection batch
- **AND** 当 response 表示 `accepted=true` 或 `idempotent=true` 时，publisher SHALL 记录发布成功

#### Scenario: 拒绝不可重试错误
- **WHEN** gateway 返回鉴权失败、过期 freshness、旧 `orgVersion`、缺 lineage 或 invalid argument
- **THEN** publisher SHALL 将结果分类为不可自动重试的 contract/config/build 错误
- **AND** publisher SHALL 记录脱敏审计日志
- **AND** publisher SHALL NOT 生成新的 `projectionBatchId` 反复提交同一错误输入

#### Scenario: 可重试传输错误
- **WHEN** gateway 返回临时不可用、网络超时或 5xx
- **THEN** publisher MAY 在同一 `projectionBatchId` 和 `orgVersion` 下有限重试
- **AND** publisher SHALL 保持请求幂等
- **AND** publisher SHALL 在重试耗尽后报告 provider unavailable 或等价失败状态

### Requirement: Contract fixture 和验证记录必须脱敏
系统 SHALL 提供 gateway projection contract fixture 和可重复验证脚本，供 api agent 执行 contract test 和联调。fixture、脚本说明和 verification 记录 MUST NOT 包含真实环境 IP、私有 URL、token、Cookie、密码、客户端密钥、手机号、个人邮箱或客户真实数据。

#### Scenario: 生成 projection fixture
- **WHEN** change 提供 `fixtures/gateway-projection/projection-batch.json`
- **THEN** fixture SHALL 包含 api ingestion 所需字段
- **AND** fixture SHALL 使用脱敏组织、部门、用户和 token 占位符
- **AND** README SHALL 明确该 fixture 是 gateway projection contract，不是 Insight report scope

#### Scenario: 记录联调验证
- **WHEN** 记录 HTTP push、idempotency 或错误分类验证结果
- **THEN** verification SHALL 使用环境别名、占位符或环境变量形式表达 endpoint 和凭据
- **AND** verification SHALL 只记录路径、状态码、脱敏错误码、accepted/idempotent 结果和审计信号
- **AND** verification SHALL NOT 写入真实环境地址或敏感凭据
