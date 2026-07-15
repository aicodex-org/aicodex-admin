## Why

钉钉、飞书和企业微信通讯录 client 的默认路径当前使用没有整体请求超时的 `http.DefaultClient`。当上层 `context.Context` 未设置 deadline 且外部连接无响应时，组织同步或连接测试可能无限等待，因此需要在不改变 provider 契约的前提下建立有界、可测试的默认 HTTP client policy。

## What Changes

- 为三个通讯录 client 建立一致的 30 秒默认整体请求超时；该值沿用同仓 `syncer_dingtalk.go`、`syncer_lark.go`、`syncer_wecom.go` 等 connector 的既有惯例。
- 保持调用方显式注入的 `*http.Client` 指针原样优先，既不复制、包装，也不改写其 timeout、transport 或其它字段。
- 继续使用每个请求携带的 `context.Context`，使调用方 cancellation/deadline 能早于默认超时终止请求。
- 对 transport 失败保留现有 provider 错误类型，同时确保错误摘要不包含 token、`Authorization`、完整私有 endpoint 或响应 raw payload。
- 使用 `httptest` 和受控 `RoundTripper` 覆盖默认策略、注入 identity、context 取消/超时、慢响应边界及既有请求、分页和错误解析行为。
- 不修改全局 `http.DefaultClient`/`http.DefaultTransport`，不增加 retry、熔断、credential storage、全仓 HTTP 抽象、TLS bypass 或响应体大小上限。

## Capabilities

### New Capabilities

- `admin-organization-sync-http-client-policy`: 规定 Admin 钉钉、飞书和企业微信组织同步通讯录 client 的默认 timeout、显式注入优先级、context 终止和安全错误边界。

### Modified Capabilities

无。provider endpoint、method、header、token、pagination、DTO、错误类型和组织同步数据语义保持既有主规格不变。

## Impact

- 生产代码限于 `admin/object` 下三个组织通讯录 client 及一个同目录专用 HTTP policy helper。
- 测试限于对应 client 测试和同目录 policy 测试，不使用真实 provider 凭据或 endpoint。
- 不新增依赖，不修改运行时配置、scheduler/lifecycle、schema/migration、proxy、前端、workflow 或锁文件。
