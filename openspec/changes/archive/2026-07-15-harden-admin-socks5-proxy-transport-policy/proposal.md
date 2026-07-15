## Why

Admin 的 SOCKS5 出站客户端当前对 HTTPS 无条件设置 `InsecureSkipVerify`，使证书链和 hostname 校验失效；同时代理与无代理路径缺少明确的连接、TLS 握手、响应头和空闲连接边界，外部资源访问可能无限等待。需要在不改变现有代理配置、路由选择和 fallback 语义的前提下收紧传输安全策略。

## What Changes

- SOCKS5 HTTPS transport 恢复 Go 标准证书链与 hostname 校验，不增加 production insecure 开关。
- 为代理和无代理客户端建立适合流式下载的有界 transport policy，明确 dial/connect、TLS handshake、response-header 与 idle connection timeout，同时不设置过短的整体 `http.Client.Timeout`。
- 保持 `socks5Proxy` 配置 key、代理可达探测、`githubusercontent.com` / `googleusercontent.com` 路由选择和代理不可达时的安全 fallback 行为兼容。
- 增加 hermetic 测试，覆盖不受信任证书、受信任 CA、hostname 错误、HTTP 明文路径、目标域选择、代理不可达 fallback 和 transport deadline。

## Capabilities

### New Capabilities

- `admin-socks5-proxy-transport-policy`: 定义 Admin SOCKS5 与无代理出站 HTTP client 的 TLS 校验、有限 transport deadline、路由选择和安全 fallback 契约。

### Modified Capabilities

- 无。

## Impact

- 生产代码仅影响 `admin/proxy/**`；不改变业务调用方 API、provider/runtime 配置或 organization client。
- 保持现有 `golang.org/x/net/proxy` 依赖，不新增依赖、配置项或敏感日志。
- 测试使用本地 listener、`httptest` 与测试 CA，不访问外网、真实代理或真实凭据。
