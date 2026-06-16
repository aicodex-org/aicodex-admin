## ADDED Requirements

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
