# Verification

> 本文件只记录脱敏验证结果。不得写入真实 IP、私有 URL、token、Cookie、真实账号、手机号、邮箱、完整组织明细或完整响应体。

## 2026-06-11 本地验证

### OpenSpec

- `openspec validate stabilize-admin-gateway-projection-observability --strict`
  - 结果：通过。
- `openspec validate --changes --strict`
  - 结果：通过，4 个 active change 校验通过。
- `openspec validate --specs --strict`
  - 结果：通过，14 个主规格校验通过。

### Go 聚焦测试

- 工作目录：`admin/`
- `go test ./object -run 'Test(GatewayProjection|GatewayProjectionRefresh|LatestGatewayProjection)' -count=1 -v`
  - 结果：通过。
  - 覆盖点：projection batch 构建、publisher audit、failure category、refresh worker 状态、latest publish observability、SourceConnection disabled 分类。
- `go test ./controllers -run 'TestGatewayProjectionObservability' -count=1 -v`
  - 结果：通过编译；当前无专门 controller 测试命中。该接口是 `object.GetGatewayProjectionObservabilitySnapshot` 的薄封装，核心行为由 `object` 聚焦测试覆盖。

### 覆盖率

- 工作目录：`admin/`
- `go test ./object -run 'Test(GatewayProjection|GatewayProjectionRefresh|LatestGatewayProjection)' -count=1 -coverprofile ..\gateway_projection_observability.cover.out`
  - 结果：通过。
  - package 覆盖率：`2.8%`。该 package 历史文件很多，不能代表本 change 的 changed-file 覆盖。
- `go tool cover -func ..\gateway_projection_observability.cover.out`
  - `gateway_organization_projection_observability.go` 的关键函数覆盖率均达到或超过 `85%`：
    - `GetGatewayProjectionObservabilitySnapshot`: `90.5%`
    - `recordGatewayProjectionServiceObservability`: `100.0%`
    - `recordGatewayProjectionPublishAudit`: `100.0%`
    - `recordGatewayProjectionRefreshObservability`: `95.0%`
    - `GatewayProjectionFailureCategory`: `100.0%`
    - `gatewayProjectionBuildFailureCategory`: `85.7%`
    - `summarizeGatewayProjectionSourceConnections`: `90.0%`
    - `countGatewayProjectionSubjectLifecycle`: `85.7%`

### 受影响包全量测试

- 工作目录：`admin/`
- `go test ./object ./controllers -count=1`
  - 结果：未通过，阻断原因不是本 change：
    - `object` 包既有 `TestDumpToFile` 需要本地数据库连接，当前本机未启动对应数据库。
    - 同一轮输出中还出现既有桌面 discovery contract 断言失败。
  - 处置：本 change 使用聚焦测试和 changed-file 覆盖率作为验证依据；全量包测试需在具备项目完整本地依赖的环境中复跑。

### 60 smoke

- 2026-06-11 post-merge 60 只读 smoke 已执行。
- admin 部署提交：`b05903aa`。
- Bruno 命令：`bru run "00-健康检查" "10-认证/登录.yml" "10-认证/当前账号.yml" "50-Gateway Projection 观测/运行态观测.yml" --env remote-test`
  - 结果：通过，4 个请求均返回 `200 OK`。
  - 说明：`remote-test` 为本机私有环境，验证记录不写真实地址、账号、密码、Cookie 或完整响应。
- observability 脱敏摘要：
  - `publisher.enabled=true`，`publisher.configured=true`，`freshnessTtlSeconds=1800`，`maxRetries=1`。
  - `refresh.enabled=true`，`intervalSeconds=900`，`intervalLessThanTtl=true`，`lastRunAt/nextRunAt/lastSuccessAt` 均可判定，`lastFailureCategory` 为空。
  - 最近 refresh 统计：`lastOrganizations=1`，`lastPublished=1`，`lastFailed=0`，`lastSkipped=0`。
  - `latestPublish` 存在，`projectionBatchId/orgVersion/sourceVersion/generatedAt/freshnessExpiresAt` 均可判定。
  - 最近 publish 摘要：`subjectCount=0`，`activeSubjectCount=0`，`tombstoneSubjectCount=0`，`skippedSubjectCount=1049`，skip reason 为 `mapping_missing`，`status=ok`，`statusCode=200`，`accepted=true`，`idempotent=false`，`failureCategory=no_publishable_subjects`。
  - 响应敏感字段扫描未发现 `Authorization`、`Bearer`、`Cookie` 或 `token` 标记。
- 结论：60 已证明 admin producer observability 接口可只读访问，publisher/refresh worker 状态、latest audit、freshness、lineage 和 skip reason 可诊断；但当前测试数据没有可发布 subject，不能把本次结果解读为“有 active/tombstone subject 的完整 projection 业务成功”。

### Diff 检查

- `git diff --check`
  - 结果：通过。
