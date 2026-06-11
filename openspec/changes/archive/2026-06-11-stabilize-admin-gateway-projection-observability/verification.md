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

- 未执行真实 60 smoke。
- 已新增 Bruno 只读 smoke：`api-tests/bruno/aicodex-admin/50-Gateway Projection 观测/运行态观测.yml`。
- 运行时应使用私有环境变量配置登录态和测试环境地址；验证记录只能写脱敏摘要。默认不要求 latest audit 存在，如需证明最近发布链路执行过，设置 `gatewayProjectionRequireLatestAudit=true`。

### Diff 检查

- `git diff --check`
  - 结果：通过。
