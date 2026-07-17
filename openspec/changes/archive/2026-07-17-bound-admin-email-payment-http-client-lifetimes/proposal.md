## Why

Azure ACS 邮件、GC Payment 以及 FastSpring Pay/Notify 当前在每次请求时创建 `Timeout == 0` 的裸 `http.Client`。当外部服务建立连接后不再响应或 transport 长时间阻塞时，Admin 的邮件发送、支付创建、支付通知查询或开票调用可能无限等待，因此需要在不改变第三方业务契约的前提下补齐有界请求生命周期。

## What Changes

- Azure ACS 默认使用整体请求 timeout 为 30 秒的独立 HTTP client；该值沿用同仓邮件/通知与 IdP connector 的既有惯例。
- GC Payment 与 FastSpring Pay/Notify 默认使用整体请求 timeout 为 15 秒的独立 HTTP client；该值沿用同支付包 Airwallex 的既有惯例。
- 为三个 Provider 保留局部、可测试的 `*http.Client` 注入边界；显式注入 client 原样优先，nil 路径回退到各自域内的有界默认 client。
- 以受控 `RoundTripper` 和本地响应覆盖成功、既有非 2xx/`Created` pending 语义、网络错误、timeout/cancel 以及 constructor/请求契约兼容。
- 不增加 retry、代理重写、response body 治理或全仓 HTTP client abstraction，不修改认证、签名、URL、业务状态、错误文本和 Provider 接口。

## Capabilities

### New Capabilities

- `admin-external-service-http-client-lifetimes`: 规定 Azure ACS、GC Payment 和 FastSpring 目标外呼的默认整体 timeout、显式注入优先级、终止行为与既有业务契约兼容边界。

### Modified Capabilities

无。

## Impact

- 生产代码限于 `admin/email/azure_acs.go`、`admin/pp/gc.go`、`admin/pp/fastspring.go` 及必要的同包局部 HTTP client helper。
- 测试限于上述 Provider 的直接测试，不连接真实第三方服务，不使用真实 credential。
- 不修改 Provider constructor 签名、`EmailProvider`/`PaymentProvider` 接口、运行时配置、数据库/schema、前端、依赖或 workflow。
