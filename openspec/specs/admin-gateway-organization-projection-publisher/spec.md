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

### Requirement: Admin 不得单侧发明 projection payload contractVersion
Admin gateway projection payload versioning SHALL 与 API/gateway ingestion contract 保持一致。在 API/gateway owner 定义字段、兼容策略、mismatch 错误语义和 consumer 展示行为之前，Admin MUST NOT 单侧新增、要求或解释顶层 `contractVersion` 字段。

#### Scenario: 当前 payload 没有显式 contractVersion
- **WHEN** Admin 构建 gateway projection batch
- **THEN** payload SHALL 继续包含 `projectionBatchId`、gateway int64 `orgVersion`、`generatedAt`、`freshness`、`lineage` 和 `subjects[]`
- **AND** Admin SHALL NOT 将缺少 `contractVersion` 视为本地 build failure
- **AND** Admin fixture SHALL NOT 增加 API ingestion 尚未要求的 synthetic `contractVersion`

#### Scenario: 版本字段语义不混用
- **WHEN** operator、API owner 或 Insight consumer 排查 projection payload version
- **THEN** `lineage.sourceVersion` SHALL 表示 admin source snapshot version
- **AND** gateway `orgVersion` SHALL 表示 gateway projection ordering/freshness version
- **AND** subject `projectionVersion` SHALL 表示 subject content version
- **AND** 这些字段都 SHALL NOT 被记录为 payload schema `contractVersion`

#### Scenario: API 提出 contractVersion gap
- **WHEN** API/gateway owner 要求显式 payload `contractVersion` 或 `sourceContractVersion`
- **THEN** API/gateway owner SHALL 先定义字段名、可接受初始值、缺失字段兼容策略、mismatch 错误码和 provider/report 展示行为
- **AND** Admin SHALL 只在 API contract 被接受后，通过配对 Admin change 实现该字段
- **AND** Admin SHALL 更新 DTO、fixture、publisher tests、smoke assets 和 verification，且不改变 API/Insight owner boundaries

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

### Requirement: Platform API user mapping operator readiness 必须暴露可发布主体前置条件
Admin SHALL 提供面向 operator 的 `PlatformApiUserMapping` readiness 工作流，使授权 operator 能判断是否至少存在一个可发布 active 或 tombstone subject，且不读取 API/Insight 数据库、不写 gateway authorization facts。

#### Scenario: Operator 检查 active subject readiness
- **WHEN** operator 检查目标组织的 gateway projection publishability
- **THEN** Admin SHALL 暴露或记录 active publishable subject 需要匹配 `organizationId + adminSubject`
- **AND** `PlatformUser.LifecycleStatus` SHALL be `ACTIVE`
- **AND** `PlatformUser.MappingStatus` SHALL be `CONFIRMED`
- **AND** `PlatformApiUserMapping.MappingStatus` SHALL be `CONFIRMED`
- **AND** `PlatformApiUserMapping.ApiUserId` SHALL be non-empty
- **AND** source lineage, orgVersion/sourceVersion and freshness SHALL be available from Admin-owned source metadata

#### Scenario: Operator 检查 tombstone subject readiness
- **WHEN** operator 检查 disabled、deleted、conflicted、unknown 或 stale subject 的 tombstone projection readiness
- **THEN** Admin SHALL 暴露或记录生成 tombstone subject 所需的 non-active lifecycle 和 mapping state
- **AND** Admin SHALL 要求已有 confirmed 或 disabled mapping 继续提供确定的 `ApiUserId`
- **AND** Admin SHALL NOT 依赖 subject 缺失来表达删除

### Requirement: Platform API mapping diagnostics 必须保持 authority-safe
Admin SHALL 将 `PlatformApiUserMapping` 诊断和 operator 工作流限定在 Admin-owned identity mapping readiness 范围内。display metadata 和 legacy candidates MAY 用于诊断展示，但 MUST NOT 成为 projection/runtime join keys。

#### Scenario: Legacy 和 display 字段只作为诊断展示
- **WHEN** operator 看到 display name、phone、email、旧 `ExternalIdentity.Lineage.apiSubjectId`、旧 `User.Properties.apiUserId` 或旧 `User.Properties.aicodexApiUserId`
- **THEN** Admin SHALL 将这些值标记为 display、diagnostic 或 migration candidate data
- **AND** 除非同一 `organizationId + adminSubject` 已存在 confirmed `PlatformApiUserMapping.ApiUserId`，Admin SHALL NOT 将这些值发布为 `apiSubjectId`

#### Scenario: Mapping missing 可解释且不伪造成业务成功
- **WHEN** latest projection audit 存在 `subjectCount=0`，且 skipped subjects reason 为 `mapping_missing`
- **THEN** Admin SHALL 说明 producer observability 可诊断，但 publishable subject fixture 尚未就绪
- **AND** Admin SHALL NOT 将该状态描述为完整 projection 业务成功
- **AND** Admin SHALL 提供 operator remediation 所需的缺失 mapping 前置条件或 checklist

### Requirement: Operator workflow 必须支持低风险筛选和交接
Admin SHALL 提供 UI/API filters 或等价 runbook/checklist，使 operator 能在不暴露敏感标识的前提下定位 mapping readiness gaps。

#### Scenario: Operator 筛选 mapping readiness
- **WHEN** operator 排查 publishable subject readiness
- **THEN** Admin SHALL 支持按 organization、`mappingStatus`、keyword、conflict/duplicate state 和 publishable readiness category 筛选，或提供等价 documented checks
- **AND** diagnostics SHALL 区分 `mapping_missing`、`mapping_untrusted`、lifecycle not publishable、source metadata unavailable 和 lineage/freshness unavailable
- **AND** audit 或 smoke output SHALL 使用 counts、status 和 stable error codes，不输出 token、Cookie、真实账号、手机号、邮箱、完整组织树或完整 gateway response

### Requirement: Admin 必须提供 Platform API mapping readiness 只读诊断
Admin SHALL provide an admin-only read-only readiness diagnostic for `PlatformApiUserMapping` so operators can identify publishable subject prerequisites without writing mappings, gateway authorization facts, or API/Insight data.

#### Scenario: Operator reads readiness summary
- **WHEN** operator requests readiness diagnostics for an Admin organization
- **THEN** Admin SHALL return counts for `active_publishable`, `tombstone_publishable`, `mapping_missing`, `mapping_untrusted`, `lifecycle_not_publishable`, `source_metadata_unavailable` and `lineage_freshness_unavailable`
- **AND** the response SHALL include generatedAt and organization-scoped filter metadata
- **AND** the endpoint SHALL NOT create, update or confirm `PlatformApiUserMapping`

#### Scenario: Readiness classifies active publishable subjects
- **WHEN** a platform user has matching `organizationId + adminSubject`
- **AND** `PlatformUser.LifecycleStatus=ACTIVE`
- **AND** `PlatformUser.MappingStatus=CONFIRMED`
- **AND** confirmed `PlatformApiUserMapping.ApiUserId` is present
- **THEN** readiness SHALL classify the subject as `active_publishable`

#### Scenario: Readiness classifies tombstone publishable subjects
- **WHEN** a platform user has a non-active lifecycle that requires tombstone projection
- **AND** an existing confirmed or disabled mapping still provides deterministic `ApiUserId`
- **THEN** readiness SHALL classify the subject as `tombstone_publishable`
- **AND** readiness SHALL NOT rely on subject absence to express deletion

### Requirement: Readiness diagnostics 必须保持 authority-safe
Admin SHALL keep readiness diagnostics scoped to Admin-owned mapping and source metadata. The diagnostics MAY show display or legacy candidate values as operator hints, but MUST NOT treat them as runtime projection join keys.

#### Scenario: Legacy and display fields stay diagnostic-only
- **WHEN** a subject has displayName, phone, email, old `ExternalIdentity.Lineage.apiSubjectId`, old `User.Properties.apiUserId` or old `User.Properties.aicodexApiUserId`
- **AND** no confirmed `PlatformApiUserMapping.ApiUserId` exists for the same `organizationId + adminSubject`
- **THEN** readiness SHALL classify the subject as `mapping_missing` or another blocked reason
- **AND** readiness SHALL NOT infer `apiSubjectId` from those values

#### Scenario: Readiness response is sanitized for handoff
- **WHEN** readiness diagnostics are logged, documented or used in smoke/runbook output
- **THEN** Admin SHALL use counts, categories and stable reason codes
- **AND** Admin SHALL NOT print token、Cookie、真实账号、手机号、邮箱、完整组织树、完整响应体或完整 organizationId

### Requirement: Platform API mapping UI 必须支持 operator readiness 筛选
Admin web UI SHALL provide an operator-facing read-only readiness surface near the existing Platform API mapping management page.

#### Scenario: Operator filters readiness from mapping page
- **WHEN** operator opens the Platform API mapping page for an organization
- **THEN** the UI SHALL display readiness counts or an equivalent summary
- **AND** the UI SHALL allow filtering by readiness category, mapping status and keyword
- **AND** the UI SHALL explain that `subjectCount=0 + mapping_missing` means no publishable subject fixture is ready, not full projection business success

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

### Requirement: Projection observability MUST expose source freshness diagnostics
Admin SHALL expose sanitized source connection status/freshness diagnostics in projection producer observability so operators can distinguish source trust and freshness gaps without querying API, Insight, gateway stores, or raw source data.

#### Scenario: Latest publish reports source status and freshness distribution
- **WHEN** admin records latest gateway projection publish observability
- **THEN** diagnostics SHALL keep the existing `sourceConnectionStatus` compatibility field
- **AND** diagnostics SHALL include a structured source connection summary with total connection count
- **AND** diagnostics SHALL include status counts keyed by source connection `Status`
- **AND** diagnostics SHALL include freshness counts keyed by source connection `Freshness`
- **AND** diagnostics SHALL indicate whether stale, unavailable, or unknown freshness is present

#### Scenario: Source diagnostics stay sanitized
- **WHEN** operator, smoke, or runbook reads projection observability
- **THEN** source diagnostics SHALL include only counts, status/freshness enum values, stable category codes, and boolean summary signals
- **AND** diagnostics SHALL NOT include `sourceTenantId`, `metadata`, `configRef`, `secretRef`, projection token, Authorization header, Cookie, private endpoint, real account, phone, email, complete organization tree, or raw gateway response body

#### Scenario: Source freshness maps to stable diagnostic categories
- **WHEN** latest publish depends on disabled source connections
- **THEN** diagnostics SHALL prefer `source_connection_disabled`
- **WHEN** latest publish depends on stale or unavailable source freshness
- **THEN** diagnostics SHALL expose `source_connection_stale` unless a more direct publish result failure already exists
- **WHEN** latest publish has missing or unknown source freshness and no more specific category exists
- **THEN** diagnostics SHALL expose `unknown` rather than describing the projection as fully fresh

#### Scenario: Source diagnostics remain producer-only
- **WHEN** API/Gateway, Insight, smoke, or runbook consumers inspect Admin observability
- **THEN** source freshness diagnostics SHALL be treated only as Admin producer diagnostics
- **AND** Admin SHALL NOT write gateway authorization facts from these diagnostics
- **AND** API/Insight SHALL NOT consume Admin observability JSON to locally compute projection, authorization facts, report scope, or runtime allow/deny

### Requirement: Projection observability preflight MUST fail closed on stale runtime shape
Admin SHALL 提供只读 operator preflight，用于验证 gateway projection observability 的 source freshness 诊断 shape。该 preflight SHALL 判断已部署 Admin runtime 是否暴露当前 Admin 规格要求的 source freshness observability shape，并 SHALL 将缺部署、旧响应 shape 或缺 source freshness summary 分类为稳定 blocked alias，而不是完整成功。

#### Scenario: Preflight detects current source freshness shape
- **WHEN** operator preflight 读取到包含 `latestPublish.sourceConnectionStatus` 的脱敏 projection observability 响应
- **AND** 响应包含 `latestPublish.sourceConnectionSummary.total`、`statusCounts`、`freshnessCounts`、`hasStaleFreshness`、`hasUnavailableFreshness` 和 `hasUnknownFreshness`
- **THEN** preflight SHALL 返回 `status=ok`
- **AND** preflight SHALL NOT 输出 token、Cookie、private endpoint、source tenant metadata、secret refs、完整组织树或原始 gateway response body

#### Scenario: Preflight blocks old deployment shape
- **WHEN** operator preflight 读取到 latest publish audit 缺少 `sourceConnectionSummary` 或 freshness counts 的 projection observability 响应
- **THEN** preflight SHALL 返回 `status=blocked`
- **AND** preflight SHALL 暴露稳定 alias `environment_deploy_stale`
- **AND** preflight SHALL 说明 runtime shape 旧于 source freshness observability contract
- **AND** preflight SHALL NOT 将 smoke 描述为完整 projection 业务成功

#### Scenario: Preflight blocks missing latest audit without writes
- **WHEN** operator preflight 被配置为要求 latest publish audit
- **AND** projection observability 响应没有 `latestPublish.projectionBatchId`
- **THEN** preflight SHALL 返回 `status=blocked`
- **AND** preflight SHALL 暴露稳定 alias `environment_deploy_stale`
- **AND** preflight SHALL NOT 触发 publish、refresh、fixture 写入、API/Insight 数据库查询或 gateway authorization fact 写入

#### Scenario: Preflight preserves fixture readiness alias
- **WHEN** operator preflight 要求最小 publishable subject count
- **AND** latest publish audit 存在但 `subjectCount` 低于配置阈值
- **THEN** preflight SHALL 返回 `status=blocked`
- **AND** preflight SHALL 暴露稳定 alias `no_publishable_subjects`
- **AND** preflight SHALL 说明缺少 fixture readiness，而不是缺少部署 shape freshness diagnostics

### Requirement: Platform API mapping readiness 必须返回 operator remediation guidance
Admin SHALL include read-only operator remediation guidance in `PlatformApiUserMapping` readiness diagnostics so operators can map each readiness category to safe next actions without querying API/Insight databases, writing mappings, or creating gateway authorization facts.

#### Scenario: Readiness response includes category guidance
- **WHEN** operator requests `/api/get-platform-api-user-mapping-readiness` for an Admin organization
- **THEN** Admin SHALL return remediation guidance for `active_publishable`, `tombstone_publishable`, `mapping_missing`, `mapping_untrusted`, `lifecycle_not_publishable`, `source_metadata_unavailable` and `lineage_freshness_unavailable`
- **AND** each guidance item SHALL include a stable code, summary, operator action list, minimum unblock condition and owner-boundary warning
- **AND** the endpoint SHALL NOT create, update or confirm `PlatformApiUserMapping`

#### Scenario: Guidance distinguishes missing and untrusted mappings
- **WHEN** readiness counts include `mapping_missing` or `mapping_untrusted`
- **THEN** guidance SHALL explain that `mapping_missing` requires a same `organizationId + adminSubject` first-class `PlatformApiUserMapping.ApiUserId`
- **AND** guidance SHALL explain that `mapping_untrusted` requires confirmed platform user and API mapping statuses before the subject can become active publishable
- **AND** guidance SHALL NOT suggest using display name, phone, email, legacy lineage or user properties as runtime projection join keys

#### Scenario: Guidance preserves source and freshness boundaries
- **WHEN** readiness counts include `source_metadata_unavailable` or `lineage_freshness_unavailable`
- **THEN** guidance SHALL direct operators to Admin-owned source snapshot, org version, batch and freshness metadata checks
- **AND** guidance SHALL NOT instruct operators to query API/Insight/gateway stores or infer authorization facts from Admin diagnostics

#### Scenario: UI and runbook expose guidance safely
- **WHEN** operator views the Platform API mapping page or Bruno readiness runbook
- **THEN** the UI or runbook SHALL surface category remediation steps and minimum unblock conditions
- **AND** they SHALL state that `subjectCount=0 + mapping_missing` is fixture readiness missing, not full projection business success
- **AND** verification records SHALL use counts, category, stable code and alias rather than token, Cookie, real account, phone, email, complete organization tree, complete organizationId or full response body

### Requirement: Gateway projection readiness summary MUST guide operator handoff
Admin SHALL provide a read-only gateway projection readiness summary for operators so they can identify deployment shape, source freshness, mapping readiness and publishable subject prerequisites without writing fixtures, querying API/Insight databases, or creating gateway authorization facts.

#### Scenario: Summary combines observability and mapping readiness safely
- **WHEN** operator evaluates gateway projection readiness with an Admin observability response and optional `PlatformApiUserMapping` readiness response
- **THEN** the summary SHALL return a top-level `status`, stable alias list, sanitized counts, owner handoff guidance and minimum unblock conditions
- **AND** the summary SHALL include source freshness, mapping readiness, publishable subject prerequisites and deployment package prerequisites when those inputs are available
- **AND** the summary SHALL NOT print token, Cookie, private endpoint, real account, phone, email, complete organization tree, complete organizationId, source tenant metadata, configRef, secretRef or raw gateway response body

#### Scenario: Summary blocks stale deployment shape
- **WHEN** observability preflight reports missing latest audit while required, missing `sourceConnectionSummary`, missing freshness counts or missing freshness boolean signals
- **THEN** the summary SHALL return `status=blocked`
- **AND** the summary SHALL expose alias `environment_deploy_stale`
- **AND** owner handoff SHALL direct the operator to the Admin deploy/runtime owner with a minimum unblock condition requiring a package that returns the current observability shape
- **AND** the summary SHALL NOT describe the projection business path as complete

#### Scenario: Summary distinguishes mapping readiness from deployment readiness
- **WHEN** mapping readiness counts include `mapping_missing` or `mapping_untrusted`
- **THEN** the summary SHALL expose the corresponding mapping alias and remediation owner as Admin mapping operator
- **AND** guidance SHALL require same `organizationId + adminSubject` first-class `PlatformApiUserMapping.ApiUserId` and trusted mapping statuses
- **AND** guidance SHALL NOT suggest display name, phone, email, legacy lineage or user properties as runtime projection join keys

#### Scenario: Summary distinguishes source freshness and fixture prerequisites
- **WHEN** source freshness diagnostics are stale, unavailable or unknown
- **THEN** the summary SHALL expose Admin source/freshness owner handoff rather than asking API/Insight owners to compute projection locally
- **WHEN** subject count gates are enabled and latest publish audit has fewer subjects than required
- **THEN** the summary SHALL expose alias `no_publishable_subjects`
- **AND** guidance SHALL state that controlled fixture readiness is missing, not that deployment shape is stale

#### Scenario: Summary records not-checked inputs explicitly
- **WHEN** operator does not provide an organization alias or mapping readiness response
- **THEN** the summary SHALL mark mapping readiness as `not_checked`
- **AND** the summary SHALL provide the safe next read-only action for checking `/api/get-platform-api-user-mapping-readiness`
- **AND** the summary SHALL NOT query real databases, write fixture data or infer mapping readiness from display metadata

### Requirement: Gateway projection release decision guardrail MUST classify local evidence safely
Admin SHALL provide a local, read-only release decision guardrail for gateway projection operator handoff. The guardrail SHALL classify sanitized projection preflight/readiness evidence into stable decisions: `ready-for-controlled-smoke`, `blocked-by-source-freshness`, `blocked-by-mapping-readiness`, `blocked-by-contract-or-config`, or `not-checked`.

#### Scenario: Controlled smoke readiness is explicitly bounded
- **WHEN** observability preflight and readiness summary provide sanitized evidence with no blocking alias
- **AND** mapping readiness has been checked and is not blocked
- **THEN** the release decision SHALL be `ready-for-controlled-smoke`
- **AND** the decision SHALL state that local preflight/readiness evidence is not real publish success, gateway ingestion success, authorization fact success, or full projection business success

#### Scenario: Source freshness blockers map to source decision
- **WHEN** readiness evidence contains source freshness aliases such as `source_connection_stale`
- **THEN** the release decision SHALL be `blocked-by-source-freshness`
- **AND** the handoff SHALL direct operators to Admin-owned source/freshness checks rather than API/Insight/gateway stores

#### Scenario: Mapping blockers map to mapping decision
- **WHEN** readiness evidence contains `mapping_missing`, `mapping_untrusted`, `source_metadata_unavailable`, `lineage_freshness_unavailable`, or `lifecycle_not_publishable`
- **THEN** the release decision SHALL be `blocked-by-mapping-readiness`
- **AND** the handoff SHALL require first-class Admin mapping/source readiness conditions without using display name, phone, email, legacy lineage, or user properties as runtime join keys

#### Scenario: Contract, config and sanitization blockers fail closed
- **WHEN** evidence contains stale deployment shape, missing latest audit when required, subject fixture gate failure, unavailable response, unknown alias, or sensitive fields/values
- **THEN** the release decision SHALL be `blocked-by-contract-or-config`
- **AND** the decision SHALL expose only sanitized aliases, reasons, owners and minimum unblock conditions

#### Scenario: Missing required evidence remains not checked
- **WHEN** operator has not provided required readiness evidence such as mapping readiness
- **THEN** the release decision SHALL be `not-checked`
- **AND** the decision SHALL provide the next read-only action without querying real databases, writing fixtures, publishing projection, or creating gateway authorization facts

### Requirement: Gateway projection release decision MUST provide operator handoff guidance
Admin SHALL provide a local, read-only operator handoff summary for gateway projection release decisions. The handoff SHALL be derived from sanitized release decision evidence and SHALL expose stable next actions, owner boundaries, minimum unblock conditions and non-extrapolation boundaries without triggering publish, refresh, fixture writes or database mutations.

#### Scenario: Ready decision only releases controlled smoke preparation
- **WHEN** release decision is `ready-for-controlled-smoke`
- **THEN** handoff SHALL return `release=release_after_report`
- **AND** handoff SHALL state that the next action is controlled smoke preparation only
- **AND** handoff SHALL NOT describe the result as real publish success, gateway ingestion success, authorization facts success, or full projection business success

#### Scenario: Source freshness decision hands off to Admin source owner
- **WHEN** release decision is `blocked-by-source-freshness`
- **THEN** handoff SHALL direct the operator to the Admin source/freshness owner
- **AND** the minimum unblock condition SHALL require fresh Admin-owned source connection status, source snapshot, `OrgSyncBatch` or equivalent source version/freshness evidence
- **AND** handoff SHALL NOT ask API, Insight or Gateway owners to compute projection locally

#### Scenario: Mapping readiness decision hands off to Admin mapping owner
- **WHEN** release decision is `blocked-by-mapping-readiness`
- **THEN** handoff SHALL direct the operator to the Admin mapping operator or Admin source owner according to the alias
- **AND** the minimum unblock condition SHALL require first-class `PlatformApiUserMapping.ApiUserId`, trusted mapping statuses, lifecycle readiness or source metadata readiness
- **AND** handoff SHALL NOT suggest using display name, phone, email, legacy lineage or user properties as runtime projection join keys

#### Scenario: Contract and config decision fails closed
- **WHEN** release decision is `blocked-by-contract-or-config`
- **THEN** handoff SHALL keep `release=hold`
- **AND** handoff SHALL preserve stable aliases, owner guidance and minimum unblock conditions for stale deployment shape, missing latest audit, subject fixture gates, unavailable response, unknown alias or sanitization failure
- **AND** handoff SHALL NOT include token, Cookie, private endpoint, real account, phone, email, complete organization tree, complete organizationId, source tenant metadata, configRef, secretRef or raw gateway response body

#### Scenario: Not checked decision provides read-only next action
- **WHEN** release decision is `not-checked`
- **THEN** handoff SHALL keep `release=hold`
- **AND** handoff SHALL provide the next read-only action to collect sanitized observability, readiness summary and mapping readiness evidence
- **AND** handoff SHALL NOT query real databases, write fixtures, publish projection, refresh projection or create gateway authorization facts

### Requirement: Gateway projection controlled smoke preflight handoff MUST aggregate sanitized owner evidence
Admin SHALL provide a local, read-only controlled smoke preflight handoff for gateway projection operator coordination. The handoff SHALL aggregate sanitized Admin release decision evidence, Admin readiness/source freshness/mapping readiness evidence and API diagnostics decision evidence into stable decisions without triggering publish, refresh, fixture writes, database mutations, API/Insight queries or gateway authorization fact writes.

#### Scenario: Controlled smoke prep is explicitly bounded
- **WHEN** Admin release decision evidence is ready, Admin readiness/source freshness/mapping readiness evidence has no blocking alias, API diagnostics evidence is checked and clear, and all inputs are sanitized
- **THEN** the handoff SHALL return `decision=ready-for-controlled-smoke-prep`
- **AND** `release` SHALL be `release_after_report`
- **AND** the handoff SHALL state that this only permits controlled smoke preparation
- **AND** the handoff SHALL NOT describe the result as real publish success, gateway ingestion success, authorization facts success or full projection business success

#### Scenario: Admin release decision blocks controlled smoke prep
- **WHEN** Admin release decision evidence is `blocked`, `hold` or any decision other than the accepted controlled smoke readiness alias
- **THEN** the handoff SHALL return `decision=blocked-by-admin-release-decision`
- **AND** `ownerHandoffs` SHALL preserve the Admin release decision owner, alias and minimum unblock condition when available
- **AND** the handoff SHALL NOT ask API, Insight or Gateway owners to compute Admin projection locally

#### Scenario: Admin source freshness blocks controlled smoke prep
- **WHEN** Admin readiness evidence contains source freshness aliases such as `source_connection_stale`
- **THEN** the handoff SHALL return `decision=blocked-by-admin-source-freshness`
- **AND** the minimum unblock condition SHALL require Admin-owned source connection freshness, source snapshot, `OrgSyncBatch` or source version/freshness evidence to be clear
- **AND** the handoff SHALL NOT use API/Insight/gateway store data as substitute source freshness evidence

#### Scenario: Mapping readiness blocks controlled smoke prep
- **WHEN** Admin readiness evidence contains `mapping_missing`, `mapping_untrusted`, `source_metadata_unavailable`, `lineage_freshness_unavailable`, `lifecycle_not_publishable` or equivalent mapping readiness aliases
- **THEN** the handoff SHALL return `decision=blocked-by-mapping-readiness`
- **AND** the minimum unblock condition SHALL require first-class `PlatformApiUserMapping.ApiUserId`, trusted mapping statuses, lifecycle readiness or Admin source metadata readiness
- **AND** the handoff SHALL NOT suggest display name, phone, email, legacy lineage or user properties as runtime projection join keys

#### Scenario: API diagnostics blocks controlled smoke prep
- **WHEN** API diagnostics decision evidence reports a blocked, failed, stale, rejected or unknown diagnostics state
- **THEN** the handoff SHALL return `decision=blocked-by-api-diagnostics`
- **AND** `ownerHandoffs` SHALL direct the operator to the API diagnostics owner using only sanitized alias and minimum unblock condition
- **AND** Admin SHALL NOT query API databases, Insight databases, gateway stores, private URLs or raw API responses to resolve the blocker

#### Scenario: Contract or redaction problems fail closed
- **WHEN** required evidence is missing, contains unknown alias, contains token, Cookie, private endpoint, real account, phone, email, complete organization tree, complete organizationId, source tenant metadata, configRef, secretRef, raw gateway response body, full API diagnostics response or other credential-like data
- **THEN** the handoff SHALL return `decision=blocked-by-contract-or-redaction` or `decision=not-checked` according to the missing/invalid evidence type
- **AND** the output SHALL expose only stable aliases, sanitized owner guidance, minimum unblock conditions, `doNotDispatchUntil` and non-extrapolation boundaries
- **AND** the output SHALL NOT echo the sensitive value or complete response

#### Scenario: Not checked evidence provides read-only next action
- **WHEN** operator has not provided required Admin release decision, Admin readiness or API diagnostics evidence
- **THEN** the handoff SHALL return `decision=not-checked`
- **AND** `release` SHALL remain `hold`
- **AND** the next action SHALL request only read-only sanitized evidence collection
- **AND** the handoff SHALL NOT query real databases, write fixtures, publish projection, refresh projection or create gateway authorization facts

### Requirement: Gateway projection controlled smoke release runbook MUST summarize sanitized release evidence
Admin SHALL provide a local, read-only controlled smoke release runbook for gateway projection operator coordination. The runbook SHALL consume only sanitized evidence and handoff summaries, a release decision alias and a controlled smoke preflight alias, and SHALL return stable status, reason, operator next actions, missing prerequisites, hard red-line flags and redacted evidence hints without triggering publish, refresh, fixture writes, database mutations, API/Insight queries, gateway ingestion or gateway authorization fact writes.

#### Scenario: Runbook permits only controlled smoke preparation when evidence is ready
- **WHEN** the release decision alias is `ready-for-controlled-smoke`
- **AND** the controlled smoke preflight alias is `ready-for-controlled-smoke-prep`
- **AND** sanitized evidence summaries are present and contain no hard red-line signal
- **THEN** the runbook SHALL return `status=ready`
- **AND** the runbook SHALL include operator next actions for controlled smoke preparation only
- **AND** the runbook SHALL state that it is not real publish success, gateway ingestion success, authorization facts success or full projection business success

#### Scenario: Missing prerequisites fail closed
- **WHEN** the operator omits the release decision alias, preflight alias or required sanitized evidence summary
- **THEN** the runbook SHALL return `status=blocked`
- **AND** the runbook SHALL include stable missing prerequisite aliases and read-only next actions to collect sanitized release/preflight evidence
- **AND** the runbook SHALL NOT query real databases, write fixtures, publish projection, refresh projection, call API/Insight/Gateway stores or create gateway authorization facts

#### Scenario: Hard red-line signals block release runbook
- **WHEN** input evidence or operator notes contain real environment write signals, publish/ingestion/write/read-model rebuild/full-success intent, sensitive fields or complete responses
- **THEN** the runbook SHALL return `status=blocked`
- **AND** the runbook SHALL expose hard red-line flags using stable aliases such as `real_environment_write_signal`, `full_success_overclaim` or `sanitization_failed`
- **AND** the runbook SHALL NOT echo token, Cookie, private endpoint, real account, phone, email, complete organization tree, complete organizationId, source tenant metadata, configRef, secretRef, raw gateway response body or full API diagnostics response

#### Scenario: Blocking release or preflight aliases remain owner-scoped
- **WHEN** release decision or controlled smoke preflight evidence contains a blocked, hold, not-checked or unknown alias
- **THEN** the runbook SHALL return `status=blocked`
- **AND** the runbook SHALL preserve owner handoff and minimum unblock condition when available
- **AND** the runbook SHALL NOT ask API, Insight or Gateway owners to compute Admin projection locally or infer authorization facts from Admin diagnostics

#### Scenario: Redacted evidence hints are bounded
- **WHEN** the runbook includes evidence hints for audit
- **THEN** hints SHALL include only source alias, status, decision, stable alias, owner and minimum unblock condition
- **AND** hints SHALL NOT include raw evidence payloads, full response bodies, private URLs, credentials, real accounts or full organization identifiers

### Requirement: Gateway projection controlled smoke evidence readiness MUST fail closed
Admin SHALL provide a local, read-only controlled smoke evidence readiness helper for gateway projection operator coordination. The helper SHALL consume only sanitized evidence aliases and summaries for Admin release decision, controlled-smoke preflight, controlled-smoke release runbook, API diagnostics readiness/release runbook, redaction signal and blocking alias. It SHALL classify the evidence bundle into stable statuses without triggering publish, refresh, fixture writes, database mutations, API/Insight queries, gateway ingestion or gateway authorization fact writes.

#### Scenario: Evidence bundle is ready only for evidence review
- **WHEN** Admin release decision alias is `ready-for-controlled-smoke`
- **AND** controlled smoke preflight alias is `ready-for-controlled-smoke-prep`
- **AND** controlled smoke release runbook status is ready
- **AND** API diagnostics evidence is checked and clear
- **AND** all evidence is sanitized and contains no blocking alias or red-line signal
- **THEN** readiness SHALL return `status=ready-for-controlled-smoke-evidence-review`
- **AND** `release` SHALL be `release_after_report`
- **AND** readiness SHALL state that this only permits controlled smoke evidence review, not real publish success, gateway ingestion success, authorization facts success, API/Gateway/Insight success, production readiness or full-success

#### Scenario: Missing Admin evidence fails closed
- **WHEN** release decision, controlled smoke preflight or controlled smoke release runbook evidence is missing or not ready
- **THEN** readiness SHALL return `status=missing-admin-preflight`
- **AND** readiness SHALL preserve Admin owner handoff, stable blocking alias and minimum unblock condition when available
- **AND** readiness SHALL NOT ask API, Insight or Gateway owners to compute Admin projection locally

#### Scenario: Missing API diagnostics evidence fails closed
- **WHEN** API diagnostics readiness or release runbook evidence is missing, blocked, failed, stale, rejected or unknown
- **THEN** readiness SHALL return `status=missing-api-diagnostics`
- **AND** readiness SHALL direct the operator to the API diagnostics owner using only sanitized alias and minimum unblock condition
- **AND** Admin SHALL NOT query API databases, Insight databases, gateway stores, private URLs or raw API responses to resolve the blocker

#### Scenario: Redaction gaps fail closed
- **WHEN** evidence contains token, Cookie, private endpoint, real account, phone, email, complete organization tree, complete organizationId, source tenant metadata, configRef, secretRef, raw gateway/API response body, full diagnostics response or other credential-like data
- **THEN** readiness SHALL return `status=redaction-required`
- **AND** readiness SHALL expose only stable redaction aliases, owner guidance and minimum unblock conditions
- **AND** readiness SHALL NOT echo the sensitive value or complete response

#### Scenario: Red-line signals and real writes are blocked
- **WHEN** evidence or operator notes contain real publish, gateway ingestion, authorization facts, fixture/DB write, read model rebuild, mapping confirm or other real environment write signals
- **THEN** readiness SHALL return `status=red-line-blocked`
- **AND** readiness SHALL keep `release=hold`
- **AND** readiness SHALL instruct the operator to remove the write signal and recollect read-only sanitized evidence

#### Scenario: Full-success overclaim is blocked separately
- **WHEN** evidence or operator notes claim `full-success`, controlled smoke success, production readiness, API/Gateway/Insight success, real publish success, gateway ingestion success or authorization facts success
- **THEN** readiness SHALL return `status=overclaim-full-success`
- **AND** readiness SHALL keep `release=hold`
- **AND** readiness SHALL state that Admin evidence readiness cannot be used as downstream success proof

### Requirement: Gateway projection operator remediation handoff MUST map blockers to safe owner actions
Admin SHALL provide a local, read-only operator remediation handoff wrapper for gateway projection diagnostics. The wrapper SHALL consume only sanitized readiness summary, release decision, controlled smoke preflight/runbook/evidence readiness and source freshness aliases. It SHALL map common blocker aliases to stable remediation categories, owners, action lists, minimum unblock conditions and non-extrapolation boundaries without triggering publish, refresh, fixture writes, database mutations, mapping confirmation, API/Insight queries, gateway ingestion or gateway authorization fact writes.

#### Scenario: Mapping blockers route to Admin mapping operator
- **WHEN** sanitized evidence contains `mapping_missing`, `mapping_untrusted`, `source_metadata_unavailable`, `lineage_freshness_unavailable` or `lifecycle_not_publishable`
- **THEN** the handoff SHALL include a mapping remediation category
- **AND** owner SHALL be `admin_mapping_operator` or `admin_source_owner` according to the alias
- **AND** minimum unblock conditions SHALL require first-class `PlatformApiUserMapping.ApiUserId`, trusted mapping statuses, lifecycle readiness or Admin-owned source metadata
- **AND** the handoff SHALL NOT suggest display name, phone, email, legacy lineage or user properties as runtime projection join keys

#### Scenario: Source freshness blockers route to Admin source owner
- **WHEN** sanitized evidence contains `source_connection_stale`, `source_connection_unavailable` or `source_connection_unknown`
- **THEN** the handoff SHALL include a source freshness remediation category
- **AND** owner SHALL be `admin_source_owner`
- **AND** minimum unblock conditions SHALL require Admin-owned source connection freshness, source snapshot, `OrgSyncBatch` or source version/freshness evidence
- **AND** the handoff SHALL NOT ask API, Insight or Gateway owners to compute projection locally

#### Scenario: Deploy, refresh and contract blockers route to Admin runtime owners
- **WHEN** sanitized evidence contains publisher disabled, refresh disabled, stale deployment shape, contract mismatch, version mismatch or unavailable observability aliases
- **THEN** the handoff SHALL include deploy/runtime or contract remediation categories
- **AND** owner SHALL be `admin_deploy_owner`, `admin_runtime_owner` or `admin_contract_owner`
- **AND** the handoff SHALL instruct operators to redeploy/fix config/contract using read-only diagnostics before rerunning readiness
- **AND** it SHALL NOT trigger publish, refresh, read model rebuild, gateway ingestion or authorization facts

#### Scenario: Fixture prerequisites stay scoped to fixture owner
- **WHEN** sanitized evidence contains `no_publishable_subjects`, `active_fixture_missing`, `tombstone_fixture_missing` or equivalent empty subject gate aliases
- **THEN** the handoff SHALL include fixture remediation
- **AND** owner SHALL be `fixture_owner`
- **AND** minimum unblock conditions SHALL require an authorized controlled active/tombstone subject fixture before rerunning read-only checks
- **AND** the handoff SHALL state that empty subject evidence is not full projection business success

#### Scenario: Controlled smoke prerequisites stay evidence-scoped
- **WHEN** sanitized evidence contains controlled smoke preflight, release runbook or evidence readiness missing/blocking aliases
- **THEN** the handoff SHALL include controlled smoke evidence remediation
- **AND** owner SHALL be `admin_operator` or `api_diagnostics_owner` according to the missing evidence
- **AND** the handoff SHALL request only sanitized release decision, preflight, runbook or API diagnostics evidence
- **AND** it SHALL NOT record controlled smoke as passed or production-ready

#### Scenario: Sensitive or overclaimed evidence fails closed
- **WHEN** input contains token, Cookie, private endpoint, real account, phone, email, complete organization tree, complete organizationId, raw response body, real fixture/DB details, real write signals or full-success/API/Gateway/Insight success claims
- **THEN** the handoff SHALL return a blocked remediation status such as `redaction-required`, `red-line-blocked` or `overclaim-full-success`
- **AND** it SHALL NOT echo sensitive values or complete responses
- **AND** it SHALL keep `release=hold`

#### Scenario: Unknown blockers remain safe and actionable
- **WHEN** sanitized evidence contains an unrecognized blocker alias
- **THEN** the handoff SHALL include `unknown-admin-remediation`
- **AND** owner SHALL be `admin_operator`
- **AND** the action SHALL direct operators back to Admin projection readiness/runbook evidence collection
- **AND** the handoff SHALL NOT infer API, Insight or Gateway authorization facts

### Requirement: Gateway projection remediation result evidence handoff MUST gate the next review step
Admin SHALL provide a local, read-only remediation result evidence handoff wrapper for gateway projection operator coordination. The wrapper SHALL consume only sanitized alias, count and status summaries for mapping remediation, source freshness remediation, deploy/runtime shape, fixture or `subjectCount>=1` authorization, and controlled smoke evidence prerequisites. It SHALL return stable result fields and next safe action without triggering publish, refresh, fixture writes, database mutations, mapping confirmation, API/Insight queries, gateway ingestion or gateway authorization fact writes.

#### Scenario: Cleared mapping remediation still requires authoritative mapping evidence
- **WHEN** sanitized result evidence reports mapping remediation cleared
- **THEN** the handoff SHALL require aliases showing first-class `PlatformApiUserMapping.ApiUserId`, trusted mapping statuses and lifecycle readiness
- **AND** the handoff SHALL include the mapping evidence alias in `evidenceAliases`
- **AND** it SHALL NOT accept display name, phone, email, legacy lineage or user properties as runtime projection join keys

#### Scenario: Source freshness remediation must be Admin-owned
- **WHEN** sanitized result evidence reports source freshness remediation cleared
- **THEN** the handoff SHALL require Admin-owned source freshness, source snapshot, `OrgSyncBatch` or sourceVersion/freshness evidence aliases
- **AND** owner handoff SHALL remain scoped to `admin_source_owner` when evidence is missing or stale
- **AND** it SHALL NOT ask API, Insight or Gateway owners to compute projection locally

#### Scenario: Deploy and runtime shape must be confirmed
- **WHEN** sanitized result evidence reports deploy/runtime remediation cleared
- **THEN** the handoff SHALL require current Admin runtime shape or deploy confirmation aliases
- **AND** missing deploy/runtime confirmation SHALL block the next controlled smoke evidence review
- **AND** it SHALL NOT trigger publish, refresh, read model rebuild, gateway ingestion or authorization facts

#### Scenario: Fixture or subject authorization gap remains blocked
- **WHEN** fixture evidence is missing, not authorized, or `subjectCount>=1` is not proven by authorized controlled evidence
- **THEN** the handoff SHALL return a blocked status
- **AND** owner SHALL be `fixture_owner`
- **AND** minimum unblock conditions SHALL require authorized controlled active/tombstone subject fixture or sanitized subject count evidence before rerunning read-only checks
- **AND** the handoff SHALL state that empty subject evidence is not full projection business success

#### Scenario: Controlled smoke evidence review is allowed only after all local result evidence is clear
- **WHEN** mapping, source, deploy/runtime, fixture authorization and controlled smoke evidence prerequisites are all cleared by sanitized aliases
- **THEN** the handoff SHALL return `status=ready-for-controlled-smoke-evidence-review`
- **AND** `nextSafeAction` SHALL allow only the next controlled smoke evidence review or preflight step
- **AND** the handoff SHALL NOT describe the result as real publish success, gateway ingestion success, authorization facts success, API/Gateway/Insight success, production readiness or full-success

#### Scenario: Sensitive or overclaimed result evidence fails closed
- **WHEN** input contains token, Cookie, private endpoint, real account, phone, email, complete organization tree, complete organizationId, raw response body, real fixture/DB details, real write signals or full-success/API/Gateway/Insight success claims
- **THEN** the handoff SHALL return `status=redaction-required`, `status=red-line-blocked` or `status=overclaim-full-success`
- **AND** it SHALL NOT echo sensitive values or complete responses
- **AND** `nextSafeAction` SHALL remain blocked until the evidence is sanitized

#### Scenario: Unknown remediation result aliases remain safe
- **WHEN** sanitized result evidence contains an unrecognized alias
- **THEN** the handoff SHALL keep the result blocked
- **AND** owner SHALL be `admin_operator`
- **AND** minimum unblock conditions SHALL require replacing the unknown alias with a stable Admin owner result alias
- **AND** the handoff SHALL NOT infer API, Insight or Gateway authorization facts

### Requirement: Gateway projection controlled smoke execution handoff MUST remain local-only and fail closed
Admin SHALL provide a local, read-only controlled smoke execution handoff wrapper for gateway projection operator coordination. The wrapper SHALL consume only sanitized summaries from controlled smoke preflight, controlled smoke evidence readiness, controlled smoke release runbook, operator remediation handoff and remediation result evidence handoff. It SHALL return bounded execution-prep status, stable blocker/remediation aliases, missing prerequisites, operator actions, owner handoff limits, red-line flags, cannot-infer boundaries and evidence package metadata without triggering real endpoint calls, publish, refresh, fixture writes, database mutations, API/Insight queries, gateway ingestion, real gates or gateway authorization fact writes.

#### Scenario: Sanitized prerequisites allow bounded execution handoff only
- **WHEN** controlled smoke preflight is ready
- **AND** controlled smoke evidence readiness is ready for review
- **AND** controlled smoke release runbook is ready
- **AND** operator remediation handoff is ready or not required
- **AND** remediation result evidence handoff is ready for controlled smoke evidence review
- **AND** all inputs are sanitized summaries with no red-line signal
- **THEN** the handoff SHALL return `status=ready-for-controlled-smoke-execution`
- **AND** the handoff SHALL include evidence package metadata and operator actions for controlled smoke execution preparation only
- **AND** the handoff SHALL NOT describe real publish success, gateway ingestion success, authorization facts success, API/Gateway/Insight success, production readiness, controlled smoke pass or full-success

#### Scenario: Missing prerequisites fail closed
- **WHEN** preflight summary, evidence readiness summary, release runbook summary, operator remediation handoff summary or remediation result evidence handoff summary is missing or not ready
- **THEN** the handoff SHALL return `status=blocked` or `status=needs-user-action`
- **AND** `missingPrerequisites` SHALL include stable prerequisite aliases
- **AND** `blockerAlias` and `remediationAlias` SHALL preserve stable owner-scoped aliases when available
- **AND** operator actions SHALL request only read-only sanitized evidence collection or owner handoff completion

#### Scenario: Hard red-line inputs stop execution handoff
- **WHEN** input summaries or operator notes contain real fixture, DB write, production or production-like operation, real gate, publish, refresh, gateway ingestion, authorization facts, read model rebuild, mapping confirm, secret change or real endpoint execution intent
- **THEN** the handoff SHALL return `status=hard-red-line`
- **AND** `redLineFlags` SHALL include stable aliases such as `real_fixture_signal`, `real_db_write_signal`, `production_like_signal`, `real_gate_signal` or `real_environment_write_signal`
- **AND** the handoff SHALL NOT trigger any real network request, publish, fixture/DB write, gate or authorization fact change

#### Scenario: Sensitive values are never echoed
- **WHEN** input contains token, Cookie, private endpoint, real account, phone, email, complete organization tree, complete organizationId, source tenant metadata, configRef, secretRef, raw gateway/API response body, full diagnostics response or other credential-like data
- **THEN** the handoff SHALL return `status=blocked` or `status=hard-red-line`
- **AND** it SHALL expose only stable redaction aliases, owner guidance and minimum unblock conditions
- **AND** it SHALL NOT echo the sensitive value or complete response

#### Scenario: Cross-owner success overclaim is blocked
- **WHEN** input claims Gateway allow, API authorization report full-success, Insight success, production readiness, real publish success, gateway ingestion success, authorization facts success, controlled smoke success or full-success
- **THEN** the handoff SHALL return `status=hard-red-line`
- **AND** `cannotInferBoundaries` SHALL state that Admin execution handoff cannot infer API/Gateway/Insight success, production readiness or full-success
- **AND** the handoff SHALL keep owner handoff limits scoped to Admin-owned sanitized evidence and upstream owner summaries

#### Scenario: Unknown aliases remain owner scoped
- **WHEN** sanitized input contains an unrecognized blocker or remediation alias
- **THEN** the handoff SHALL return `status=blocked`
- **AND** `blockerAlias` or `remediationAlias` SHALL include `unknown_controlled_smoke_execution_alias`
- **AND** operator actions SHALL require replacing the unknown value with a stable Admin owner handoff alias before rerunning
- **AND** the handoff SHALL NOT infer API, Insight or Gateway authorization facts

### Requirement: Admin controlled smoke result evidence handoff 必须 fail closed

系统 SHALL 提供 Admin-owned 本地 controlled smoke result evidence handoff，用脱敏的 execution handoff summary、结果状态、结果 alias、计数摘要、redaction/风险分类和 operator next action 判断执行结果材料是否可交接。该 handoff SHALL NOT 触发真实 publish、Gateway ingestion、endpoint/provider token、fixture/DB 写入、真实 controlled smoke、gate 或 authorization fact 变更。

#### Scenario: Sanitized result evidence is ready for handoff
- **WHEN** execution handoff summary 已是 `ready-for-controlled-smoke-execution`
- **AND** result status 使用稳定的可交接状态，例如 `passed`, `passed-with-observations` 或 `ready-for-handoff`
- **AND** result aliases、sanitized counts 和 risk/redaction 分类一致且无敏感字段
- **THEN** the handoff SHALL return `status=ready-for-result-evidence-handoff`
- **AND** it SHALL include sanitized result aliases, counts summary, risk category, operator actions and owner handoff limits
- **AND** `cannotInferBoundaries` SHALL state that this result evidence handoff does not prove real publish, Gateway ingestion, API/Gateway/Insight success, authorization facts, production readiness, controlled smoke pass or full-success

#### Scenario: Missing, failed or partial result evidence is blocked
- **WHEN** execution handoff summary is missing, not ready, or result status is missing, failed, partial, blocked or unknown
- **THEN** the handoff SHALL return `status=blocked`
- **AND** it SHALL expose stable `blockerAlias`, `remediationAlias`, `operatorActions` and `doNotDispatchUntil`
- **AND** it SHALL request only read-only sanitized evidence collection or Admin owner remediation

#### Scenario: Redaction gaps and real signals are hard red-lines
- **WHEN** input contains token, Cookie, private endpoint, real account, phone, email, complete organization tree, complete organizationId, source tenant metadata, configRef, secretRef, raw gateway/API response body, full diagnostics response, real publish signal, real fixture/DB signal, production-like endpoint or credential-like data
- **THEN** the handoff SHALL return `status=hard-red-line` or `status=blocked`
- **AND** it SHALL expose only stable redaction aliases, owner guidance and minimum unblock conditions
- **AND** it SHALL NOT echo the sensitive value or complete response

#### Scenario: Counts and aliases must be consistent
- **WHEN** result aliases claim success but sanitized counts show failed, blocked, missing, unauthorized, mismatched or unknown result evidence
- **THEN** the handoff SHALL return `status=blocked`
- **AND** `blockerAlias` SHALL identify the count/alias inconsistency
- **AND** operator actions SHALL require replacing or recollecting the sanitized result evidence before rerunning

#### Scenario: Cross-owner success overclaim is blocked
- **WHEN** input claims Gateway allow, API authorization report full-success, Insight success, production readiness, real publish success, Gateway ingestion success, authorization facts success, controlled smoke pass or full-success
- **THEN** the handoff SHALL return `status=hard-red-line`
- **AND** `cannotInferBoundaries` SHALL state that Admin result evidence handoff cannot infer API/Gateway/Insight success, production readiness, controlled smoke pass or full-success
- **AND** the handoff SHALL keep owner handoff limits scoped to Admin-owned sanitized result evidence

### Requirement: Admin controlled smoke release summary handoff 必须 fail closed

系统 SHALL 提供 Admin-owned 本地 controlled smoke release summary handoff，用脱敏的 result evidence handoff summary、release summary status、release summary aliases、计数摘要、redaction/风险分类和 operator next action，将操作者提供的 controlled-smoke result/evidence summary 分类为 `release-summary`、`blocked`、`needs-user-action` 或 `hard-red-line`。该 handoff SHALL NOT 触发真实 publish、Gateway ingestion、endpoint/provider token、fixture/DB 写入、真实 controlled smoke、gate、mapping confirm 或 authorization fact 变更。

#### Scenario: Sanitized release summary is ready for handoff
- **WHEN** result evidence handoff summary 已是 `ready-for-result-evidence-handoff`
- **AND** release summary status 使用稳定的可交接状态，例如 `ready-for-handoff`、`summary-ready` 或 `release-summary-ready`
- **AND** release summary aliases、sanitized counts 和 risk/redaction 分类一致且无敏感字段
- **THEN** the handoff SHALL return `status=ready-for-release-summary-handoff`
- **AND** `classification` SHALL be `release-summary`
- **AND** it SHALL include sanitized release summary aliases, counts summary, risk category, operator actions, owner handoff limits and minimum unblock conditions
- **AND** `cannotInferBoundaries` SHALL state that this release summary handoff does not prove real publish, Gateway ingestion, API/Gateway/Insight success, authorization facts, production readiness, controlled smoke pass or full-success

#### Scenario: Missing or blocked result evidence remains blocked
- **WHEN** result evidence handoff summary is missing, not ready, blocked, failed, partial or unknown
- **THEN** the handoff SHALL return `status=blocked`
- **AND** `classification` SHALL be `blocked`
- **AND** it SHALL preserve stable upstream blocker/remediation aliases, owner handoff and minimum unblock condition when available
- **AND** it SHALL request only read-only sanitized evidence collection or Admin owner remediation

#### Scenario: Needs user action is preserved
- **WHEN** release summary status or aliases indicate `needs-user-action`
- **THEN** the handoff SHALL return `status=needs-user-action`
- **AND** it SHALL preserve stable `blockerAlias`, `remediationAlias`, owner handoff and minimum unblock condition
- **AND** it SHALL NOT downgrade the state to release-ready or claim controlled smoke success

#### Scenario: Redaction gaps and real signals are blocked
- **WHEN** input contains token, Cookie, private endpoint, real account, phone, email, complete organization tree, complete organizationId, source tenant metadata, configRef, secretRef, raw gateway/API response body, full diagnostics response, real publish signal, Gateway ingestion signal, authorization facts signal, real fixture/DB signal, production-like endpoint or credential-like data
- **THEN** the handoff SHALL return `status=blocked` or `status=hard-red-line`
- **AND** it SHALL expose only stable redaction aliases, owner guidance and minimum unblock conditions
- **AND** it SHALL NOT echo the sensitive value or complete response

#### Scenario: Counts and aliases must be consistent
- **WHEN** release summary aliases claim ready but sanitized counts show blocked, needs-user-action, hard-red-line, missing, mismatched or unknown release summary sections
- **THEN** the handoff SHALL return `status=blocked`
- **AND** `blockerAlias` SHALL identify the count/alias inconsistency
- **AND** operator actions SHALL require replacing or recollecting the sanitized release summary before rerunning

#### Scenario: Cross-owner success overclaim is hard red-line
- **WHEN** input claims Gateway allow, API authorization report full-success, Insight success, production readiness, real publish success, Gateway ingestion success, authorization facts success, controlled smoke pass or full-success
- **THEN** the handoff SHALL return `status=hard-red-line`
- **AND** `classification` SHALL be `hard-red-line`
- **AND** `cannotInferBoundaries` SHALL state that Admin release summary handoff cannot infer API/Gateway/Insight success, production readiness, controlled smoke pass or full-success
- **AND** the handoff SHALL keep owner handoff limits scoped to Admin-owned sanitized release summary evidence

#### Scenario: Unknown release summary aliases remain safe
- **WHEN** sanitized release summary contains an unrecognized alias
- **THEN** the handoff SHALL keep the result blocked
- **AND** owner SHALL be `admin_operator`
- **AND** minimum unblock conditions SHALL require replacing the unknown alias with a stable Admin owner release summary alias
- **AND** the handoff SHALL NOT infer API, Insight or Gateway authorization facts

### Requirement: Admin controlled smoke operator triage handoff 必须 fail closed

系统 SHALL 提供 Admin-owned 本地 controlled smoke operator triage handoff，用脱敏的 release summary handoff summary、result evidence handoff summary、operator note 和 operator metadata 生成 operator 可执行 triage package。该 handoff SHALL NOT 触发真实 publish、真实 controlled smoke、Gateway ingestion、endpoint/provider token、fixture/DB 写入、mapping confirm、gate 或 authorization fact 变更。

#### Scenario: Sanitized release summary allows operator triage handoff
- **WHEN** release summary handoff summary 已是 `ready-for-release-summary-handoff`
- **AND** result evidence handoff summary 已是 `ready-for-result-evidence-handoff`
- **AND** 输入只包含脱敏 status、stable alias、counts、owner handoff limits、risk/redaction 分类和不能外推边界
- **THEN** the handoff SHALL return `status=ready-for-operator-triage-handoff`
- **AND** it SHALL include `nextSteps`、`ownerHandoffLimits`、`minimumUnblockConditions`、`triagePackageMetadata`、`doNotDispatchUntil` and `cannotInferBoundaries`
- **AND** `cannotInferBoundaries` SHALL state that this triage package does not prove real publish, Gateway ingestion, API/Gateway/Insight success, authorization facts, production readiness, controlled smoke pass or full-success

#### Scenario: Blocked release summary remains blocked
- **WHEN** release summary handoff summary is missing, blocked, failed, partial or unknown
- **THEN** the handoff SHALL return `status=blocked`
- **AND** it SHALL preserve stable upstream `blockerAlias`, `remediationAlias`, owner handoff and minimum unblock condition when available
- **AND** it SHALL request only read-only sanitized evidence collection or Admin owner remediation

#### Scenario: Needs user action is preserved for operator
- **WHEN** release summary handoff summary or aliases indicate `needs-user-action`
- **THEN** the handoff SHALL return `status=needs-user-action`
- **AND** it SHALL preserve stable `blockerAlias`, `remediationAlias`, owner handoff and minimum unblock condition
- **AND** it SHALL NOT downgrade the state to ready or claim controlled smoke success

#### Scenario: Hard red-line inputs stop operator triage
- **WHEN** input summaries, operator note or metadata contain real publish, real controlled smoke, Gateway ingestion, authorization facts, fixture/DB, production-like endpoint, real gate, mapping confirm, read model rebuild, credential-like data or full-success/API/Gateway/Insight success claims
- **THEN** the handoff SHALL return `status=hard-red-line`
- **AND** `redLineFlags` SHALL include stable aliases such as `real_publish_signal`, `real_controlled_smoke_signal`, `gateway_ingestion_signal`, `authorization_facts_signal`, `real_fixture_signal`, `real_db_write_signal`, `production_like_signal` or `full_success_overclaim`
- **AND** the handoff SHALL NOT trigger any real network request, publish, fixture/DB write, gate or authorization fact change

#### Scenario: Sensitive values are never echoed
- **WHEN** input contains token, Cookie, private endpoint, real account, phone, email, complete organization tree, complete organizationId, source tenant metadata, configRef, secretRef, raw gateway/API response body, full diagnostics response or other credential-like data
- **THEN** the handoff SHALL return `status=blocked` or `status=hard-red-line`
- **AND** it SHALL expose only stable redaction aliases, owner guidance and minimum unblock conditions
- **AND** it SHALL NOT echo the sensitive value or complete response

#### Scenario: Unknown triage aliases remain owner scoped
- **WHEN** sanitized input contains an unrecognized release summary, result evidence, blocker or remediation alias
- **THEN** the handoff SHALL keep the result blocked
- **AND** owner SHALL be `admin_operator`
- **AND** minimum unblock conditions SHALL require replacing the unknown alias with a stable Admin owner handoff alias
- **AND** the handoff SHALL NOT infer API, Insight or Gateway authorization facts

### Requirement: Admin controlled smoke operator decision handoff 必须 fail closed

系统 SHALL 提供 Admin-owned 本地 controlled smoke operator decision handoff，用脱敏的 operator triage handoff summary、result evidence handoff summary、controlled smoke execution handoff summary、release summary handoff summary、operator note 和 operator metadata 生成 operator decision package。该 handoff SHALL NOT 触发真实 publish、真实 controlled smoke、Gateway ingestion、endpoint/provider token、fixture/DB 写入、mapping confirm、gate 或 authorization fact 变更。

#### Scenario: Sanitized handoff summaries allow operator decision handoff
- **WHEN** operator triage handoff summary 已是 `ready-for-operator-triage-handoff`
- **AND** result evidence handoff summary 已是 `ready-for-result-evidence-handoff`
- **AND** controlled smoke execution handoff summary 已是 `ready-for-controlled-smoke-execution`
- **AND** release summary handoff summary 已是 `ready-for-release-summary-handoff`
- **AND** 输入只包含脱敏 status、stable alias、counts、owner handoff limits、risk/redaction 分类和不能外推边界
- **THEN** the handoff SHALL return `status=ready-for-operator-decision-handoff`
- **AND** it SHALL include `nextAdminAction`、`nextSteps`、`ownerHandoffLimits`、`minimumUnblockConditions`、`decisionPackageMetadata`、`doNotDispatchUntil` and `cannotInferBoundaries`
- **AND** `cannotInferBoundaries` SHALL state that this decision package does not prove real publish, real controlled smoke, Gateway ingestion, API/Gateway/Insight success, authorization facts, production readiness, controlled smoke pass or full-success

#### Scenario: Blocked upstream handoff remains blocked
- **WHEN** operator triage, result evidence, execution or release summary handoff summary is missing, blocked, failed, partial or unknown
- **THEN** the handoff SHALL return `status=blocked`
- **AND** it SHALL preserve stable upstream `blockerAlias`, `remediationAlias`, owner handoff and minimum unblock condition when available
- **AND** it SHALL request only read-only sanitized evidence collection or Admin owner remediation

#### Scenario: Needs user action is preserved for operator decision
- **WHEN** any input handoff summary or aliases indicate `needs-user-action`
- **THEN** the handoff SHALL return `status=needs-user-action`
- **AND** it SHALL preserve stable `blockerAlias`, `remediationAlias`, owner handoff and minimum unblock condition
- **AND** it SHALL NOT downgrade the state to ready or claim controlled smoke success

#### Scenario: Hard red-line inputs stop operator decision
- **WHEN** input summaries, operator note or metadata contain real publish, real controlled smoke, Gateway ingestion, authorization facts, fixture/DB, production-like endpoint, real gate, mapping confirm, read model rebuild, credential-like data or full-success/API/Gateway/Insight success claims
- **THEN** the handoff SHALL return `status=hard-red-line`
- **AND** `redLineFlags` SHALL include stable aliases such as `real_publish_signal`, `real_controlled_smoke_signal`, `gateway_ingestion_signal`, `authorization_facts_signal`, `real_fixture_signal`, `real_db_write_signal`, `production_like_signal` or `full_success_overclaim`
- **AND** the handoff SHALL NOT trigger any real network request, publish, fixture/DB write, gate or authorization fact change

#### Scenario: Sensitive values are never echoed
- **WHEN** input contains token, Cookie, private endpoint, real account, phone, email, complete organization tree, complete organizationId, source tenant metadata, configRef, secretRef, raw gateway/API response body, full diagnostics response or other credential-like data
- **THEN** the handoff SHALL return `status=blocked` or `status=hard-red-line`
- **AND** it SHALL expose only stable redaction aliases, owner guidance and minimum unblock conditions
- **AND** it SHALL NOT echo the sensitive value or complete response

#### Scenario: Unknown decision aliases remain owner scoped
- **WHEN** sanitized input contains an unrecognized triage, result evidence, execution, release summary, blocker or remediation alias
- **THEN** the handoff SHALL keep the result blocked
- **AND** owner SHALL be `admin_operator`
- **AND** minimum unblock conditions SHALL require replacing the unknown alias with a stable Admin owner handoff alias
- **AND** the handoff SHALL NOT infer API, Insight or Gateway authorization facts

### Requirement: Admin controlled smoke operator action handoff 必须 fail closed

系统 SHALL 提供 Admin-owned 本地 controlled smoke operator action handoff，用脱敏的 operator decision handoff summary、operator note 和 operator metadata 生成 owner-safe operator action package。该 handoff SHALL NOT 触发真实 publish、真实 controlled smoke、Gateway ingestion、endpoint/provider token、fixture/DB 写入、mapping confirm、read model rebuild、gate 或 authorization fact 变更。

#### Scenario: Sanitized decision package allows operator action handoff
- **WHEN** operator decision handoff summary 已是 `ready-for-operator-decision-handoff`
- **AND** 输入只包含脱敏 status、stable alias、counts、owner handoff limits、risk/redaction 分类和不能外推边界
- **THEN** the handoff SHALL return `actionStatus=ready-for-operator-action`
- **AND** it SHALL include `nextAction`、`blockerAlias`、`ownerHandoffLimits`、`minimumUnblockConditions`、`actionPackageMetadata`、`doNotDispatchUntil` and `cannotInferBoundaries`
- **AND** `cannotInferBoundaries` SHALL state that this action package does not prove real publish, real controlled smoke, Gateway ingestion, API/Gateway/Insight success, authorization facts, production readiness, controlled smoke pass or full-success

#### Scenario: Blocked decision package remains blocked
- **WHEN** operator decision handoff summary is missing, blocked, failed, partial or unknown
- **THEN** the handoff SHALL return `actionStatus=blocked`
- **AND** it SHALL preserve stable upstream `blockerAlias`, `remediationAlias`, owner handoff and minimum unblock condition when available
- **AND** it SHALL request only read-only sanitized evidence collection or Admin owner remediation

#### Scenario: Needs user action is preserved for operator action
- **WHEN** operator decision handoff summary or aliases indicate `needs-user-action`
- **THEN** the handoff SHALL return `actionStatus=needs-user-action`
- **AND** it SHALL preserve stable `blockerAlias`, `remediationAlias`, owner handoff and minimum unblock condition
- **AND** it SHALL NOT downgrade the state to ready or claim controlled smoke success

#### Scenario: Hard red-line inputs stop operator action
- **WHEN** input summaries, operator note or metadata contain real publish, real controlled smoke, Gateway ingestion, authorization facts, fixture/DB, production-like endpoint, real gate, mapping confirm, read model rebuild, credential-like data or full-success/API/Gateway/Insight success claims
- **THEN** the handoff SHALL return `actionStatus=hard-red-line`
- **AND** `redLineFlags` SHALL include stable aliases such as `real_publish_signal`, `real_controlled_smoke_signal`, `gateway_ingestion_signal`, `authorization_facts_signal`, `real_fixture_signal`, `real_db_write_signal`, `production_like_signal` or `full_success_overclaim`
- **AND** the handoff SHALL NOT trigger any real network request, publish, fixture/DB write, gate or authorization fact change

#### Scenario: Sensitive values are never echoed
- **WHEN** input contains token, Cookie, private endpoint, real account, phone, email, complete organization tree, complete organizationId, source tenant metadata, configRef, secretRef, raw gateway/API response body, full diagnostics response or other credential-like data
- **THEN** the handoff SHALL return `actionStatus=blocked` or `actionStatus=hard-red-line`
- **AND** it SHALL expose only stable redaction aliases, owner guidance and minimum unblock conditions
- **AND** it SHALL NOT echo the sensitive value or complete response

#### Scenario: Unknown action aliases remain owner scoped
- **WHEN** sanitized input contains an unrecognized decision, blocker or remediation alias
- **THEN** the handoff SHALL keep the result blocked
- **AND** owner SHALL be `admin_operator`
- **AND** minimum unblock conditions SHALL require replacing the unknown alias with a stable Admin owner handoff alias
- **AND** the handoff SHALL NOT infer API, Insight or Gateway authorization facts

### Requirement: Admin controlled smoke operator readiness handoff 必须 fail closed

系统 SHALL 提供 Admin-owned 本地 controlled smoke operator readiness handoff，用脱敏的 operator action handoff summary、operator note 和 operator metadata 生成可交接的 readiness package。该 handoff SHALL NOT 触发真实 publish、真实 controlled smoke、Gateway ingestion、endpoint/provider token、fixture/DB 写入、mapping confirm、read model rebuild、gate 或 authorization fact 变更。

#### Scenario: Sanitized action package allows operator readiness handoff
- **WHEN** operator action handoff summary 已是 `ready-for-operator-action`
- **AND** 输入只包含脱敏 status、stable alias、counts、owner handoff limits、risk/redaction 分类、evidence references 和不能外推边界
- **THEN** the handoff SHALL return `readinessStatus=ready-for-operator-readiness-handoff`
- **AND** it SHALL include `readyChecks`、`blockedAlias`、`minimumUnblockConditions`、`doNotDispatchUntil`、`ownerSafeNextActions`、`evidenceReferences`、`cannotInfer` and `cannotInferBoundaries`
- **AND** `cannotInfer` and `cannotInferBoundaries` SHALL state that this readiness package does not prove real publish, real controlled smoke, Gateway ingestion, API/Gateway/Insight success, authorization facts, production readiness, controlled smoke pass or full-success

#### Scenario: Blocked action package remains blocked
- **WHEN** operator action handoff summary is missing, blocked, failed, partial or unknown
- **THEN** the handoff SHALL return `readinessStatus=blocked`
- **AND** it SHALL preserve stable upstream `blockerAlias`, `remediationAlias`, owner handoff and minimum unblock condition when available
- **AND** it SHALL request only read-only sanitized action package collection or Admin owner remediation

#### Scenario: Needs user action is preserved for operator readiness
- **WHEN** operator action handoff summary or aliases indicate `needs-user-action`
- **THEN** the handoff SHALL return `readinessStatus=needs-user-action`
- **AND** it SHALL preserve stable `blockedAlias`, `remediationAlias`, owner handoff and minimum unblock condition
- **AND** it SHALL NOT downgrade the state to ready or claim controlled smoke success

#### Scenario: Hard red-line inputs stop operator readiness
- **WHEN** input summaries, operator note or metadata contain real publish, real controlled smoke, Gateway ingestion, authorization facts, fixture/DB, production-like endpoint, real gate, mapping confirm, read model rebuild, credential-like data or full-success/API/Gateway/Insight success claims
- **THEN** the handoff SHALL return `readinessStatus=hard-red-line`
- **AND** `redLineFlags` SHALL include stable aliases such as `real_publish_signal`, `real_controlled_smoke_signal`, `gateway_ingestion_signal`, `authorization_facts_signal`, `real_fixture_signal`, `real_db_write_signal`, `production_like_signal`, `mapping_confirm_signal`, `read_model_rebuild_signal` or `full_success_overclaim`
- **AND** the handoff SHALL NOT trigger any real network request, publish, fixture/DB write, mapping confirm, read model rebuild, gate or authorization fact change

#### Scenario: Sensitive values are never echoed
- **WHEN** input contains token, Cookie, private endpoint, real account, phone, email, complete organization tree, complete organizationId, source tenant metadata, configRef, secretRef, raw gateway/API response body, full diagnostics response or other credential-like data
- **THEN** the handoff SHALL return `readinessStatus=blocked` or `readinessStatus=hard-red-line`
- **AND** it SHALL expose only stable redaction aliases, owner guidance, sanitized evidence references and minimum unblock conditions
- **AND** it SHALL NOT echo the sensitive value or complete response

#### Scenario: Unknown readiness aliases remain owner scoped
- **WHEN** sanitized input contains an unrecognized action, blocker or remediation alias
- **THEN** the handoff SHALL keep the result blocked
- **AND** owner SHALL be `admin_operator`
- **AND** minimum unblock conditions SHALL require replacing the unknown alias with a stable Admin owner handoff alias
- **AND** the handoff SHALL NOT infer API, Insight or Gateway authorization facts

### Requirement: Admin 必须提供 gateway projection manual publish console
Admin SHALL provide an admin-only manual publish console for gateway organization projection so an operator can trigger one controlled refresh/publish attempt after source, mapping and freshness readiness are reviewed.

#### Scenario: Operator triggers controlled manual publish
- **WHEN** an authorized Admin operator triggers manual publish for an organization
- **THEN** Admin SHALL call the existing `GatewayProjectionService.BuildAndPublishOrganization` flow
- **AND** Admin SHALL use the configured service-to-service gateway projection publisher
- **AND** Admin SHALL NOT write gateway resource authorization facts, permission matrix rows or runtime authorization audit
- **AND** Admin SHALL NOT use Insight/API data stores, Admin management tree JSON or observability JSON as authorization input

#### Scenario: Manual publish returns stable result envelope
- **WHEN** manual publish completes or fails
- **THEN** Admin SHALL return a sanitized result envelope containing `accepted`, `idempotent`, `retryable`, `projectionBatchId`, `orgVersion`, `sourceVersion`, subject counts, `skippedByReason`, `failureCategory`, `durationMs`, `freshnessExpiresAt` and sourceConnection readiness summary
- **AND** the response SHALL include stable disabled reasons when publish cannot be safely triggered
- **AND** the response SHALL NOT contain projection token, Authorization header, Cookie, private URL, phone, email, full organization tree, raw gateway response body or complete organization details

#### Scenario: Manual publish fails closed on missing readiness
- **WHEN** publisher config is missing, source freshness is stale/unavailable, source connection is disabled, lineage is invalid or the build result contains no publishable subjects because mapping/lifecycle readiness is incomplete
- **THEN** Admin SHALL return `status=error` or equivalent blocked result with a stable `failureCategory`
- **AND** Admin SHALL NOT mark the attempt as accepted or idempotent unless the gateway publisher result explicitly reports it
- **AND** Admin SHALL keep the operator guidance scoped to Admin-owned remediation

### Requirement: Web admin 必须展示 projection manual publish 操作区
Admin web UI SHALL expose a projection manual publish operator area near the existing Platform API mapping/readiness/observability context.

#### Scenario: Operator reviews readiness and latest attempt
- **WHEN** operator opens the mapping/projection console for an organization
- **THEN** the UI SHALL show publisher/source/readiness summary, manual publish disabled reasons, trigger button and latest attempt result
- **AND** the UI SHALL display stable categories and counts rather than sensitive raw payloads
- **AND** the UI SHALL explain that manual publish only publishes gateway organization projection input and does not prove API/Gateway/Insight authorization success

#### Scenario: UI blocks unsafe trigger when readiness is incomplete
- **WHEN** readiness summary indicates publisher disabled, source freshness not ready, source metadata missing or no active/tombstone subject is publishable
- **THEN** the UI SHALL disable or warn before manual publish
- **AND** the backend SHALL still enforce fail-closed behavior if the operator sends the request

### Requirement: Admin 必须提供 projection run diff 与 retry readiness
Admin SHALL provide an admin-only read-only gateway projection run diff and retry readiness summary for the latest publish run, and MAY validate an operator supplied `traceId` or `projectionBatchId` against the current latest run reference.

#### Scenario: Operator reviews latest run readiness
- **WHEN** an authorized Admin operator requests run readiness for an organization
- **THEN** Admin SHALL build a current Admin-owned projection dry-run for that organization without publishing
- **AND** Admin SHALL compare the current source/projection summary with the latest Admin recorded publish attempt when available
- **AND** Admin SHALL return source org/version, target contractVersion status, subject projectionVersion summary, subject counts, active/tombstone/unmapped/invalid counts, last failure alias and retry readiness
- **AND** Admin SHALL NOT invent a payload `contractVersion`; when the gateway contract has no explicit field, Admin SHALL expose that absence as a diagnostic status only
- **AND** Admin SHALL NOT read API/Gateway/Insight runtime stores or treat downstream authorization facts as input

#### Scenario: Retry is classified as safe only for stable transient failures
- **WHEN** the latest run failed with a retryable transient publisher/gateway failure and the current Admin dry-run source/projection counts have not changed from the latest run
- **THEN** Admin SHALL return `retry.readiness=safe_retry` or equivalent stable action
- **AND** Admin SHALL include operator guidance that retry only republishes Admin producer input and does not prove Gateway/API/Insight authorization success

#### Scenario: Retry waits for source refresh when source is stale
- **WHEN** source freshness is stale/unavailable, source connection is disabled/missing, or current Admin source version differs from the latest run source version
- **THEN** Admin SHALL return `retry.readiness=wait_source_refresh`
- **AND** Admin SHALL keep guidance scoped to Admin-owned source refresh/remediation

#### Scenario: Retry is blocked by mapping or subject invalid data
- **WHEN** current dry-run contains unmapped, untrusted, lifecycle-invalid or source-data-invalid subjects, or the latest failure alias maps to those categories
- **THEN** Admin SHALL return `retry.readiness=fix_mapping_or_subject`
- **AND** Admin SHALL include only aggregate counts and stable categories, not raw subject details

#### Scenario: Run readiness response is sanitized
- **WHEN** Admin returns run diff and retry readiness
- **THEN** the response SHALL NOT contain projection token, Authorization header, Cookie, private URL, phone, email, full organization tree, raw gateway response body or complete subject details
- **AND** if no durable run history exists, Admin SHALL explicitly mark the run reference as latest in-process observability rather than pretending to provide historical audit

#### Scenario: Contract version status follows the existing gateway contract
- **WHEN** the current Admin-to-gateway projection payload has no explicit `contractVersion`
- **THEN** run readiness SHALL return a diagnostic contract version status such as `not_declared_by_gateway_contract`
- **AND** Admin SHALL NOT add a synthetic `contractVersion` to the publish payload or mark missing contractVersion as a local build failure

### Requirement: Web admin 必须展示 projection run retry readiness 摘要
Admin web UI SHALL expose a projection run retry readiness area near the existing Platform API mapping/readiness/manual publish context.

#### Scenario: Operator sees retry action and diff counts
- **WHEN** operator opens the mapping/projection console for an organization
- **THEN** the UI SHALL load the run readiness summary
- **AND** the UI SHALL display retry action, last failure alias, source/projection versions and aggregate diff/count tags
- **AND** the UI SHALL avoid sensitive raw payloads and explain that readiness is Admin producer diagnosis only

### Requirement: Admin 必须提供 Gateway ingestion status 只读 operator 查询
Admin SHALL provide an admin-only read-only Gateway projection ingestion status query that consumes the API/Gateway owner `ingestion-status` contract and returns a sanitized operator envelope.

#### Scenario: Operator queries latest Gateway ingestion status
- **WHEN** an authorized Admin operator requests ingestion status with `latest=true` for an organization
- **THEN** Admin SHALL call the configured API/Gateway ingestion-status endpoint as a read-only request
- **AND** Admin SHALL use service-to-service authentication without exposing endpoint or token in the response
- **AND** Admin SHALL return Gateway owner status such as `accepted`, `applied`, `stale`, `conflict`, `lineage_invalid`, `unmapped_subjects` or `not_found`
- **AND** Admin SHALL NOT trigger publish, write Gateway facts, read Gateway/API/Insight databases, or use Insight scope/old cache/page fields as fallback

#### Scenario: Operator queries a specified projection receipt
- **WHEN** operator provides `projectionBatchId`, `orgVersion` or `sourceVersion`
- **THEN** Admin SHALL forward only those query keys to the Gateway ingestion-status contract
- **AND** Admin SHALL include a query summary in the response so the operator can see which keys were used
- **AND** Admin SHALL NOT include raw Gateway response, full projection payload, full organization tree or subject details

#### Scenario: Gateway status mapping is stable and fail-closed
- **WHEN** Gateway returns `applied`, `accepted`, `stale`, `conflict`, `lineage_invalid`, `unmapped_subjects` or `not_found`
- **THEN** Admin SHALL preserve the stable status alias and map it to an operator `failureCategory` or success category without treating `not_found` as success
- **AND** if Gateway is unavailable, configuration is missing, or the response cannot be decoded, Admin SHALL return `provider_unavailable`, `invalid_config` or `invalid_response`

#### Scenario: Ingestion status response is sanitized
- **WHEN** Admin returns ingestion status
- **THEN** the envelope SHALL include only status, reason code/category, freshness, lineage, aggregate subject counts, received/applied timestamps, duration and query summary
- **AND** the envelope SHALL NOT contain token, Cookie, private URL, raw Gateway response, full projection payload, complete organization tree, phone, email or subject details

### Requirement: Web admin 必须展示 Gateway ingestion status console
Admin web UI SHALL expose a Gateway projection ingestion status operator area near the existing Platform API mapping/readiness/manual publish context.

#### Scenario: Operator reviews Gateway owner ingestion status
- **WHEN** operator opens the mapping/projection console for an organization
- **THEN** the UI SHALL load a read-only latest ingestion status summary
- **AND** the UI SHALL display status alias, reason/failure category, subject counts, freshness/lineage and received/applied timestamps using stable tags
- **AND** the UI SHALL explain that Gateway ingestion status is owner receipt/status only and does not prove Insight/API authorization success

### Requirement: Admin 必须记录 gateway projection publish attempt history

Admin SHALL record a sanitized gateway projection publish attempt history for Admin-owned projection producer operations. The history SHALL cover manual publish attempts and scheduled publish attempts that use the shared Admin projection producer flow.

#### Scenario: Manual publish records blocked attempt
- **WHEN** an authorized Admin operator triggers manual publish
- **AND** publisher config, source freshness, source connection, lineage, lifecycle or mapping readiness causes the publish to fail closed before gateway ingestion
- **THEN** Admin SHALL record a publish attempt with `source=manual`
- **AND** the attempt SHALL include `status=error` or equivalent blocked status, stable `failureCategory`, subject counts, skipped reason counts when available, `createdAt`, `durationMs`, `traceId` and organization-scoped metadata
- **AND** the attempt SHALL NOT contain projection token, Authorization header, Cookie, private URL, full projection payload, raw gateway response body, phone, email, full organization tree or complete subject details

#### Scenario: Manual publish records publisher result
- **WHEN** manual publish reaches the configured gateway projection publisher
- **THEN** Admin SHALL record a publish attempt with sanitized publisher result fields including `accepted`, `idempotent`, `retryable`, `projectionBatchId`, gateway `orgVersion`, `sourceVersion`, subject counts, `skippedByReason`, `failureCategory`, `durationMs` and `createdAt`
- **AND** the history record SHALL NOT be treated as gateway authorization facts or API/Insight success evidence

#### Scenario: Scheduled publish records attempt
- **WHEN** WeCom sync trigger, refresh worker or another scheduled Admin producer path calls the shared projection publish flow
- **THEN** Admin SHALL record a publish attempt with `source=scheduled`
- **AND** the record SHALL use the same sanitized field semantics as manual attempt history
- **AND** attempt history write failure SHALL NOT create, update or delete gateway authorization facts

### Requirement: Admin 必须提供 publish attempt history 查询

Admin SHALL provide admin-only read APIs for gateway projection publish attempt history so operators can review recent attempts without reading logs or downstream databases.

#### Scenario: Operator lists publish attempts
- **WHEN** an authorized Admin operator queries publish attempts for an organization
- **THEN** Admin SHALL return attempts ordered by newest `createdAt`
- **AND** the query SHALL support source, status, time range and limit filters
- **AND** the response SHALL include only sanitized producer diagnostic fields
- **AND** the response SHALL NOT include raw payload, downstream credentials, private endpoints, full organization tree or complete subject details

#### Scenario: Operator reads publish attempt detail
- **WHEN** an authorized Admin operator queries an attempt by stable attempt id
- **THEN** Admin SHALL return the sanitized attempt detail for that organization-scoped producer attempt
- **AND** missing or unauthorized records SHALL fail closed without leaking whether sensitive downstream data exists

### Requirement: Web admin 必须展示 publish attempt history

Admin web UI SHALL expose recent gateway projection publish attempts near the existing Platform API mapping and manual publish console.

#### Scenario: Operator reviews recent attempts
- **WHEN** operator opens the mapping/projection console for an organization
- **THEN** the UI SHALL display recent attempts with source, status, failure category, accepted/idempotent/retryable, projection/source versions, subject counts, duration and created time
- **AND** the UI SHALL support source/status/time filtering or equivalent low-risk controls
- **AND** the UI SHALL provide a sanitized detail view for skipped reason counts and producer diagnostic metadata
- **AND** the UI SHALL explain through labels or context that attempt history is Admin producer diagnosis only and not gateway authorization facts

#### Scenario: Manual publish refreshes history
- **WHEN** manual publish completes, fails or is blocked
- **THEN** the UI SHALL refresh the recent attempts list
- **AND** the operator SHALL be able to inspect the recorded attempt without exposing raw payload or credentials

### Requirement: Admin 必须提供 publish attempt retention metadata

Admin SHALL expose sanitized retention metadata for gateway projection publish attempts so operators can understand record lifecycle without performing destructive cleanup.

#### Scenario: Attempt history includes retention metadata
- **WHEN** an authorized Admin operator lists or reads publish attempts for an organization
- **THEN** Admin SHALL include retention metadata such as retention window, `expiresAt`, `cleanupEligible` and `cleanupReason`
- **AND** cleanup eligibility SHALL be a read-only diagnostic signal and SHALL NOT delete or mutate attempt records
- **AND** the response SHALL NOT include raw payload, downstream credentials, private endpoints, full organization tree or complete subject details

#### Scenario: Retention readiness summarizes cleanup candidates
- **WHEN** an authorized Admin operator queries publish attempt retention readiness for an organization
- **THEN** Admin SHALL return aggregate counts for total attempts, cleanup-eligible attempts, blocked attempts and stable reason aliases
- **AND** Admin SHALL fail closed when organization is missing
- **AND** Admin SHALL NOT execute cleanup, delete database rows, trigger publish or write gateway authorization facts

### Requirement: Admin 必须提供 publish attempt receipt query hint

Admin SHALL provide sanitized receipt query hints that correlate Admin producer attempts with Gateway owner ingestion status queries.

#### Scenario: Attempt detail exposes receipt hint
- **WHEN** an attempt has projection lineage fields such as `projectionBatchId`, gateway `orgVersion` or `sourceVersion`
- **THEN** Admin SHALL include a receipt query hint with organization, latest flag and available projection identifiers
- **AND** the hint SHALL be marked unavailable when required query keys are missing
- **AND** the hint SHALL NOT be treated as Gateway receipt success, API authorization success or Insight report success

#### Scenario: Web admin links attempt to ingestion status query
- **WHEN** an operator opens a publish attempt detail
- **THEN** the UI SHALL display retention status and receipt query hint
- **AND** when the hint is available, the UI MAY trigger the existing read-only Gateway ingestion status query using the hint fields
- **AND** the UI SHALL explain that Gateway receipt/status is downstream owner evidence only and not runtime authorization success

### Requirement: Admin 必须提供 publish attempt retention cleanup dry-run

Admin SHALL provide an admin-only retention cleanup dry-run for gateway projection publish attempts so operators can review cleanup impact before any destructive action exists.

#### Scenario: Operator generates cleanup dry-run plan
- **WHEN** an authorized Admin operator requests cleanup dry-run for an organization
- **THEN** Admin SHALL return a sanitized plan containing candidate count, blocked count, stable reason aliases, oldest/newest attempt timestamps, retention window, diagnostic completeness, receipt query hint coverage and operator action summary
- **AND** Admin SHALL require `organization` and fail closed when it is missing
- **AND** Admin SHALL support safe filters such as status, failure category, older-than timestamp and limit
- **AND** Admin SHALL NOT delete, update or mutate attempt records

#### Scenario: Cleanup dry-run response is sanitized
- **WHEN** Admin returns cleanup dry-run plan
- **THEN** the response SHALL include only aggregate counts, stable aliases, guardrail state and a bounded sanitized sample
- **AND** the response SHALL NOT include raw Gateway response, token, Cookie, private URL, complete organization tree, complete subject details, phone or email
- **AND** receipt hint coverage SHALL NOT be treated as Gateway receipt success, API authorization success or Insight report success

### Requirement: Admin cleanup execution guardrail 必须 fail closed

Admin SHALL expose cleanup execution guardrails that make destructive cleanup impossible in P0.

#### Scenario: Operator inspects cleanup execution guardrail
- **WHEN** an authorized Admin operator opens cleanup dry-run or calls a cleanup execution guardrail endpoint
- **THEN** Admin SHALL return disabled execution state such as `dryRunOnly=true`, `enabled=false`, `irreversible=false`, `disabledReason` and required confirmation guidance
- **AND** Admin SHALL NOT execute DB delete/update, cleanup real attempts, trigger publish, write Gateway authorization facts or write 60 fixture data

### Requirement: Web admin 必须展示 cleanup dry-run guardrails

Admin web UI SHALL expose retention cleanup dry-run near the publish attempt history console.

#### Scenario: Operator reviews cleanup dry-run in web admin
- **WHEN** operator opens the mapping/projection console for an organization
- **THEN** the UI SHALL display cleanup dry-run candidate/blocked counts, reason aliases, diagnostic completeness, receipt hint coverage, safety checklist and disabled execution guardrail
- **AND** the UI SHALL provide safe filters and refresh behavior without exposing destructive cleanup actions
- **AND** the UI SHALL explain that the dry-run is Admin producer diagnostics only and not downstream authorization evidence

### Requirement: Admin 必须提供 cleanup execute readiness

Admin SHALL provide an admin-only cleanup execute readiness for gateway projection publish attempt retention cleanup so operators can review approval gates before any destructive cleanup execution exists.

#### Scenario: Operator requests execute readiness
- **WHEN** an authorized Admin operator requests cleanup execute readiness for an organization
- **THEN** Admin SHALL require `organization`
- **AND** Admin SHALL evaluate readiness from Admin-owned publish attempt history and cleanup dry-run plan only
- **AND** Admin SHALL support safe filters such as `source`, `status`, `failureCategory`, `olderThan` and `limit`
- **AND** Admin SHALL NOT query API, Gateway or Insight internal storage

#### Scenario: Readiness envelope is returned
- **WHEN** Admin returns cleanup execute readiness
- **THEN** the response SHALL include `readiness`, `safeNextAction`, `disabledReasons`, `dryRunId`, `dryRunHash`, `retentionPolicyVersion`, `lastDryRunFreshness`, candidate and blocked counts, diagnostic completeness, receipt hint availability, operator approval requirements and a sanitized export payload
- **AND** the response SHALL NOT include token, Cookie, private URL, raw Gateway response, complete organization tree, complete subject details or resource authorization facts
- **AND** Gateway receipt hints SHALL be described as diagnostics only and SHALL NOT be represented as runtime authorization success

#### Scenario: Readiness blocks unsafe execution
- **WHEN** cleanup dry-run is stale, has no candidates, has blocked attempts, has missing diagnostic summary, has missing receipt hints or lacks required approval evidence
- **THEN** Admin SHALL return a non-ready readiness alias and stable `disabledReasons`
- **AND** Admin SHALL return a conservative `safeNextAction`
- **AND** Admin SHALL keep `executeGuardrail.enabled=false` and `dryRunOnly=true` for P0

#### Scenario: Readiness remains read-only
- **WHEN** operator requests cleanup execute readiness
- **THEN** Admin SHALL NOT delete or update publish attempt records
- **AND** Admin SHALL NOT trigger projection publish
- **AND** Admin SHALL NOT write Gateway authorization facts
- **AND** Admin SHALL NOT write approval records or open a production cleanup gate

### Requirement: Web admin 必须展示 cleanup execute readiness

Admin web UI SHALL expose cleanup execute readiness near the gateway projection publish attempt retention cleanup dry-run panel.

#### Scenario: Operator reviews execute readiness in web admin
- **WHEN** an Admin operator opens the gateway projection publish attempt area
- **THEN** the UI SHALL display readiness, safe next action, disabled reasons, dry-run id/hash, freshness, candidate and blocked counts, diagnostic completeness, receipt hint availability and approval requirements
- **AND** the UI SHALL support copying or exporting sanitized readiness JSON
- **AND** the UI SHALL cover loading, empty, error and disabled states without exposing destructive cleanup controls
- **AND** the UI SHALL explain that readiness is Admin producer diagnostics only and not downstream authorization evidence

### Requirement: Admin 必须提供 cleanup approval audit trail

Admin SHALL provide an admin-owned cleanup approval audit trail or read model for gateway projection publish attempt retention cleanup readiness so operators can review safe pre-execution accountability before any destructive cleanup execution exists.

#### Scenario: Operator requests approval audit trail
- **WHEN** an authorized Admin operator requests cleanup approval audit trail for an organization
- **THEN** Admin SHALL require `organization`
- **AND** Admin SHALL return `storageScope=admin_cleanup_approval_audit_trail.v1`, generated time, summary counts and sanitized records
- **AND** each record SHALL include stable aliases or hashes for action, readiness hash, retention policy version, candidate count, approval state, disabled reasons, safe next action and timestamps
- **AND** Admin SHALL evaluate or record the trail using Admin-owned persisted producer readiness/audit data only
- **AND** Admin SHALL NOT query API, Gateway or Insight internal storage

#### Scenario: Operator records safe approval action
- **WHEN** an Admin operator records a safe action such as `approve`, `reject`, `copy`, `export` or `refresh`
- **THEN** Admin SHALL persist or project only sanitized audit fields
- **AND** Admin SHALL keep `executeGuardrail.enabled=false` and `dryRunOnly=true` for P0
- **AND** Admin SHALL NOT execute cleanup, delete or update publish attempt records, trigger projection publish, write Gateway authorization facts or open a production cleanup gate

#### Scenario: Approval audit trail is redacted
- **WHEN** Admin returns approval audit trail or export payload
- **THEN** the response SHALL NOT include token, Cookie, private URL, raw Gateway response, complete organization tree, complete subject details or resource authorization facts
- **AND** Gateway receipt hints SHALL be described as diagnostics only and SHALL NOT be represented as runtime authorization success

### Requirement: Web admin 必须展示 cleanup approval audit trail

Admin web UI SHALL expose cleanup approval audit trail near the gateway projection publish attempt cleanup execute readiness panel.

#### Scenario: Operator reviews approval audit trail in web admin
- **WHEN** an Admin operator opens the gateway projection publish attempt cleanup readiness area
- **THEN** the UI SHALL display storage scope, approval state, action aliases, readiness hash, retention policy version, candidate count, disabled reasons, safe next action and created/updated time
- **AND** the UI SHALL support copying or exporting sanitized audit JSON
- **AND** the UI SHALL cover loading, empty, error and disabled states without exposing destructive cleanup controls
- **AND** the UI SHALL explain that audit trail is Admin producer diagnostics only and not downstream authorization evidence

### Requirement: Admin 必须提供 cleanup approval policy readiness
Admin SHALL provide an admin-only read-only cleanup approval policy readiness for gateway projection publish attempt retention cleanup so operators can review manual approval policy gates before any destructive cleanup execution exists.

#### Scenario: Operator requests approval policy readiness
- **WHEN** an authorized Admin operator requests cleanup approval policy readiness for an organization
- **THEN** Admin SHALL require `organization`
- **AND** Admin SHALL evaluate policy readiness from Admin-owned cleanup execute readiness and approval audit trail only
- **AND** Admin SHALL support safe filters such as `source`, `status`, `failureCategory`, `olderThan`, `dryRunGeneratedAt`, `maxDryRunAgeSeconds`, `approvalEvidence`, `readinessHash` and `limit`
- **AND** Admin SHALL NOT query API, Gateway or Insight internal storage

#### Scenario: Policy readiness envelope is returned
- **WHEN** Admin returns cleanup approval policy readiness
- **THEN** the response SHALL include `policyVersion`, `policyStatus`, `storageScope`, `retentionPolicyVersion`, `approvalAuditStorageScope`, `readinessHash`, `safeNextAction`, `manualReview`, `cannotInfer`, `policyGates`, `auditSummary`, generated time and a sanitized export payload
- **AND** `storageScope` SHALL make clear that P0 policy readiness is a derived non-persisted read model
- **AND** the response SHALL NOT include token, Cookie, private URL, raw Gateway response, complete organization tree, complete subject details or resource authorization facts

#### Scenario: Policy readiness fails closed when evidence cannot be inferred
- **WHEN** cleanup execute readiness is blocked, readiness hash is missing, approval audit trail is empty, audit hash does not match the current dry-run hash, required manual review actions are missing or a reject action exists
- **THEN** Admin SHALL return `policyStatus=blocked`, `policyStatus=manual_review_required` or `policyStatus=cannot_infer`
- **AND** Admin SHALL include stable `cannotInfer.reasonAliases` such as `readiness_hash_missing`, `approval_audit_trail_empty`, `approval_audit_hash_mismatch`, `manual_review_action_missing`, `approval_rejected`, `execute_readiness_blocked` or `cleanup_execution_not_enabled`
- **AND** Admin SHALL return a conservative `safeNextAction`
- **AND** Admin SHALL keep cleanup execution disabled for P0

#### Scenario: Approval policy remains read-only
- **WHEN** operator requests, refreshes, copies or exports cleanup approval policy readiness
- **THEN** Admin SHALL NOT delete or update publish attempt records
- **AND** Admin SHALL NOT trigger projection publish
- **AND** Admin SHALL NOT write Gateway authorization facts
- **AND** Admin SHALL NOT create a real cleanup approval decision or open a production cleanup gate

### Requirement: Web admin 必须展示 cleanup approval policy readiness
Admin web UI SHALL expose cleanup approval policy readiness near the gateway projection publish attempt cleanup approval audit trail.

#### Scenario: Operator reviews approval policy readiness in web admin
- **WHEN** an Admin operator opens the gateway projection publish attempt cleanup readiness area
- **THEN** the UI SHALL display policy status, safe next action, manual review status, cannotInfer reason aliases, policy gates, audit summary, storage scope, policy version and retention policy version
- **AND** the UI SHALL support copying or exporting sanitized policy readiness JSON
- **AND** the UI SHALL cover loading, empty, error and disabled states without exposing destructive cleanup controls
- **AND** the UI SHALL explain that policy readiness is Admin producer diagnostics and manual review guidance only, not downstream authorization evidence or cleanup execution approval

### Requirement: Admin 必须提供 cleanup approval decision draft readiness

Admin SHALL provide an admin-only read-only cleanup approval decision draft readiness for gateway projection publish attempt retention cleanup so operators can review a copy-safe approval decision draft before any future destructive cleanup execution gate exists.

#### Scenario: Operator requests approval decision draft readiness
- **WHEN** an authorized Admin operator requests cleanup approval decision draft readiness for an organization
- **THEN** Admin SHALL require `organization`
- **AND** Admin SHALL evaluate the draft from Admin-owned cleanup approval policy readiness, cleanup execute readiness and approval audit trail only
- **AND** Admin SHALL support safe filters such as `source`, `status`, `failureCategory`, `olderThan`, `readinessHash`, `dryRunGeneratedAt`, `maxDryRunAgeSeconds`, `approvalEvidence` and `limit`
- **AND** Admin SHALL NOT query API, Gateway or Insight internal storage

#### Scenario: Decision draft readiness envelope is returned
- **WHEN** Admin returns cleanup approval decision draft readiness
- **THEN** the response SHALL include `decisionDraftId`, `decisionDraftHash`, `decisionReadiness`, `decisionState`, `decisionSummary`, `executionMode`, `cleanupExecutionAllowed`, `policyVersion`, `policyStatus`, `readinessHash`, `dryRunId`, `manualReviewChecklist`, `cannotInfer`, `blockingReasons`, `copySafeLabels`, `retentionSummary`, `auditSummary`, `redactionSummary`, `operatorNextAction`, `executeGuardrail`, generated time and a sanitized export payload
- **AND** `executionMode` SHALL be `manual_review_only`
- **AND** `cleanupExecutionAllowed` SHALL be `false`
- **AND** the response SHALL NOT include token, Cookie, private URL, raw Gateway response, complete organization tree, complete subject details or resource authorization facts

#### Scenario: Decision draft fails closed when evidence cannot be inferred
- **WHEN** approval policy readiness is blocked, cannot infer, missing manual review actions, has a reject action, or has a readiness hash mismatch
- **THEN** Admin SHALL return `decisionReadiness=blocked`, `decisionReadiness=manual_review_required` or `decisionReadiness=cannot_infer`
- **AND** Admin SHALL include stable `cannotInfer.reasonAliases` and `blockingReasons`
- **AND** Admin SHALL return a conservative `operatorNextAction`
- **AND** Admin SHALL keep `cleanupExecutionAllowed=false`
- **AND** Admin SHALL still represent `executeGuardrail.enabled=false` as a P0 execution boundary even when the decision draft itself is ready for manual review

#### Scenario: Decision draft remains read-only
- **WHEN** operator requests, refreshes, copies or exports cleanup approval decision draft readiness
- **THEN** Admin SHALL NOT delete or update publish attempt records
- **AND** Admin SHALL NOT trigger projection publish
- **AND** Admin SHALL NOT write Gateway authorization facts
- **AND** Admin SHALL NOT create a real cleanup approval decision or open a production cleanup gate

### Requirement: Web admin 必须展示 cleanup approval decision draft readiness

Admin web UI SHALL expose cleanup approval decision draft readiness near the gateway projection publish attempt cleanup approval policy readiness and approval audit trail.

#### Scenario: Operator reviews approval decision draft in web admin
- **WHEN** an Admin operator opens the gateway projection publish attempt cleanup readiness area
- **THEN** the UI SHALL display decision readiness, decision state, policy status, manual review checklist, cannotInfer reason aliases, blocking reasons, copy-safe labels, retention/audit/redaction summaries and operator next action
- **AND** the UI SHALL support copying or exporting sanitized decision draft JSON
- **AND** the UI SHALL cover loading, empty, error and disabled states without exposing destructive cleanup controls
- **AND** the UI SHALL explain that decision draft readiness is Admin producer diagnostics and manual review guidance only, not a real approval decision, downstream authorization evidence or cleanup execution approval
