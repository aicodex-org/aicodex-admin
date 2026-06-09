## MODIFIED Requirements

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
