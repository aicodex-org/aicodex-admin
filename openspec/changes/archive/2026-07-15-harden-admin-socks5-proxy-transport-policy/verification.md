## 验证范围

- 环境：本地 Windows workspace；Go module 为 `admin`。
- 生产写集：`admin/proxy/proxy.go`。
- 测试写集：`admin/proxy/proxy_test.go`。
- 外网、真实 SOCKS5、真实 proxy credential、60 环境和生产环境：N/A，均未访问。
- 运行态证据层级：本地 fake SOCKS5 + `httptest` transport smoke，不宣称真实企业代理或部署环境端到端通过。

## TDD RED 证据

1. 首个本地 fake SOCKS5 + 自签名 HTTPS 测试在旧实现上失败：请求被 `InsecureSkipVerify` 错误接受，`TestSOCKS5HTTPSRejectsUntrustedCertificate` 按“必须拒绝”断言失败。
2. 补齐 TLS 场景后，旧实现上的 `TestSOCKS5HTTPSRejectsUntrustedCertificate` 与 `TestSOCKS5HTTPSRejectsHostnameMismatch` 同时失败；可信测试 CA + 正确 hostname 和 plain HTTP 场景保持通过。
3. policy/fallback/日志测试在旧实现上分别因 `Transport == nil`、fallback 无显式 transport、探测日志包含完整 `<local-socks5>` 地址而失败。
4. connect、TLS handshake 与 response-header deadline 测试在最小构造函数实现前因 `newProxyHTTPClient` 缺失而编译失败，证明测试先于对应 production helper。

## TLS 与 transport GREEN 证据

`go test -v -count=1 ./proxy` 通过 15 个聚焦测试：

- 经真实本地 SOCKS5 协议握手访问不受信任 TLS 证书：拒绝。
- 测试 CA 受信任且 IP hostname 匹配：成功。
- 证书链受信任但 hostname mismatch：拒绝。
- plain HTTP 经 SOCKS5：服务端确认 `request.TLS == nil`。
- GitHub / Google 原始字符串路由、其他目标、query substring 和大小写敏感语义：兼容。
- 代理不可达：返回有界直接 fallback，不 panic。
- connect context、慢 TLS handshake、慢 response header：均在测试缩短的 deadline 内返回超时。
- 真实本地 SOCKS5 greeting 停滞：生产 SOCKS5 dialer 在测试缩短的 connect deadline 后返回，并关闭底层连接。
- 连续两个完整读取的请求只建立一个 SOCKS5 tunnel，证明 keep-alive 连接复用。
- response header 按时返回后，body 跨越更短的测试 response-header deadline 仍完整读取，证明该 deadline 不限制大文件流式 body。
- direct/fallback transport 保留 `ProxyFromEnvironment`，SOCKS5 transport 不叠加环境 HTTP proxy。
- 默认、fallback 与代理 transport：`http.Client.Timeout == 0`，保留 keep-alive，TLS 不跳过校验，TLS/response-header/idle timeout 分别为 10 秒、30 秒、90 秒；生产 connect timeout 为 10 秒。
- 探测成功日志只输出启用状态，不包含完整 proxy 地址、URL 或凭据。

上述测试仅连接 loopback listener，测试输出和本文未记录完整动态地址。

## 覆盖率

命令：

```powershell
go test -count=1 -coverprofile=proxy_coverage ./proxy
go tool cover -func=proxy_coverage
```

结果：`admin/proxy/proxy.go` statement coverage 为 91.5%，达到 >=85% 门槛。核心新增函数 `newDirectHTTPClient`、`newProxyHTTPClient`、`newBoundedTransport` 均为 100.0%；`getProxyHttpClient` 为 90.0%，实际 SOCKS5 构造函数 `newSOCKS5HTTPClient` 为 75.0%。coverage profile 验证后已删除，未进入仓库。

## 调用方与全量 Go 验证

- `go test -count=1 -tags skipCi ./controllers ./object ./certificate ./notification ./email`：通过；无测试文件的包完成编译。
- `go test -count=1 -run '^$' -tags external ./certificate`：通过，仅编译，不执行外部测试。
- `go test -count=1 -run '^$' -tags 'integration external' ./object`：通过，仅编译，不访问数据库或外部 provider。
- `make test-go-hermetic`：当前 Windows 环境缺少 `make`，入口未启动；读取 Makefile 后运行其等价命令 `go test -count=1 -tags skipCi ./...`，所有 Admin 包通过。
- 测试前后 `git status --short`：仅本 change 的 `admin/proxy/**` 与 OpenSpec artifacts，无 coverage、测试输出或其他任务产物。

## 格式化、静态检查与 OpenSpec

- `golangci-lint fmt --diff`（仓库 `gofumpt` formatter）：exit 0，无格式 diff。
- `go vet ./...`：exit 0。
- `golangci-lint version`：固定 v2.11.4，built with Go 1.25.8。
- `GOTOOLCHAIN=go1.25.8 golangci-lint run ./...`：使用完整仓库 `.golangci.yml`，结果 `0 issues.`。
- lint 的 vendor mode 首次因 workspace vendor 不一致失败；按仓库标准运行 `go mod vendor` 物化 ignored vendor。宿主 Go 1.26 与 lint 内置 Go 1.25 初次分析不一致后，将 lint 子进程固定为模块工具链 Go 1.25.8，完整配置通过；未使用 `--no-config` 或降级规则。vendor 验证后已删除，`go.mod` / `go.sum` 无 diff。
- `openspec validate harden-admin-socks5-proxy-transport-policy --strict`：通过。
- `openspec validate --changes --strict`：1 个 active change 通过。
- `openspec validate --specs --strict`：rebase 到最新基线后 41 个主规格通过。
- `git diff --check`：通过。

## RC 基线与归档前 Review

- 起始基线：`origin/hfl-test-base@7a5f478a1f1e8f71539e0ccfb11518d295886cf9`。
- RC 收口基线：任务期间远端前进到 `origin/hfl-test-base@10542c65bc1ba951b3a2f04343fe025330fba1f0`；新增内容属于独立 Web/Jest change，与本写集无冲突。
- 本 change 已无冲突 rebase 到最新基线；`origin/hfl-test-base..HEAD` 正好 1 个逻辑 commit。
- rebase 后重新运行 proxy 聚焦测试、直接调用方 `skipCi` tests/compile、OpenSpec target/changes/specs strict 和 base diff check，均通过。
- `openspec-pre-archive-review` 第二轮结论：本审查范围内 READY；初始 `release-candidate-only` 阶段未执行 archive 或主规格同步，后续主控 RC 审计通过并授权 `self-closeout=true` 后完成 archive 与主规格同步。

## Self-closeout 归档证据

- `openspec archive harden-admin-socks5-proxy-transport-policy --yes`：完成，5 项 requirements 已同步到新主规格。
- 归档路径：`openspec/changes/archive/2026-07-15-harden-admin-socks5-proxy-transport-policy/`。
- archive 后修复自动生成的占位 Purpose，并复查主规格与归档 delta 的新增自然语言、规范关键字和技术术语。
- self-closeout 期间 `origin/hfl-test-base` 由独立 schema migration、organization HTTP policy 等 change 持续推进；每次 push 前均重新 fetch/rebase 并确认与 `admin/proxy/**` 和本 capability 无冲突，最终基线 SHA 由 closeout 结构化回传记录。
- `test` 分支不在本任务操作范围内；归档、提交与基线 push 不改变该约束。

## 只读代码审查

- 调用方 inventory subagent：只读完成，确认所有直接调用方、external build tag 测试和既有 fallback/路由歧义；`changed_files=[]`。
- Go TLS/Transport reviewer：生产实现未发现 Critical 或确定性连接/goroutine 泄漏；最初指出真实 SOCKS5 greeting stall、连接复用和慢 body 行为证据不足。
- 已补充上述行为测试并重跑 GREEN/coverage。subagent 未编辑、未 commit、未 push、未 archive，也未释放 lease。

## 兼容性与剩余风险

- 保持 `socks5Proxy` key、100ms TCP 探测、大小写敏感 `strings.Contains` 路由和不可达直接 fallback。
- 默认/fallback transport 继续继承标准 `ProxyFromEnvironment` 行为；SOCKS5 transport 明确清除环境 HTTP proxy，避免双重代理。
- 100ms 探测误判、原始字符串路由过宽、直接 fallback 可能不符合部分操作者的路由期望，以及 `InitHttpClient` 前全局 client 可能为 `nil` 均为既有语义，本 change 未扩大范围。
- 仓库内没有真实企业代理依赖不可信目标证书的证据。若出现该依赖，应停止发布并设计可信 CA 分发，不得恢复无条件 `InsecureSkipVerify`。
