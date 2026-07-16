## Why

Admin 已通过 `SetHttpClient` 为 IdP 注入代理或默认出站 client，但 Gitee、LinkedIn 等实现仍绕过注入，部分fallback无总超时，并存在未关闭响应体、忽略request错误、未检查HTTP状态以及敏感参数进入URL的问题。该偏差会让代理开关失效、请求无限等待或在错误与中间链路中暴露credential，因此需要在当前IdP边界内建立最小、可回归的HTTP client契约。

## What Changes

- 为 `admin/idp` 增加私有共享HTTP执行边界：优先返回调用方注入的 `*http.Client` 且不改写其Transport；nil时使用带总超时的独立fallback。
- 修复 Gitee、LinkedIn与Casdoor token/profile请求：使用注入client，token exchange使用provider要求的form body，profile token使用Authorization header，检查request创建错误、非2xx并关闭response body；Casdoor错误不再回显access token。
- 让 Lark 的nil client fallback有界，并收敛第三方错误为status/code等安全诊断，不回显响应body、secret或token。
- 让 WeChat Mini Program在直接构造调用下使用有界fallback，保留显式注入覆盖；继续遵循其 `jscode2session` query协议，但错误不得回显包含secret/code的URL或响应body。
- 增加高价值table-driven测试，证明注入client及其Transport被实际使用、fallback有界、body关闭、成功DTO不变、request/non-2xx错误可操作且脱敏。
- 系统审计其它 `SetHttpClient` 实现并记录后续范围；不将本change扩大为全仓HTTP client重写。

## Capabilities

### New Capabilities

- `admin-idp-http-client-contract`: 定义Admin IdP出站请求的client注入、fallback时限、credential传输、响应生命周期、状态错误与脱敏测试契约。

### Modified Capabilities

无。

## Impact

- 生产代码限定在 `admin/idp` 的私有HTTP helper及 Gitee、LinkedIn、Casdoor、Lark、WeChat Mini Program实现；默认不修改 `admin/controllers/auth.go` 运行逻辑。
- 不改变Provider配置、OAuth callback path、API envelope、代理选择规则、endpoint、scope或成功DTO映射。
- 不修改 `admin/idp/metamask.go`、`admin/idp/web3onboard.go`、`admin/idp/provider.go`、前端依赖、CI、数据库/schema、runtime config或Insight Provider。
- ADFS、Active Directory、SMTP的TLS兼容策略和其它历史Provider问题只记录为后续，不在本change处理。
