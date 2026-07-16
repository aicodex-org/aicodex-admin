## Context

`admin/controllers/auth.go` 已按Provider类型调用 `SetHttpClient`，注入 `proxy.ProxyHttpClient` 或 `proxy.DefaultHttpClient`。这两个client的Transport已有连接、TLS handshake和response header边界；IdP实现必须使用同一个client对象，不能克隆或覆盖Transport，否则会丢失代理和系统Root CA策略。

最新审计确认五个同一抽象内的高风险偏差：Gitee/LinkedIn部分请求直接使用 `http.DefaultClient`，Casdoor token exchange使用包级 `http.PostForm`；Lark在nil时回退同一无总超时全局client；WeChat Mini Program由非IdP controller路径直接构造无Timeout client。Gitee/LinkedIn token exchange还把secret放在URL，Casdoor过期分支把access token作为错误返回，多个路径未统一检查request/status/body生命周期。其它Provider也有历史问题，但若一并修复会扩大为全仓HTTP重写或触碰并行Web3/TLS边界。

## Goals / Non-Goals

**Goals:**

- 让当前五个Provider的每个出站请求实际使用注入client，或在nil/直接构造时使用30秒总超时fallback。
- 保持注入client及其Transport指针不变，延续controller的proxy/default选择。
- 将Gitee/LinkedIn token exchange改为form body，将profile token放入Authorization header。
- 统一关闭response body、拒绝非2xx，并让request/transport/status/decode错误不包含secret、token、authorization code或response body。
- 保持endpoint、scope、callback、成功DTO和API envelope不变，并以table-driven fake transport/HTTP server测试证明。

**Non-Goals:**

- 不修改 `admin/idp/provider.go`、MetaMask、Web3Onboard或前端package/lock。
- 不处理ADFS、Active Directory、SMTP的 `InsecureSkipVerify` 兼容策略。
- 不治理WeChat/WeCom等其它既有query-token接口，不建设全仓HTTP wrapper。
- 不访问真实第三方账号，不把fake server测试描述为provider E2E。

## Decisions

1. **在 `admin/idp` 内增加私有共享helper。** `resolveIdPHTTPClient` 原样返回非nil注入client；nil时新建 `Timeout: 30 * time.Second` 的client。`executeIdPRequest` 负责Do、非2xx判断、读取与关闭body，并仅返回provider、operation、status/stage等脱敏诊断。相比各Provider复制逻辑，该方案减少漂移；相比controller或全仓wrapper，不扩大写集且覆盖MiniProgram直接调用。
2. **request构造和credential编码保留在Provider内。** Gitee/LinkedIn/Casdoor token请求用 `url.Values.Encode()` 作为 `application/x-www-form-urlencoded` body；Gitee profile使用 `Authorization: token <access_token>`，LinkedIn与Casdoor profile使用 `Authorization: Bearer <access_token>`。Lark继续使用既有JSON token body。WeChat Mini Program的 `jscode2session` 官方协议要求 `appid/secret/js_code` query，保留该例外，但任何错误不得包含完整URL、query或response body。
3. **不包装可能携带URL/query/body的底层错误。** request创建、transport、body读取、decode错误以provider+operation+stage返回；non-2xx只包含status。Provider业务错误只保留数值/字符串error code等非敏感标识，不回显 `msg`、`error_description` 或原始body。
4. **按TDD分三轮实施。** 先写共享client/响应生命周期RED测试，再写Gitee/LinkedIn/Casdoor credential、注入和脱敏RED测试，最后写Lark/MiniProgram fallback与脱敏RED测试；每轮确认因现有违规而失败后才写最小生产代码。
5. **controller运行逻辑保持不变。** 通过自定义RoundTripper断言注入client被调用且Transport指针未改变；仅当现有controller测试无法证明注入选择时才补最小契约测试，默认不修改 `auth.go`。

## Risks / Trade-offs

- [共享helper过度抽象] → 只承担client解析、HTTP执行和响应生命周期，不抽象provider URL、payload或DTO。
- [错误脱敏降低第三方诊断细节] → 保留provider、operation、stage、HTTP status与provider error code；完整第三方body不进入普通错误链。
- [30秒fallback改变无界等待] → 仅影响未注入或MiniProgram直接构造路径；注入client及其Transport保持原样。
- [Gitee Authorization header兼容] → 使用Gitee API既有OAuth token header语义，并以请求契约测试固定；不改变endpoint或成功DTO。
- [系统审计发现更多违规] → 只记录不属于五个当前实现或需跨包/TLS设计的问题，留给后续change。

## Migration Plan

1. 先合入测试与私有helper，再逐Provider切换请求路径；不需要数据迁移或配置迁移。
2. 通过 `admin/idp` 聚焦测试、全包测试、覆盖率、vet与lint后归档同步主规格。
3. 如回归，单commit回退即可恢复旧请求实现；不涉及schema、runtime config或用户配置回滚。

## Open Questions

无。范围、fallback时限、错误信息层级与WeChat query例外均由现有协议和主控约束收口。
