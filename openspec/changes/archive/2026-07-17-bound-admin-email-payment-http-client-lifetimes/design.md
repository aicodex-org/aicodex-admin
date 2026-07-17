## Context

最新代码在四个调用点直接执行 `&http.Client{}.Do(req)`：Azure ACS `Send`、GC `doPost`、FastSpring `Pay` 与 `Notify`。这些 client 的整体 `Timeout` 为零；请求也没有来自调用方的 context/deadline，因此连接或响应长期无进展时没有最终终止边界。

目标 Provider 是外部事实 owner：Azure ACS 决定邮件接收结果，GC/FastSpring 决定支付或订单状态；Admin 只构造既有协议请求并消费响应。本 change 只治理 Admin consumer 侧 transport lifetime，不改变第三方协议、签名、认证、URL、状态映射或错误契约。

现有仓库提供两个可直接推导的 timeout 惯例：`admin/idp`、`admin/object` 组织同步及多个邮件/通知 connector 使用 30 秒整体 timeout；同一 `admin/pp` 支付包的 Airwallex 使用 15 秒整体 timeout。因此无需新增运行时配置或产品决策。

| 调用点 | 当前行为 | 保持不变的契约 | 新增边界 |
| --- | --- | --- | --- |
| Azure ACS `Send` | 每次新建无 timeout client | HMAC、headers、endpoint、202/400/401/其它状态错误 | 默认 30 秒，局部 client 注入 |
| GC `doPost` | 每次新建无 timeout client | POST、Content-Type、raw response 读取及上层成功/失败解析 | 默认 15 秒，局部 client 注入 |
| FastSpring `Pay` | 每次新建无 timeout client | Basic Auth、session URL、200/201、非成功错误文本、checkout URL | 默认 15 秒，局部 client 注入 |
| FastSpring `Notify` | 每次新建无 timeout client | Basic Auth、order URL、404/未完成映射 `Created`、完成映射 `Paid` | 默认 15 秒，与 Pay 共用同一 provider client |

## Goals / Non-Goals

**Goals:**

- Azure ACS 默认与 nil fallback 都使用整体 timeout 为 30 秒的独立 client。
- GC/FastSpring 默认与 nil fallback 都使用整体 timeout 为 15 秒的独立 client。
- 显式注入 client 保持指针 identity、Transport、Timeout 和其它配置不变。
- 网络错误、client timeout 与 context cancellation 均从既有方法边界有界返回，不增加 retry 或吞错。
- 使用 hermetic transport 测试证明成功、非 2xx、pending、失败与请求契约兼容。

**Non-Goals:**

- 不建设全仓 HTTP client abstraction，不修改全局 `http.DefaultClient`/`http.DefaultTransport`。
- 不增加 retry、退避、熔断、代理切换或运行时 timeout 配置。
- 不治理 response body 大小、body 错误脱敏、连接池参数或其它邮件/支付 Provider。
- 不修改 Provider constructor/接口、认证、签名、URL、业务状态、错误文本、数据库/schema、前端或 workflow。

## Decisions

### 1. 按业务域沿用已有 timeout，而不是拍出新的统一值

Azure ACS 使用 `30 * time.Second`，与同仓邮件/通知、IdP 和 connector 惯例一致；GC 与 FastSpring 使用 `15 * time.Second`，与同包 Airwallex 一致。整体 timeout 覆盖连接、重定向和响应读取的总生命周期，并且只作为无上层 deadline 时的最终边界。

未选择全部设为 30 秒，因为支付包已有更窄且经过生产代码使用的 15 秒边界；未选择运行时配置，因为任务不授权配置面扩张，且现有域内常量已经提供兼容依据。

### 2. Provider 持有私有 client，constructor 签名保持不变

三个 Provider 增加私有 `httpClient *http.Client` 字段。公开 constructor 初始化独立默认 client；请求前 resolver 在字段非 nil 时原样返回，在 nil 时创建同域默认 client。这样既不改变公开 constructor/Provider interface，也让同包测试可注入受控 Transport；手工零值 struct 仍有有界 fallback。

未选择新增公开 constructor 参数或 `SetHttpClient` 方法，因为调用方没有注入需求，公开 API 扩张会超出最窄修复。未选择包级可变 client 单例，避免测试并发和调用方修改产生共享状态。

### 3. `admin/pp` 使用窄 helper，Azure ACS 保持文件内专用 resolver

GC 与 FastSpring 共享同一个 15 秒支付域 policy helper，防止两个支付 Provider 的默认值漂移。Azure ACS 只有一个目标实现，使用文件内专用 helper，避免把其它邮件 Provider 隐式纳入本 change。

### 4. 只替换 client 选择，不重写响应和错误路径

四个调用点继续使用现有 request 构造、headers、签名、Basic Auth、状态判断、body 读取和错误返回。transport error 直接沿现有边界返回；本 change 不包装 credential 或 request/response body，因此不会新增敏感信息暴露。FastSpring 既有非 2xx body 错误和 GC response 处理属于明确排除的 response body 治理范围，本 change 用回归测试锁定而不顺手修改。

### 5. TDD 使用受控 RoundTripper，不等待生产 timeout

测试先断言 constructor/default client 必须具有对应 timeout，并证明旧实现缺少可注入 seam。行为测试通过私有 client 字段注入 RoundTripper：同步返回成功/非 2xx/网络错误；timeout 用短测试 client 和等待 `req.Context().Done()` 的 transport；cancel 用返回 `context.Canceled` 的 transport。测试不使用 `time.Sleep`、真实外网或真实 credential。

## Risks / Trade-offs

- [15/30 秒可能不适合极端慢第三方响应] → 值来自同业务域既有实现；私有注入 seam 仅用于同包测试，不承诺新的公开配置面。
- [私有字段让同包代码可覆盖 client] → 字段不暴露到包外，constructor 始终提供有界默认值，nil resolver 也保持有界。
- [保留现有 FastSpring raw error body] → 本 change 明确不做 response body 治理；不新增任何 raw body/credential 输出，后续若有独立证据再建专门 change。
- [没有真实第三方 E2E] → 本 change 只改变 transport lifetime；fake transport 可完整验证请求和状态契约，真实 credential/外网验证既不必要也不安全。

## Migration Plan

1. 先提交并运行默认 timeout、注入 identity、请求/状态、网络错误和 timeout/cancel 的 RED 测试。
2. 增加域内 helper和私有 client 字段，只替换四处 client 选择。
3. 运行聚焦、包级、覆盖率、skipCi 全量、vet、固定 lint 与 OpenSpec 门禁。
4. RC 阶段仅 push 工作分支并等待主控；最终获授权后再 rebase、同步路线文档、archive/sync-specs 与合入 base。

回滚只需回退单一 change commit；无数据、schema、配置或依赖迁移。

## Open Questions

无。timeout 值、注入方式、契约边界和非目标均可由任务约束与同仓既有实现推导。
