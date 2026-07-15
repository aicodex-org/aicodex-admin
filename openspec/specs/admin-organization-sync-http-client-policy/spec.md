# admin-organization-sync-http-client-policy Specification

## Purpose

规定 Admin 钉钉、飞书和企业微信组织通讯录 client 的默认 HTTP timeout、显式注入优先级、context 终止与 transport 错误脱敏边界。

## Requirements
### Requirement: 组织通讯录 client 具有一致的有界默认 timeout
Admin 的钉钉、飞书和企业微信组织通讯录 client SHALL 在未显式注入 HTTP client 时使用整体请求 timeout 为 30 秒的独立 `*http.Client`，且 SHALL NOT 通过修改全局 `http.DefaultClient` 或 `http.DefaultTransport` 实现该策略。

#### Scenario: 构造器创建默认 client
- **WHEN** 调用方使用任一 provider 的公开构造器创建通讯录 client
- **THEN** client 使用非 nil、`Timeout == 30 * time.Second` 的 HTTP client
- **AND** 三个 provider 的 timeout 值一致

#### Scenario: nil 注入回退到同一策略
- **WHEN** 通讯录 client 的 `HttpClient` 字段为 nil
- **THEN** 请求使用同样具有 30 秒整体 timeout 的 fallback client
- **AND** fallback 不依赖修改全局默认 client 或 transport

### Requirement: 显式注入 client 原样优先
Admin 组织通讯录 client MUST 原样使用调用方显式注入的非 nil `*http.Client`，不得复制、包装或改写其 timeout、transport 及其它字段。

#### Scenario: 保持注入 identity
- **WHEN** 调用方向任一 provider client 注入自定义 `*http.Client`
- **THEN** provider 的 client resolver 返回完全相同的指针
- **AND** 自定义 transport mock seam 保持可用

### Requirement: context 和 client timeout 均能终止请求
Admin 组织通讯录 client SHALL 将调用方 `context.Context` 绑定到每个请求，并 SHALL 在 context cancellation、context deadline 或 HTTP client timeout 最先到达时停止等待外部 provider。

#### Scenario: 已取消 context 快速返回
- **WHEN** 调用方使用已取消的 context 发起任一 provider 请求
- **THEN** 请求在远早于 30 秒默认 timeout 的时间内返回对应 provider 错误类型

#### Scenario: context deadline 早于默认 timeout
- **WHEN** 慢响应仍在等待且调用方 context 的短 deadline 到期
- **THEN** 请求在 deadline 边界内返回对应 provider 错误类型

#### Scenario: 显式 client timeout 限制慢响应
- **WHEN** 调用方注入带短 timeout 的 client 且本地测试 server 延迟响应
- **THEN** 请求在该 client timeout 的有界时间内返回
- **AND** 注入 client 未被替换或改写

### Requirement: transport policy 不改变 provider 契约且错误保持安全
Admin 组织通讯录 client SHALL 保持现有 endpoint、HTTP method、headers、token 获取、pagination、DTO、provider 错误类型和组织同步数据语义；transport 失败的可见错误 SHALL NOT 包含 token、`Authorization`、完整私有 endpoint 或响应 raw payload。

#### Scenario: 正常 provider 请求保持兼容
- **WHEN** 本地 `httptest` provider 返回既有成功响应和分页数据
- **THEN** 三个 client 仍按既有 method、headers、query/body 和 pagination 读取相同快照

#### Scenario: provider 错误解析保持兼容
- **WHEN** 本地 provider 返回既有 HTTP 状态、JSON 错误码或无效 JSON
- **THEN** client 返回既有 provider 错误类型和安全 operation/error 分类

#### Scenario: transport 错误不泄漏请求目标
- **WHEN** transport 因 context 或网络错误失败且原始错误包含私有 URL 或凭据
- **THEN** 可见错误保留 provider 类型和安全失败分类
- **AND** 错误文本不包含完整私有 URL、token、`Authorization` 或响应 raw payload
