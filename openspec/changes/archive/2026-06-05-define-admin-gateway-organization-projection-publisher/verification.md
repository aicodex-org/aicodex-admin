# 验证记录

## 2026-06-05 本地验证

- `go test ./object -run GatewayProjection -count=1`
  - 执行目录：`admin/`。
  - 结果：通过。
  - 覆盖：builder DTO 字段映射、admin 字符串 `orgVersion` 与 gateway int64 `orgVersion` 分离、lifecycle fail-closed、`apiSubjectId` 缺失/不可信跳过、digest/projectionVersion 稳定性、publisher accepted/idempotent、401/403/400 不重试、5xx/timeout 幂等重试、service 构建发布、WeCom 同步后配置门控触发。
  - 归档前补充覆盖：builder 可从 admin `User.Properties` 的明确 `aicodexApiUserId/apiUserId` 映射生成 `apiSubjectId`，但仍不读取 Insight scope；publisher 在读取响应体前不会提前取消 request context；WeCom 同步后 projection warning 只记录脱敏错误分类，不输出 transport error 中可能携带的完整 endpoint。

- `go test ./object`
  - 执行目录：`admin/`。
  - 结果：未通过。
  - 原因：既有 `TestDumpToFile` 依赖本地数据库连接，当前验证环境未提供该数据库；失败点与 gateway projection 本 change 无关。

- `openspec validate define-admin-gateway-organization-projection-publisher --strict`
  - 结果：通过。

- `openspec validate --changes --strict`
  - 结果：通过。

- `git diff --check`
  - 结果：通过。

- `powershell -NoProfile -ExecutionPolicy Bypass -File openspec/changes/define-admin-gateway-organization-projection-publisher/scripts/gateway-projection-smoke.ps1 -SkipHttp`
  - 结果：通过。
  - 摘要：fixture 有效，subject 数为 2；未配置 projection endpoint/token，因此 HTTP push、idempotent replay、contract error 和 auth error 远端验证均跳过；`requestDelaySeconds=0`。

- api agent ingestion contract fixture 对齐
  - 结果：通过，无新增 contract gap。
  - 结论：`fixtures/gateway-projection/projection-batch.json` 和 `projection-batch-minimal.json` 均可作为 `aicodex-api / ai-gateway` `POST /api/gateway-organization-projection/v1/batches` 的正向 ingestion contract test 请求体。
  - 字段覆盖：顶层 `traceId`、`caller=aicodex-admin`、`projectionBatchId`、int64 `orgVersion`、`generatedAt`、`freshness.expiresAt`、`lineage.sourceService/sourceVersion/digest`，以及 subject 级 `stableSubjectId`、`apiSubjectId`、`subjectType`、`organizationId`、`departmentIds`、`roleIds`、`positionIds`、`lifecycleStatus`、`projectionVersion`、`orgVersion`、`freshnessExpiresAt`。
  - api 侧验证：`go test ./internal/service/gatewayauth -run TestValidateProjectionBatch -count=1` 通过；`go test ./internal/controller -run TestPostGatewayOrganizationProjectionBatch -count=1` 通过。

- 脱敏扫描
  - 结果：通过。
  - 范围：本 change OpenSpec 文件、fixture、smoke 脚本和新增 gateway projection Go 文件。
  - 规则：检查真实环境 IP、私有 URL、明文凭据形态、邮箱和手机号；公开 license URL 与代码字段名不作为敏感值。

## 2026-06-05 归档前复查

- `go test ./admin/object -run GatewayProjection -count=1`
  - 执行目录：仓库根目录。
  - 结果：通过。

- `openspec validate define-admin-gateway-organization-projection-publisher --strict`
  - 结果：通过。

- `openspec validate --changes --strict`
  - 结果：通过。

- `git diff --check`
  - 结果：通过。

- `powershell -NoProfile -ExecutionPolicy Bypass -File openspec/changes/define-admin-gateway-organization-projection-publisher/scripts/gateway-projection-smoke.ps1 -SkipHttp`
  - 结果：通过。

- 脱敏复扫
  - 结果：通过。
  - 范围：本 change OpenSpec 文件、fixture、smoke 脚本和新增 gateway projection Go 文件。
  - 结论：未发现真实环境 IP、私有 URL、明文凭据、邮箱或手机号；配置字段名、占位符和开源 license URL 不作为敏感值。

## 2026-06-05 60 Fanley 联调验证

- `powershell -NoProfile -ExecutionPolicy Bypass -File openspec/changes/define-admin-gateway-organization-projection-publisher/scripts/gateway-projection-smoke.ps1 -FixturePath <dynamic-fixture> -RequestDelaySeconds 2`
  - 执行环境：本机 Windows PowerShell 5.1 到 60 Fanley API control plane `/api/gateway-organization-projection/v1/batches`。
  - 结果：请求进入 60 control plane，但当前本机出口 IP 已命中 `CriticalRateLimit` 窗口，`httpPush`、`replay`、`contractError`、`authError` 均返回 HTTP `429`；该结果用于确认脚本已不再把 WinPS 5.1 的压缩响应误报为 `transport_error/statusCode=0`，不作为 ingestion contract 结论。
  - 脚本修正：`Accept-Encoding=identity` 规避 WinPS 5.1 对压缩响应体的兼容问题；手机号脱敏正则增加数字边界，避免误伤 13 位 `orgVersion`；新增 `RequestDelaySeconds`，用于测试环境避开连续请求限流。

- 60 Fanley API control plane 本机 HTTP 冒烟验证
  - 执行方式：在 60 主机本地使用 API 私有配置中的 projection token，向 `<gateway-projection-endpoint>` 的 `/api/gateway-organization-projection/v1/batches` 发送动态 fixture；验证后清理 synthetic batch，不记录或输出 token、数据库密码、完整 DSN。
  - 动态 payload：基于 admin fixture 字段生成唯一 `projectionBatchId=<dynamic-projection-batch-id>`、当前 Unix 毫秒 `orgVersion=<current-unix-ms>`、未来 30 分钟 freshness 和合法 `sha256:<hex>` lineage digest。
  - 结果：`first` HTTP `200`，`success=true`，`accepted=true`，`idempotent=false`；`replay` HTTP `200`，`success=true`，`accepted=true`，`idempotent=true`；`expired` HTTP `400`，`errorCode=projection_expired`；`auth` HTTP `401`，`errorCode=unauthenticated`。
  - 清理：删除本次动态 `projectionBatchId` 前缀对应的 synthetic subjects `2` 条、batch `1` 条；复查 `remaining=0`。

- 60 Fanley 真实 WeCom 同步触发 projection publisher
  - 执行方式：60 admin 私有运行配置开启 `gatewayOrganizationProjectionEnabled`，endpoint/token 仅从 60 私有 `.env` 注入；通过 admin 管理 API `POST /api/wecom-org-sync/runs` 触发现有测试 WeCom 组织的手动同步成功路径。
  - 前提：目标测试组织已有企业微信同步配置且最近历史 run 为 `succeeded`；组织内存在 1 个明确 `apiSubjectId` 映射用户，可用于 gateway projection subject。
  - 同步结果：新 run 最终 `status=succeeded`、`stage=finalizing`；本次 run 更新部门 `254`、用户 `1043`、membership `1063`。
  - publisher 结果：admin 脱敏审计日志出现 `gateway_projection_publish_audit`，`status=ok`、`statusCode=200`、`attempts=1`、`accepted=true`、`idempotent=false`；日志未输出 token、完整 endpoint、Cookie 或原始响应。
  - API ingestion 结果：API projection 表确认本次 `projectionBatchId` 写入 batch `1` 条、subject `1` 条，和该测试组织当前明确映射用户数量一致。
  - 清理：未新建测试组织或测试成员；验证后删除本次 run 产生的 API projection batch `1` 条和 subject `1` 条，复查 `remaining=0`；admin/API 容器均保持 healthy。

## 剩余风险

- 已用 60 Fanley 真实 WeCom 同步成功事件触发 admin publisher 自动推送到 gateway，并验证 API ingestion `accepted=true`。后续剩余风险主要是生产或类生产环境启用策略、失败重试运营可视化和长期补偿任务，这些不在本 change 范围内。
