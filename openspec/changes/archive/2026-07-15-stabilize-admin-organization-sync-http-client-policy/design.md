## Context

`DingTalkAddressBookClient`、`FeishuAddressBookClient` 和 `WecomAddressBookClient` 均允许调用方通过公开字段注入 `*http.Client`，请求也都使用 `http.NewRequestWithContext`。但构造器或 nil fallback 仍使用 `http.DefaultClient`，其整体 `Timeout` 为零；上层组织同步、dry-run 或连接测试若传入没有 deadline 的 context，外呼可能无限等待。

同仓旧版 `syncer_dingtalk.go`、`syncer_lark.go`、`syncer_wecom.go` 和其它 connector 多次使用 `30 * time.Second`，因此 30 秒是已有兼容惯例。三个 client 现有 API、分页、token、DTO 和错误类型是 provider contract 的 consumer，本 change 只治理 transport policy。

## Goals / Non-Goals

**Goals:**

- 三个 client 的默认和 nil fallback HTTP client 都具有一致、非零、可测试的 30 秒整体请求 timeout。
- 显式注入的 `*http.Client` 保持指针 identity 和全部配置不变。
- 请求继续由调用方 context 控制，cancellation/deadline 可以早于 client timeout 返回。
- transport 失败继续返回各 provider 的既有错误类型，但错误文本不泄漏 token、`Authorization`、完整私有 endpoint 或响应 raw payload。
- 通过 hermetic 测试证明 policy 与 provider 行为兼容。

**Non-Goals:**

- 不增加自动 retry、退避、熔断、credential storage、全仓 HTTP client 抽象或 TLS bypass。
- 不修改 provider endpoint、method、header、token 获取、pagination、DTO、错误类型或同步数据语义。
- 不修改全局 `http.DefaultClient` 或 `http.DefaultTransport`。
- 不增加响应体大小上限。当前各 provider 的真实分页响应上限没有足够证据支撑统一 cutoff，贸然限制可能截断合法组织数据。

## Decisions

### 1. 使用同包专用 policy helper，默认 timeout 固定为 30 秒

新增 `admin/object/organization_http_client_policy.go`，集中定义 30 秒常量、默认 client 构造和 injected-or-default 选择。构造器各自创建一个独立的默认 client；手工零值 struct 的 nil fallback 也通过同一 helper 得到相同 policy。

选择独立 client 而不是可变包级单例，可避免某个调用方修改返回 client 后影响其它 provider。选择共享窄 helper 而不是在三个文件分别复制常量，可防止 timeout 漂移。不会建设全仓 abstraction；helper 仅服务这三个 organization client。

### 2. 注入 client 原样优先

policy resolver 在入参非 nil 时直接返回同一指针，不克隆、不包装、不填充 timeout，也不替换 transport。这样保留现有 `httptest`/自定义 `RoundTripper` seam，并尊重调用方对更短或更长 timeout 的显式选择。

未选择“克隆注入 client 后补 timeout”，因为这会改变 identity、transport 共享语义和 mock 观察点；也未选择修改 `http.DefaultClient.Timeout`，因为这会改变进程内无关外呼。

### 3. client timeout 与 request context 共同生效

所有现有请求继续使用 `http.NewRequestWithContext`。默认 30 秒为上层无 deadline 时的最终边界；若调用方 context 更早取消或到期，`net/http` 按更早边界终止。不会在每个方法内部再套一层固定 context timeout，以免覆盖调用方更短 deadline 或改变现有 context 传播。

### 4. transport cause 只保留安全分类

`http.Client.Do` 返回的 `url.Error` 可能携带完整请求 URL，其中钉钉、企业微信 token/secret 还可能位于 query。三个 client 仍构造各自原有 `DingTalkApiError`、`FeishuApiError`、`WecomApiError`，但 cause 只保留 `context canceled`、`context deadline exceeded` 或通用 `transport error` 分类，不回显原始 URL。provider HTTP 状态、JSON 错误码和既有响应解析路径保持不变。

未选择记录原始 transport error 后再靠调用方脱敏，因为错误可能先被页面、日志或测试直接格式化；在 connector 边界收敛最可靠。

### 5. 测试分层

新增 table-driven policy 测试，以统一 adapter 覆盖三个 client：默认 timeout 一致、显式注入 identity、预取消/短 deadline、慢 server client-timeout 和安全错误文本。保留并运行三个现有 provider 测试，继续覆盖正常 token 请求、headers、分页、fallback、DTO 和 provider 错误解析。

慢 server 使用本地 `httptest.Server` 与短 timeout 的显式 client，不等待生产 30 秒；默认值本身通过字段断言验证。测试不连接真实 provider，也不保存真实凭据。

## Risks / Trade-offs

- [30 秒可能短于极端慢响应] → 该值与同仓三个旧 connector 的惯例一致；调用方仍可显式注入不同 timeout 的 client。
- [手工零值 client 每次 fallback 会创建新 client] → 正常生产路径均使用构造器并复用其 client；零值路径只作为兼容兜底，且底层仍使用标准 `http.DefaultTransport` 连接池。
- [安全 cause 分类减少底层网络诊断细节] → 保留 provider、operation、错误类型和 context 分类；不以泄漏完整 URL/凭据换取诊断细节。
- [没有真实 provider E2E] → 本 change 是 connector transport policy，使用真实凭据反而超出安全边界；通过 hermetic HTTP contract 测试验证可观察行为，并明确 browser/60 环境验证为 N/A。

## Migration Plan

1. 先以失败测试固定默认 timeout、注入 identity、context 和安全错误契约。
2. 引入专用 helper并切换三个构造器和 nil fallback。
3. 收敛 transport cause，运行 provider 聚焦测试、full hermetic、格式化、vet、lint 和 OpenSpec 校验。
4. 发布仅需替换 Admin 二进制；无配置、数据或 schema 迁移。若出现兼容问题，可回退该单一 change commit。

## Open Questions

无。timeout、注入优先级、context 语义、写集和非目标均已由任务约束及现有代码证据确定。
