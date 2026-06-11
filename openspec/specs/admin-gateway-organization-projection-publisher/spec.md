# admin-gateway-organization-projection-publisher Specification

## Purpose
定义 `aicodex-admin` 作为 gateway organization projection producer 的契约：从 admin 平台组织主模型构建 `aicodex-api / ai-gateway` 可消费的投影批次，使用服务间鉴权推送，并保证 fixture、验证记录和审计日志不泄漏环境或个人敏感信息。

## Requirements

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

#### Scenario: active 外部身份不可信
- **WHEN** PlatformUser lifecycle 为 `ACTIVE`
- **AND** ExternalIdentity mappingStatus 为 `PENDING_REVIEW`、`DUPLICATE`、`CONFLICTED` 或 `DISABLED`
- **THEN** builder SHALL NOT 将该身份作为自动 join 或 active gateway subject 映射依据
- **AND** builder SHALL 记录对应 skipped reason

### Requirement: PlatformUser mappingStatus 必须按 lifecycle 判定可信边界
系统 MUST 在 `PlatformUser.LifecycleStatus=ACTIVE` 时仅接受 `PlatformUser.MappingStatus=CONFIRMED`，将平台用户纳入 active gateway organization projection 候选主体。空值、未知值、待确认、重复、冲突或禁用状态 MUST fail closed，并记录 `mapping_untrusted` 或等价的跳过原因。对非 active lifecycle tombstone subject，系统 MAY 使用 `DISABLED` mapping 中已有的确定 `apiSubjectId` 表达撤销或收敛；其他非 confirmed/disabled mappingStatus MUST fail closed。

#### Scenario: 空 PlatformUser mappingStatus 不发布 subject
- **WHEN** PlatformUser lifecycle 为 `ACTIVE`，且存在 confirmed ExternalIdentity 可解析出 `apiSubjectId`
- **AND** PlatformUser 的 `MappingStatus` 为空
- **THEN** builder MUST NOT 发布该用户为 gateway `ProjectedSubject`
- **AND** builder MUST 记录 `mapping_untrusted`

#### Scenario: confirmed PlatformUser mappingStatus 仍需确定 apiSubjectId
- **WHEN** PlatformUser 的 `MappingStatus=CONFIRMED`
- **AND** 缺少确定的 `apiSubjectId`
- **THEN** builder MUST NOT 猜测 gateway subject
- **AND** builder MUST 记录 `mapping_missing`

#### Scenario: disabled PlatformUser mappingStatus 只可发布非 active tombstone
- **WHEN** PlatformUser lifecycle 为 `DISABLED`、`DELETED`、`CONFLICTED`、`UNKNOWN` 或 `STALE`
- **AND** PlatformUser 的 `MappingStatus=DISABLED`
- **AND** ExternalIdentity 中存在确定 `apiSubjectId`
- **THEN** builder MAY 发布对应 lifecycle tombstone subject
- **AND** builder SHALL NOT 将该主体发布为 active subject

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

#### Scenario: WeCom 同步成功后触发发布
- **WHEN** WeCom organization sync run 成功完成并且 gateway projection publisher 已启用
- **THEN** admin SHALL 基于当前平台组织主模型调用 gateway projection publisher
- **AND** 发布失败 SHALL 只记录脱敏 warning 或审计事件，不反向改写已成功的 WeCom sync run 终态

### Requirement: Admin 必须周期刷新 gateway projection freshness
系统 SHALL 提供可配置的 gateway projection refresh worker，周期性基于当前 admin 平台组织主模型重新发布 organization projection，使 gateway runtime projection freshness 在配置 TTL 内保持新鲜。

#### Scenario: refresh worker 启动门控
- **WHEN** `gatewayOrganizationProjectionEnabled=true` 且 refresh worker 已启用
- **THEN** admin SHALL 在进程启动后启动 gateway projection refresh worker
- **AND** worker SHALL 使用服务间 projection endpoint/token，不使用用户 session、Insight provider token 或 Cookie
- **AND** worker SHALL 在 endpoint/token 缺失时不执行发布，并记录脱敏配置错误

#### Scenario: refresh 周期小于 freshness TTL
- **WHEN** admin 读取 `gatewayOrganizationProjectionRefreshIntervalSeconds` 和 `gatewayOrganizationProjectionFreshnessTTLSeconds`
- **THEN** refresh interval SHALL 小于 freshness TTL
- **AND** 默认 refresh interval SHALL 不大于 900 秒
- **AND** 若配置的 interval 大于或等于 freshness TTL，系统 SHALL 使用安全默认值或拒绝启动 worker，并记录脱敏 warning

#### Scenario: 周期刷新当前组织 projection
- **WHEN** refresh worker 到达下一轮刷新时间
- **THEN** admin SHALL 枚举存在同步批次来源版本的 organizationId
- **AND** 对每个 organizationId 调用既有 `GatewayProjectionService.BuildAndPublishOrganization`
- **AND** organization source snapshot 未变化时，projection batch SHALL 保持同一个 gateway 专用 int64 `orgVersion`
- **AND** refresh batch SHALL 生成新的 `projectionBatchId`、`generatedAt`、`freshness.expiresAt`、subject `projectionVersion`、`lineage` 和 `subjects[]`
- **AND** admin SHALL NOT 从 Insight report scope、API 源库、gateway projection store 或外部组织原始表补算 projection

#### Scenario: 全量 refresh 包含 tombstone subjects
- **WHEN** admin 对当前组织执行全量 refresh
- **THEN** projection SHALL 包含全部具有可信 gateway subject 映射的 active subjects
- **AND** projection SHALL 对离职、删除、禁用、冲突或未知生命周期主体输出 lifecycle tombstone subject
- **AND** active subject SHALL 只接受 `CONFIRMED` mapping
- **AND** 非 active tombstone subject MAY 使用 `DISABLED` mapping 中已有的确定 `apiSubjectId` 表达撤销或收敛
- **AND** admin SHALL NOT 通过从 `subjects[]` 中省略主体来表达删除、禁用或离职
- **AND** 缺少可信 mapping 的主体 SHALL fail closed 并进入 skipped summary，而不是被猜测为 gateway subject

#### Scenario: refresh 幂等和不写授权事实
- **WHEN** worker 对同一 organizationId 周期性刷新 projection
- **THEN** admin SHALL 只发布 gateway organization projection 输入
- **AND** admin SHALL NOT 创建、更新或删除 gateway resource authorization facts
- **AND** admin SHALL NOT 写入权限矩阵或 runtime authorization audit
- **AND** 重复 publish SHALL 依赖 projection batch contract 和 gateway ingestion 幂等处理，不扩大授权范围

#### Scenario: refresh 运行日志脱敏
- **WHEN** worker 启动、跳过、成功、失败或完成一轮 refresh
- **THEN** 日志 SHALL 包含 traceId、organizationId、状态、错误码、accepted/idempotent 或统计摘要
- **AND** 日志 SHALL NOT 包含 projection token、Cookie、完整认证头、私有 URL、手机号、个人邮箱或完整敏感响应体

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

### Requirement: Admin MUST expose sanitized projection producer observability
系统 SHALL 提供 admin-only 诊断面，用于排查 gateway organization projection producer 的运行态 readiness。诊断面 SHALL 汇总 publisher 配置状态、refresh worker 状态、最近 publish audit、最近 refresh run、freshness window、lineage、subject counts 和 skip reason summary，且不得暴露凭据或原始下游响应。

#### Scenario: Projection observability returns sanitized readiness summary
- **WHEN** 具备权限的 admin operator 查询 projection producer observability
- **THEN** 响应 SHALL 包含 publisher 和 refresh worker 是否启用
- **AND** 响应 SHALL 包含 refresh interval、freshness TTL 以及 interval 是否小于 TTL
- **AND** 在存在最近发布记录时，响应 SHALL 包含 `projectionBatchId`、`orgVersion`、`lineage.sourceVersion`、`generatedAt`、`freshness.expiresAt`、subject counts、skip reason summary、status、stable error category、attempts、idempotency signal 和 `durationMs`
- **AND** 在存在最近 refresh run 时，响应 SHALL 包含 `lastRunAt`、`nextRunAt` 或 interval、`lastSuccessAt`、`lastFailureAt`、`lastFailureCategory`、published/failed/skipped counts 和 current freshness window
- **AND** 响应 SHALL NOT 包含 projection token、Authorization header、Cookie、私有 URL、手机号、个人邮箱、原始 gateway response body 或完整组织明细

#### Scenario: Projection observability stays within owner boundaries
- **WHEN** Admin UI、smoke script 或 runbook 查询 projection observability
- **THEN** Admin SHALL 只报告 admin-owned projection publishing 的 producer diagnostics
- **AND** Admin SHALL NOT 写入或推断 gateway resource authorization facts
- **AND** Admin SHALL NOT 将 admin 管理页面组织树 JSON 暴露为 API/gateway 授权输入
- **AND** Insight SHALL NOT 使用该诊断输出在本地计算 projection 或 authorization facts

### Requirement: Projection publish and refresh failures MUST use stable diagnostic categories
系统 SHALL 将 publisher、builder、source 和 refresh worker 失败映射为稳定、脱敏的诊断分类，供 smoke 和 handoff 排障使用。

#### Scenario: Failure category mapping is stable
- **WHEN** publisher config 缺失、gateway 不可用、gateway 拒绝 contract input、source data stale 或 disabled、mapping 不可信、lifecycle 不可信、lineage 无效、没有可发布主体或发生未知错误
- **THEN** diagnostics SHALL 报告 `projection_token_missing`、`gateway_unavailable`、`gateway_contract_mismatch`、`source_connection_stale`、`source_connection_disabled`、`mapping_untrusted`、`lifecycle_untrusted`、`lineage_invalid`、`no_publishable_subjects` 或 `unknown` 之一
- **AND** 日志和诊断响应 SHALL 只保留脱敏 code/category、status 和 counts
- **AND** 日志和诊断响应 SHALL NOT 包含原始凭据、私有 endpoint 或完整敏感 payload

### Requirement: Projection observability smoke MUST be repeatable and sanitized
系统 SHALL 提供可重复的 smoke asset 或 runbook，用于 projection observability readiness 验证。

#### Scenario: Smoke validates readiness without leaking environment data
- **WHEN** 测试人员在已批准的测试环境运行 projection observability smoke
- **THEN** smoke SHALL 验证 service health、projection observability response shape、publisher/refresh enabled state、interval-vs-TTL diagnostic、latest audit visibility when available 和 sanitized field absence
- **AND** smoke SHALL 将 disabled/missing config 或 missing latest audit 记录为 runtime gap，而不是伪造成成功
- **AND** verification records SHALL 使用环境别名和变量名，不写具体环境地址、凭据或真实组织明细
