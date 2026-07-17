## ADDED Requirements

### Requirement: 目标邮件和支付外呼必须使用有界默认 client
Admin 的 Azure ACS 邮件 Provider SHALL 在未显式注入 HTTP client 时使用整体请求 `Timeout == 30 * time.Second` 的独立 client；GC Payment 与 FastSpring Provider SHALL 使用整体请求 `Timeout == 15 * time.Second` 的独立 client。目标 Provider MUST NOT 通过修改全局 `http.DefaultClient` 或 `http.DefaultTransport` 实现该策略。

#### Scenario: constructor 创建有界默认 client
- **WHEN** 调用方使用 Azure ACS、GC Payment 或 FastSpring 的既有公开 constructor
- **THEN** Provider 持有非 nil 的独立 HTTP client
- **AND** Azure ACS timeout 为 30 秒，GC 与 FastSpring timeout 为 15 秒

#### Scenario: nil client 回退到同域策略
- **WHEN** 目标 Provider 的私有 client 为 nil 并执行外呼
- **THEN** 请求仍使用对应 30 秒或 15 秒整体 timeout 的 fallback client
- **AND** fallback 不依赖修改全局默认 client 或 transport

### Requirement: 局部注入 client 必须原样优先
目标 Provider MUST 原样使用同包测试或局部调用边界注入的非 nil `*http.Client`，不得复制、包装或改写其 timeout、Transport 及其它字段。

#### Scenario: 注入受控 Transport
- **WHEN** 目标 Provider 被注入带自定义 Transport 和 timeout 的 HTTP client
- **THEN** 请求通过该 client 执行
- **AND** 请求完成后 client identity、Transport 和 timeout 保持不变

### Requirement: timeout 和 cancellation 必须终止外部等待
目标 Provider SHALL 在 HTTP client timeout、request context cancellation 或 transport 错误发生时停止等待并通过既有方法错误边界返回，且 MUST NOT 增加自动 retry、任意 sleep 或无界等待。

#### Scenario: client timeout 先到达
- **WHEN** 受控 transport 在等待且注入 client 的短 timeout 到期
- **THEN** Provider 在测试边界内返回 timeout 错误
- **AND** 不等待生产 15 秒或 30 秒 timeout

#### Scenario: transport 返回 cancellation
- **WHEN** 受控 transport 返回 `context.Canceled`
- **THEN** Provider 通过既有错误返回路径结束调用
- **AND** 不重试或改写业务状态

#### Scenario: transport 返回网络错误
- **WHEN** 受控 transport 返回网络错误
- **THEN** Provider 通过既有错误返回路径返回该失败
- **AND** 不输出 request credential 或 response raw body

### Requirement: 既有邮件和支付协议契约必须保持稳定
本 change SHALL 保持 Azure ACS HMAC/headers/URL 与状态错误、GC POST/body/response 解析、FastSpring Basic Auth/URL/成功状态/非成功错误以及 `Created`/`Paid` 映射不变，并 SHALL NOT 修改 Provider constructor、`EmailProvider`/`PaymentProvider` 接口或运行时配置。

#### Scenario: Azure ACS 成功与状态错误
- **WHEN** 受控 transport 返回 202、400/401 或其它非 202 状态
- **THEN** `Send` 保持既有成功、CommunicationError 或 status-only 错误语义
- **AND** 请求继续携带既有 HMAC、repeatability 和 Content-Type headers

#### Scenario: GC 成功与 Provider 业务错误
- **WHEN** 受控 transport 返回既有 GC 成功 payload 或非 SUCCESS payload
- **THEN** `Pay`/`GetInvoice` 保持既有 DTO、URL、开票中及 Provider 错误语义
- **AND** 请求继续使用既有 POST、Content-Type、签名与 body 格式

#### Scenario: FastSpring Pay 成功与非成功状态
- **WHEN** 受控 transport 返回 200/201 session response 或其它 HTTP 状态
- **THEN** `Pay` 保持 checkout URL/OrderId 或既有 `fastspring API error` 语义
- **AND** Basic Auth、session URL 和 JSON payload 保持不变

#### Scenario: FastSpring Notify 保持 pending 和 paid 映射
- **WHEN** 受控 transport 返回 404、未完成订单或已完成订单
- **THEN** `Notify` 分别保持 `PaymentStateCreated`、`PaymentStateCreated` 或 `PaymentStatePaid`
- **AND** order URL、Basic Auth、tags 与金额/币种映射保持不变

### Requirement: 验证必须保持 hermetic 和脱敏
目标外呼的自动化验证 MUST 使用受控 `RoundTripper` 或本地 synthetic response，MUST NOT 访问真实第三方服务、使用真实 credential、记录完整私有 endpoint，或把本地契约测试表述为真实 Provider E2E。

#### Scenario: 执行回归测试
- **WHEN** 测试覆盖成功、状态错误、pending、网络错误、timeout 或 cancel
- **THEN** 所有请求和响应均来自进程内 synthetic fixture
- **AND** 测试输出与验证记录不包含真实 credential、私有 URL 或真实第三方 payload
