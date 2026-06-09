## 本地验证

### 2026-06-09 OpenSpec 校验

命令：

```powershell
openspec validate stabilize-admin-gateway-projection-refresh-worker --strict
```

结果：通过，输出 `Change 'stabilize-admin-gateway-projection-refresh-worker' is valid`。

### 2026-06-09 聚焦 Go 测试

命令：

```powershell
cd admin
go test ./object -run 'Test(GatewayProjection|WecomOrganizationSyncGatewayProjection)' -count=1 -v
go test ./object -run 'TestBuildGatewayProjectionBatch' -count=1 -v
go test .
```

结果：通过。

覆盖点：

- refresh worker 配置默认 900 秒，小于 1800 秒 freshness TTL。
- endpoint/token 缺失时 refresh worker 不启动，并返回脱敏 `invalid_config`。
- worker 同轮 organization 去重、排序、非重入和 per-organization 失败计数。
- WeCom 同步成功后 publish 触发仍受 `gatewayOrganizationProjectionEnabled` 门控。
- 组织未变化时 refresh 保持同一 gateway `orgVersion`，同时生成新的 `projectionBatchId`、subject `projectionVersion` 和 freshness 窗口。
- 全量 projection 包含 active subject，并对 disabled/deleted/conflicted lifecycle 输出 tombstone subject，不靠缺失表达删除。
- `go test .` 确认 admin module 根包和 `main.go` 启动调用可编译。

### 2026-06-09 Diff 检查

命令：

```powershell
git diff --check
```

结果：通过，无 whitespace error。

### 2026-06-09 完整测试残余风险

命令：

```powershell
cd admin
go test ./object
go test ./...
```

结果：未作为本 change 验收通过项。

原因：

- `go test ./object` 触发既有 `TestDumpToFile`，本机没有测试数据库服务，连接本地数据库端口失败。
- `go test ./...` 还触发既有证书文件依赖、deployment 数据库依赖和 i18n 重复键检查失败。

这些失败与本 change 新增的 projection refresh worker 无直接关系；本轮以聚焦 projection 测试、OpenSpec 校验和 diff 检查作为本地验收依据。

### 2026-06-09 归档前复查修复验证

命令：

```powershell
cd admin
go test ./object -run 'Test(GatewayProjection|WecomOrganizationSyncGatewayProjection|LatestGatewayProjection)' -count=1
go test .
cd ..
openspec validate stabilize-admin-gateway-projection-refresh-worker --strict
git diff --check
```

结果：通过。

覆盖点：

- 默认 projection snapshot store 只选择最新可用 `SUCCEEDED/PARTIAL` 且带 `orgVersion` 和 `finishedAt` 的同步批次。
- 最新失败或运行中的同步批次不会覆盖上一条可用来源版本，避免 refresh 用错误 `orgVersion` 续期 freshness。
- refresh worker 与 snapshot store 复用同一批次可用性判断，避免状态语义漂移。

### 2026-06-09 tombstone mapping review 修复验证

命令：

```powershell
cd admin
go test ./object -run 'TestBuildGatewayProjectionBatch(FailsClosedForMappingsAndLifecycle|PublishesLifecycleTombstoneSubjects)' -count=1
go test ./object -run 'Test(GatewayProjection|WecomOrganizationSyncGatewayProjection|LatestGatewayProjection)' -count=1
go test .
cd ..
openspec validate stabilize-admin-gateway-projection-refresh-worker --strict
git diff --check
```

结果：通过。

覆盖点：

- `LifecycleStatus=DISABLED` 且 `PlatformUser.MappingStatus=DISABLED`、`ExternalIdentity.MappingStatus=DISABLED` 时，builder 仍输出 `disabled` tombstone subject。
- `LifecycleStatus=ACTIVE` 且 mapping 为 `DISABLED` 时仍 fail closed，不会被 tombstone 放宽规则误发布为 active subject。
- active subject 继续只接受 confirmed mapping；disabled mapping 只作为非 active tombstone 的撤销来源。

## 60 测试环境验证

### 2026-06-09 refresh worker 部署和超过 TTL 验证

前置：

- 60 测试环境部署当前 admin 工作分支。
- `gatewayOrganizationProjectionRefreshIntervalSeconds` 使用默认 900 秒，小于 API freshness TTL 1800 秒。
- projection-status 查询只使用 API 私有 report provider token，接口 path 为 `/api/gateway-authorization-report-provider/v1/projection-status`。

结果：

- admin 容器启动后出现脱敏日志 `gateway_projection_refresh_worker_started`，首轮 `gateway_projection_refresh_publish_ok` 和 `gateway_projection_refresh_completed` 成功。
- 首轮 projection-status 返回 `success=true`、`httpStatus=200`、`providerStatus=ok`、`errorCode=null`，freshness 窗口为 30 分钟。
- 第二轮 refresh 后再次查询 projection-status，`providerStatus=ok`，`orgVersion` 与首轮保持一致，`generatedAt`、`expiresAt`、`projectionVersion` 和 batch 已更新，确认 admin 未通过递增 `orgVersion` 续期 freshness。
- 等待超过首轮 freshness 1800 秒后再次查询 projection-status，仍返回 `success=true`、`httpStatus=200`、`providerStatus=ok`、`errorCode=null`，且最新 `expiresAt` 已刷新到下一窗口。
- 同一时间窗口内 admin 脱敏日志统计为：`gateway_projection_refresh_completed=3`、`gateway_projection_refresh_publish_ok=3`、`gateway_projection_publish_audit status=ok=3`、publish audit error 为 0。
- 日志脱敏检查未发现 token、完整认证头或 Cookie 泄露信号。

记录说明：本节只记录环境别名、接口 path、状态、时间窗口和脱敏日志 key；不记录真实 IP、token、Cookie、账号密码、完整 DSN、私有 URL、原始 batchId、组织标识或个人信息。
