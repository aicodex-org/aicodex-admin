# 验证记录

## 验证范围

- Azure ACS `Send` 的 30 秒默认整体 timeout、注入 client、nil fallback、HMAC/header/URL 与状态错误兼容。
- GC `doPost`、Pay、GetInvoice 的 15 秒默认整体 timeout、注入 client、nil fallback、POST/body/签名、既有 HTTP status 透传与业务状态兼容。
- FastSpring Pay/Notify 的 15 秒默认整体 timeout、同一注入 client、nil fallback、Basic Auth/URL、非成功错误与 `Created`/`Paid` 映射兼容。
- 网络错误、`context.Canceled` 和短测试 client timeout 均使用进程内 synthetic `RoundTripper`，不连接真实第三方服务。

## RED 证据

- constructor policy：`go test -count=1 ./email ./pp -run 'TestAzureACSConstructorOwnsBoundedHTTPClient|TestTargetPaymentConstructorsOwnBoundedHTTPClients'` 在旧实现分别稳定失败，原因是 Provider 不拥有可注入的 HTTP client。
- Azure 调用路径：`go test -count=1 ./email -run 'TestAzureACSSendUsesInjectedClientAndPreservesContract|TestAzureACSSendPropagatesNetworkCancelAndTimeout'` 在旧调用点稳定命中 fail-closed 默认 transport，证明 `Send` 忽略注入 client。
- GC 调用路径：`go test -count=1 ./pp -run '^TestGc'` 在旧调用点稳定命中 fail-closed 默认 transport，证明 `doPost` 忽略注入 client。
- FastSpring 调用路径：`go test -count=1 ./pp -run '^TestFastSpring'` 在旧调用点稳定命中 fail-closed 默认 transport，证明 Pay/Notify 都忽略注入 client。
- nil fallback：三类 Provider 将 client 设为 nil 后均稳定触发 nil pointer panic；加入同域 resolver 后转为 GREEN。所有 RED 都使用 synthetic endpoint/transport，无真实外网请求、任意 sleep、retry、skip 或 timeout 放宽。

## GREEN 与回归测试

- `go test -count=1 ./email ./pp -run 'TestAzureACS|TestTargetPayment|TestGc|TestFastSpring'`：通过。
- `go test -count=1 ./email ./pp`：通过。
- `go test -count=1 -tags skipCi ./...`：全仓通过；无环境或 fixture 阻断。
- `go test -race -count=1 ./email ./pp`：当前 Windows 环境 `CGO_ENABLED=0`，Go 明确拒绝 `-race`；未把该项记为通过，也未修改环境或测试语义规避限制。

## 覆盖率

- 命令：`go test -count=1 -coverprofile <temp>/bound-admin-email-cover.out ./email` 与 `go test -count=1 -coverprofile <temp>/bound-admin-pp-cover.out ./pp`，随后使用 `go tool cover -func` 检查实际修改函数。
- Azure ACS：`NewAzureACSEmailProvider`、`newAzureACSHTTPClient`、`resolveAzureACSHTTPClient` 为 100.0%，`Send` 为 86.2%。
- GC：`NewGcPaymentProvider` 为 100.0%，`doPost` 为 94.7%。
- FastSpring：`NewFastSpringPaymentProvider` 为 100.0%，`Pay` 为 85.2%，`Notify` 为 85.7%。
- 支付域 helper：`newPaymentHTTPClient`、`resolvePaymentHTTPClient` 均为 100.0%。
- 本 change 实质修改函数最低 85.2%，达到 `>=85%`；email/pp 整包平均值因包含大量未触碰 Provider 而较低，不用于替代 changed-function 门槛。临时 coverage 文件已删除。

## 静态与格式门禁

- `gofumpt -version`：仓库固定 v0.9.2；仅格式化本 change Go 文件，`gofumpt -l <changed-go-files>` 无输出。
- `go vet ./...`：通过。
- `golangci-lint`：固定 v2.11.4。首次使用本机默认 Go 1.26 时因分析器按 Go 1.25.8 构建而产生工具链版本 panic；按 CI 明确的 `GOTOOLCHAIN=go1.25.8` 重新生成临时 vendor 并运行 `golangci-lint run --config ../.golangci.yml ./...` 后为 `0 issues`。临时 vendor 已删除。

## OpenSpec 与 diff

- `openspec validate bound-admin-email-payment-http-client-lifetimes --strict`：实施前与归档前均通过。
- `openspec validate --changes --strict`：归档前通过，1 个 active change、0 失败；归档后 active changes 为空。
- `openspec validate --specs --strict`：归档前通过，55 个主规格、0 失败；归档后新增主规格并再次通过。
- `git diff --check`、`gofumpt -l admin`、`go vet ./email ./pp`：均通过或无输出。
- 最终 closeout 已使用 `sync-specs` 归档，并创建 `admin-external-service-http-client-lifetimes` 主规格；CLI 生成的临时 Purpose 占位说明已替换为中文能力说明。

## Pre-archive review

- proposal/design/tasks/delta spec/实现描述同一交付目标；15/30 秒依据、四处调用矩阵、truth owner、非目标、回滚和 RC-only 边界一致。
- 注释候选为两个 timeout policy 与两个 resolver；关键取舍均使用简洁中文说明，未给显而易见的字段或普通 JSX 类内容堆注释。
- 文档正文以简体中文为主；OpenSpec 固定标题、命令、类型、Provider、HTTP、timeout、client 等技术词保留英文。脱敏扫描仅命中 `<temp>` 与 `<changed-go-files>` 两个明确占位符。
- 测试 fixture 仅使用 `.example.test` synthetic endpoint 和 synthetic credential；无真实 IP、私有 URL、token、Cookie、账号或第三方 payload。
- 仓库根 `output/imagegen` 由历史已跟踪提交所有，不是本任务临时产物；未删除或修改。当前无 vendor、coverage、report、测试进程残留。
- 本次审查范围内未发现阻断问题，结论为 pre-archive READY；RC 只推工作分支，最终 archive 与 base 合入在主控授权后执行。

## 证据层级与剩余风险

- 以上只证明本地源码、synthetic HTTP 契约和 hermetic Go 回归，不表述为 Azure ACS、GC 或 FastSpring 真实 Provider E2E。
- 未使用真实 credential、账号、私有 URL、共享数据库或外部环境。
- FastSpring 既有非 2xx raw body 错误和 GC response body 读取策略保持不变；response body 治理、代理策略、连接池、retry 与全仓 HTTP client 统一均不属于本 change。
- 技术债路线文档已在最终 closeout 审计 `898dbb30..4c6d345b` 的归档 changes 后校准：TLS、Provider 生命周期/list-key、direct-eval 与本 HTTP lifetime 进入完成基线；Bun 保持 ACTIVE 迁移与 Yarn 当前真值边界。
