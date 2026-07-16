## ADDED Requirements

### Requirement: IdP出站请求必须遵守注入client契约
Admin IdP出站请求 MUST 优先使用 `SetHttpClient` 注入的同一个 `*http.Client`，并 SHALL NOT 替换、克隆或改写其Transport。

#### Scenario: 使用代理或默认注入client
- **WHEN** 调用方为Provider注入带自定义Transport的HTTP client
- **THEN** token和profile请求通过该client的Transport执行
- **AND** 请求完成后client和Transport指针保持不变

### Requirement: 未注入路径必须有整体超时
Gitee、LinkedIn、Casdoor、Lark及WeChat Mini Program在没有注入client时 SHALL 使用整体请求 `Timeout == 30 * time.Second` 的独立fallback，并 SHALL NOT 使用 `http.DefaultClient`、包级 `http.Get`/`http.Post`/`http.PostForm` 或无Timeout的 `&http.Client{}`。

#### Scenario: nil client执行请求
- **WHEN** Provider未调用 `SetHttpClient` 或MiniProgram由直接构造路径调用
- **THEN** 请求使用非nil且总超时为30秒的fallback client

### Requirement: Credential必须按Provider协议安全传输
Gitee、LinkedIn与Casdoor的authorization code token exchange MUST 将 `client_secret`、code及各Provider原有必需字段放入 `application/x-www-form-urlencoded` body；Gitee与LinkedIn继续携带既有redirect参数，Casdoor保持既有字段集合。Gitee profile MUST 使用 `Authorization: token <access_token>`，LinkedIn与Casdoor profile MUST 使用 `Authorization: Bearer <access_token>`；URL query SHALL NOT 包含这些credential。WeChat Mini Program MAY 按 `jscode2session` 协议在query中传递 `appid`、secret及code，但错误和日志 MUST NOT 回显该URL或query。

#### Scenario: Gitee、LinkedIn或Casdoor交换token
- **WHEN** Provider提交authorization code换取token
- **THEN** request URL不包含 `client_secret`、code或access token
- **AND** form body保留provider要求的字段和值

#### Scenario: Gitee、LinkedIn或Casdoor读取profile
- **WHEN** Provider使用access token读取用户资料
- **THEN** token只出现在Authorization header
- **AND** request URL不包含access token

#### Scenario: MiniProgram调用jscode2session
- **WHEN** WeChat Mini Program按第三方协议提交appid、secret与code
- **THEN** 请求保持既有endpoint和query协议
- **AND** 任何返回错误不包含secret、code、完整URL或响应body

### Requirement: HTTP响应生命周期和状态必须受控
每个目标Provider请求 MUST 检查request创建错误，MUST 在获得response后关闭body，并 MUST 将所有非2xx响应判定为失败；失败不得继续解析成功DTO。

#### Scenario: request创建失败
- **WHEN** endpoint无法构造有效HTTP request
- **THEN** Provider返回包含provider、operation和request stage的错误
- **AND** 错误不包含secret、token、authorization code或body

#### Scenario: 第三方返回非2xx
- **WHEN** 目标Provider返回2xx以外的HTTP status
- **THEN** Provider关闭response body并返回包含status的可操作错误
- **AND** 错误不包含原始response body或credential

#### Scenario: 成功响应
- **WHEN** 目标Provider返回2xx及有效JSON
- **THEN** Provider关闭response body并保持既有token/profile/session DTO映射语义

### Requirement: 第三方错误必须脱敏
Provider返回的普通错误 SHALL 只包含定位阶段所需的provider、operation、HTTP status或非敏感error code，MUST NOT 回显第三方 `msg`、`error_description`、原始body、secret、token或authorization code。

#### Scenario: 第三方错误体包含credential
- **WHEN** 第三方错误响应在body字段中回显测试secret、token或code
- **THEN** 调用方收到的错误不包含这些值或原始body
- **AND** 错误仍能通过provider、operation、status或error code定位失败阶段

### Requirement: 兼容边界必须保持稳定
本change SHALL 保持Provider配置、OAuth callback path、API envelope、代理选择、endpoint、scope及成功DTO不变，并 SHALL NOT 修改Web3 Provider、TLS兼容策略、数据库、runtime config或真实第三方环境。

#### Scenario: 本地契约测试通过
- **WHEN** fake transport或HTTP server验证目标请求和DTO
- **THEN** 结果只证明本地HTTP契约与回归保护
- **AND** 验证记录不将其表述为真实第三方E2E
