## 背景

`stabilize-admin-oidc-multitenant-api-mapping-contract` 已将 `id_token.sub` 固化为 `owner/name` 形态的稳定 admin subject，并通过 `organization` claim 表达 platform organization。`aicodex-api` 后续需要使用企业微信稳定身份作为 provider user 绑定依据，但该身份必须来自已签名的标准 OIDC `id_token`，不能由 API 侧调用 UserInfo 或通过邮箱、手机号、昵称等弱资料推断。

当前 JWT-Standard 路径集中在 `admin/object/token_standard_jwt.go` 的 `ClaimsStandard` / `getStandardClaims`，基础 subject 和 organization 在 `admin/object/token_jwt.go` 的 `generateJwtToken` 中组装。Discovery 的 `claims_supported` 在 `admin/object/wellknown_oidc_discovery.go` 中静态声明。

## 目标与非目标

**目标：**

- 为内部企业微信成员输出 `wecom_canonical_id=wecom:<corp_id>:<userid>`。
- 保持 `id_token.sub` 继续表示稳定 admin subject，不承载企业微信或 API 业务用户 ID。
- 仅当可从当前已认证用户资料中同时取得企业微信 `corp_id` 与 `userid` 时输出 claim。
- 在 discovery `claims_supported` 中声明 `wecom_canonical_id`。

**非目标：**

- 不改 `aicodex-api` 消费逻辑。
- 不把 `apiUserId` 或企业微信身份写入 `sub`。
- 不通过 UserInfo、email、username、nickname、phone 等弱字段补齐企业微信身份。
- 本次不支持企业微信外部联系人 canonical claim。外部联系人的 `external_userid` 与内部 `userid` 语义不同，后续如支持需使用独立前缀，例如 `wecom_external:<corp_id>:<external_userid>`，并先补充独立 OpenSpec 设计与测试。

## 设计决策

1. `wecom_canonical_id` 作为 JWT-Standard 标准 claim 固化在 `ClaimsStandard`，由 `getStandardClaims` 计算。
   - 这样该字段进入签名 `id_token`，不依赖 JWT-Custom 的 `TokenFields` / `TokenAttributes` 配置。
   - Refresh token 复用同一标准 claims 结构时也会保留该字段；该行为与当前 JWT-Standard 复用 claims 的实现一致。

2. claim 值只从企业微信强身份字段生成。
   - `corp_id` 使用 `User.Properties[WecomUserPropertyCorpId]` 记录的企业微信 corp 标识。
   - `userid` 优先使用 `User.Properties[WecomUserPropertyUserId]`，兼容读取历史 `User.Wecom` 成员 ID。
   - 任一字段为空，或当前 provider / signin method 不表示企业微信登录时，不输出 `wecom_canonical_id`。

3. 多企业隔离通过 canonical 字符串前缀和 corp 维度表达。
   - 内部成员格式固定为 `wecom:<corp_id>:<userid>`。
   - 不输出裸 `userid`，避免多个企业下同名成员发生绑定冲突。

4. Discovery 显式声明 claim。
   - `claims_supported` 加入 `wecom_canonical_id`，方便下游基于标准 metadata 发现该签名 claim。

## 风险与取舍

- [风险] 现有企业微信用户资料字段命名可能来自历史实现，字段位置不统一。→ 实施前通过代码检索确认登录同步路径实际写入位置，测试覆盖标准 token 行为。
- [风险] 外部联系人后续也需要绑定。→ 当前 fail closed，不复用内部成员前缀；后续用 `wecom_external` 单独建模。
- [风险] 下游误以为 `sub` 已切换。→ 规格、fixture 和测试持续断言 `sub` 保持 `owner/name`。
