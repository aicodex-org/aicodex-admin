## ADDED Requirements

### Requirement: SOCKS5 HTTPS 必须执行标准 TLS 身份校验
Admin 经 SOCKS5 transport 访问 HTTPS 目标时 MUST 使用系统 Root CA 信任链并校验请求 hostname，且 MUST NOT 在 production 中无条件跳过证书校验或提供 insecure TLS 开关。

#### Scenario: 不受信任的目标证书被拒绝
- **WHEN** SOCKS5 transport 访问由不受信任 CA 签发的 HTTPS 目标
- **THEN** 请求 MUST 因证书验证失败而终止

#### Scenario: 可信证书和正确 hostname 可以访问
- **WHEN** 测试 transport 信任目标 CA 且请求 hostname 与证书匹配
- **THEN** SOCKS5 transport MUST 成功完成 HTTPS 请求

#### Scenario: hostname 不匹配被拒绝
- **WHEN** 目标证书链受信任但请求 hostname 与证书不匹配
- **THEN** 请求 MUST 因 hostname 校验失败而终止

### Requirement: SOCKS5 不得改变目标协议
Admin SOCKS5 transport MUST 只替换连接建立路径，HTTP 或 HTTPS 语义仍由请求 URL scheme 决定；HTTPS MUST 在 SOCKS5 隧道上继续执行 TLS，plain HTTP MUST NOT 被误当作 TLS。

#### Scenario: plain HTTP 通过注入 dialer 保持明文协议
- **WHEN** 客户端通过代理 dialer 请求本地 plain HTTP 目标
- **THEN** 请求 MUST 成功且服务端 MUST 收到普通 HTTP 请求

#### Scenario: HTTPS 通过 SOCKS5 后仍执行 TLS
- **WHEN** 客户端通过 SOCKS5 dialer 请求 HTTPS 目标
- **THEN** transport MUST 在 SOCKS5 连接建立后执行标准 TLS 握手与校验

### Requirement: 出站 transport 阶段必须有界
Admin 默认、fallback 和 SOCKS5 transport MUST 设置正数且适合外部资源访问的 dial/connect、TLS handshake、response-header 和 idle connection timeout。客户端 MUST NOT 通过过短的整体 `http.Client.Timeout` 限制合法的大文件 response body 流式读取。

#### Scenario: transport policy 字段明确且合理
- **WHEN** Admin 初始化默认、fallback 或 SOCKS5 HTTP client
- **THEN** 对应 transport 的 dial/connect、TLS handshake、response-header 和 idle connection timeout MUST 为正数
- **AND** `http.Client.Timeout` MUST 保持零值

#### Scenario: 慢 TLS 握手不会无限等待
- **WHEN** TCP 连接建立后目标未在 TLS handshake deadline 内完成握手
- **THEN** 请求 MUST 以超时错误终止

#### Scenario: 慢响应头不会无限等待
- **WHEN** 目标未在 response-header deadline 内返回响应头
- **THEN** 请求 MUST 以超时错误终止

#### Scenario: SOCKS5 连接或协议握手不会无限等待
- **WHEN** SOCKS5 dialer 未在 connect deadline 内完成连接或协议握手
- **THEN** transport MUST 取消该连接尝试并返回超时错误

### Requirement: 代理选择与 fallback 必须兼容
Admin MUST 保持 `socks5Proxy` 配置 key、100ms TCP 可达探测、现有大小写敏感原始字符串路由规则和代理不可达时的直接访问 fallback。fallback MUST 使用安全 TLS 校验和有界 transport policy，且 MUST NOT panic。

#### Scenario: GitHub 和 Google 资源选择代理客户端
- **WHEN** 原始 URL 字符串包含 `githubusercontent.com` 或 `googleusercontent.com`
- **THEN** `GetHttpClient` MUST 返回 `ProxyHttpClient`

#### Scenario: 其他目标选择默认客户端
- **WHEN** 原始 URL 字符串不包含两个目标域字符串
- **THEN** `GetHttpClient` MUST 返回 `DefaultHttpClient`

#### Scenario: 路由继续使用既有原始字符串规则
- **WHEN** 目标域字符串出现在原始 URL 的非 hostname 部分或使用不同大小写
- **THEN** `GetHttpClient` MUST 保持现有大小写敏感 `strings.Contains` 结果

#### Scenario: 代理不可达时安全 fallback
- **WHEN** `socks5Proxy` 已配置但 TCP 可达探测失败
- **THEN** `ProxyHttpClient` MUST 使用直接 fallback 而不是 panic
- **AND** fallback MUST 执行标准 TLS 校验与 transport deadline

### Requirement: 代理诊断不得泄露敏感连接信息
Admin 的代理探测和 transport 初始化 MUST NOT 记录 proxy 密码、完整私有 proxy 地址或完整目标 URL。

#### Scenario: 代理探测成功日志经过脱敏
- **WHEN** SOCKS5 代理 TCP 可达探测成功
- **THEN** 日志 MAY 表示代理已启用
- **AND** 日志 MUST NOT 包含完整代理地址、密码或目标 URL
