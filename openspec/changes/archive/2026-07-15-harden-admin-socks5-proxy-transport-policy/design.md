## Context

`admin/proxy/proxy.go` 初始化两个进程级 HTTP client：默认客户端供普通出站访问使用，代理客户端供 GitHub、Google 资源和显式代理调用方使用。当前 SOCKS5 transport 通过 `Dial` 接入代理，却对所有 HTTPS 连接无条件设置 `InsecureSkipVerify`；空配置或 100ms TCP 探测失败时则返回隐式使用 `http.DefaultTransport` 的直接客户端。两条路径都没有明确的 transport deadline。

本 change 只治理 `admin/proxy/**`。`socks5Proxy` 仍是唯一配置入口；调用方、原始 URL 字符串匹配规则、100ms 可达探测和代理不可达时直接访问的 fallback 保持兼容。仓库没有证据表明生产代理必须依赖不可信目标证书，因此不引入 insecure TLS 逃生开关；如果后续发现这种依赖，应由新的显式证书信任设计处理，而不是恢复跳过校验。

## Goals / Non-Goals

**Goals:**

- 经 SOCKS5 建立的 HTTPS 连接执行系统 Root CA 证书链和 hostname 校验。
- 代理与无代理 transport 都具有明确的 connect、TLS handshake、response-header 和 idle connection timeout。
- 保持 HTTP keep-alive、连接池复用和大文件流式下载，不设置整体 `http.Client.Timeout`。
- 通过本地、hermetic 测试证明 TLS、HTTP、路由、fallback 和超时行为。
- 日志不输出完整代理地址、URL 或认证材料。

**Non-Goals:**

- 不重写全仓 HTTP client，不修改业务调用方、provider/runtime config、organization client、SMTP SOCKS5 路径或认证流程。
- 不改变 `GetHttpClient` 现有大小写敏感 `strings.Contains` 选择规则，即使域名字样出现在非 hostname 部分也保持既有选择结果。
- 不改变 100ms TCP 可达探测为 SOCKS5 协议健康检查，也不改变代理不可达时继续直接访问的 fallback。
- 不新增 production insecure TLS 开关、自定义 CA 配置或代理凭据处理。
- 不处理 `InitHttpClient` 调用前全局 client 可能为 `nil` 的既有生命周期约束。

## Decisions

### 1. 克隆标准 `http.DefaultTransport` 后做最小配置

默认与 fallback transport 从 `http.DefaultTransport.(*http.Transport).Clone()` 建立，并显式配置 `net.Dialer.Timeout`、`TLSHandshakeTimeout`、`ResponseHeaderTimeout` 和 `IdleConnTimeout`。建议默认值分别为 10 秒、10 秒、30 秒和 90 秒；这些值能限制连接与首部阶段，又不会限制响应 body 的持续读取。

代理 transport 复用同一基线，但清除环境 HTTP proxy 解析并用 SOCKS5 `DialContext` 替换连接函数，避免将 SOCKS5 连接再次转发给环境代理。transport 不设置 `TLSClientConfig.InsecureSkipVerify`；`TLSClientConfig` 保持标准默认值，以使用系统 Root CA 和请求 hostname。`http.Client.Timeout` 保持零值，允许合法大文件流式下载，调用方仍可使用 request context 施加更窄的操作边界。

备选方案一是继续使用新的 `http.Transport` 字面量并只删除 `InsecureSkipVerify`，但这会遗漏标准 transport 的连接池、HTTP/2 尝试和后续默认值。备选方案二是直接修改全局 `http.DefaultTransport`，但这会产生跨包全局副作用，无法限定在本 change 的调用面。两者均不采用。

### 2. SOCKS5 使用 context-aware connect deadline

生产 SOCKS5 dialer 使用带 10 秒 `Timeout` 和 keep-alive 的 `net.Dialer` 作为 forward dialer，并要求 `golang.org/x/net/proxy.ContextDialer`。transport 的 `DialContext` 再建立 10 秒子 context，使 TCP 连接和 SOCKS5 协议握手都受到同一连接边界约束；`x/net/proxy` 会在 context 取消时中断 SOCKS5 握手。若 SOCKS5 dialer 无法构造或不支持 context，沿用安全的直接 fallback，不 panic。

备选方案是使用仅有 `Dial` 的接口并在 goroutine 中模拟 context；该方案可能在底层阻塞时遗留 goroutine/连接，不采用。

### 3. 保持 fallback 和路由兼容

配置为空、TCP 探测失败、dialer 构造失败或 dialer 不满足 context 能力时，`ProxyHttpClient` 使用与 `DefaultHttpClient` 相同策略创建的直接客户端。该 fallback 仍可能遵循 `http.DefaultTransport` 的环境代理规则，这是现有无代理路径的兼容行为；它不会跳过 HTTPS 校验，也不会 panic。

`GetHttpClient` 继续对原始输入执行大小写敏感的 `strings.Contains`，包含 `githubusercontent.com` 或 `googleusercontent.com` 时返回 `ProxyHttpClient`，否则返回 `DefaultHttpClient`。本 change 用测试锁定该规则，不扩大到 URL hostname 解析。

### 4. 测试在 dialer 边界注入本地连接

聚焦测试直接构造代理 transport 并注入 context-aware dialer，将请求目标映射到本地 `httptest` server。测试 CA 只注入测试 transport，不进入 production 配置。测试覆盖不可信证书、可信 CA、hostname mismatch、plain HTTP、慢 TLS 握手、慢响应头、连接超时、路由选择、fallback 和策略字段；不访问外网或真实代理。

如实现成本保持在测试侧，可增加最小本地 fake SOCKS5 listener 做端到端 smoke；它仅转发至本地目标并且不记录目标或代理敏感值。

## Risks / Trade-offs

- [风险] 原先依赖不可信目标证书的环境会在升级后请求失败。→ 这是本次安全修复的预期 fail-closed 行为；不提供绕过，后续应通过可信 CA/证书治理解决。
- [风险] 30 秒响应头边界可能中断极慢的上游。→ 仅限制首部等待，不限制 body 流式读取；取值明显高于常见 API 首部延迟。
- [风险] 100ms 端口探测存在误判和 TOCTOU。→ 为保持配置和 fallback 兼容，本 change 不调整探测语义；实际连接仍有独立 10 秒 deadline。
- [风险] 原始字符串路由可能误命中非目标 hostname。→ 本 change 只做 transport 安全收紧，以自动化测试锁定现有行为，避免混入路由契约变更。
- [风险] 直接 fallback 可能绕过操作者期望的 SOCKS5 路由。→ 这是现有行为；proposal/spec 明确记录但不借安全修复改变可用性语义。

## Migration Plan

1. 先以失败测试复现当前 TLS 绕过、缺失 deadline 和敏感地址日志。
2. 在 `admin/proxy` 内引入标准 transport policy 和 context-aware SOCKS5 dialer，保持公共函数与全局变量签名不变。
3. 运行聚焦测试、调用方 compile/tests、全量 hermetic、覆盖率和静态检查。
4. 初始 RC 仅推送工作分支；主控审计通过并授权 `self-closeout=true` 后，再 archive、同步主规格并普通推送 `hfl-test-base`；任何阶段均不操作 `test`。

回滚时可回退单个 change commit；不涉及数据迁移、配置迁移或依赖变更。

## Open Questions

无。若真实企业代理被确认必须依赖不可信目标 TLS，停止当前发布路径并由主控决定可信 CA 分发方案；不得恢复无条件 `InsecureSkipVerify`。
