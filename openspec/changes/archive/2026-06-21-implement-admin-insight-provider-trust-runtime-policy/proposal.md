## Why

Admin 已经具备服务凭据治理配置入口和 status overlay，但 Insight 调用 Admin provider endpoint 时的 bearer trust 仍主要读取 legacy env/config：`insightProviderAllowedAudiences`、`insightProviderAudience`、`insightProviderAllowedIssuers` 和 `insightProviderRequiredScopes`。这让 operator 无法通过 Admin-owned saved runtime policy 明确接管 provider trust，也无法表达“已保存策略禁用时 fail-closed”。

本 change 将 `insight_provider_trust` 纳入 saved runtime policy 闭环：没有显式 saved policy 时继续 legacy fallback；存在 saved enabled policy 时 provider bearer 校验和治理状态都优先使用 saved copy-safe policy；存在 saved disabled policy 时 fail-closed，不能回落 legacy env/config。

## What Changes

- 扩展服务凭据治理配置入口，使 `insight_provider_trust` 可保存 copy-safe runtime policy。
- Provider bearer trust 校验消费 saved `insight_provider_trust` runtime policy，用于 audience、issuer digest 和 required scope 判断。
- 无显式 saved trust policy 时保持 legacy env/config fallback，兼容既有部署。
- saved enabled policy 存在时覆盖 legacy env/config；policy 不完整或 mismatch 时拒绝，不能回落 env。
- saved disabled policy 存在时 fail-closed，即使 legacy env/config 可用也拒绝 provider bearer。
- 服务凭据治理 status 对 `insight_provider_trust` 输出 copy-safe source/count/digest/defaulted/cannotInfer 摘要，不输出完整 issuer URL、token、Cookie、client secret、private key、DSN、raw payload、raw id 或 full private URL。

## Out of Scope

- 不改 API/Gateway/Insight repo。
- 不改 Login、OIDC callback、WeCom 登录/同步或身份应用 CRUD 主流程。
- 不写 organization/projection/authorization/usage truth。
- 不保存或返回 bearer token、Cookie、Authorization header、client secret、private key、DSN、raw payload、raw id、完整私有 URL 或完整 issuer URL。
- 不触发 Gateway projection publish/refresh，不调用 API/Gateway/Insight runtime 写操作。
- 不新增 UI 库、不重做应用接入中心布局。

## Impact

- Backend: 调整 Admin provider trust policy 读取与校验路径；扩展服务凭据治理配置校验和 status builder。
- Tests: 增加 focused Go tests，覆盖 legacy fallback、saved enabled 覆盖 env、saved disabled fail-closed、mismatch 不回落 env、status copy-safe 摘要和 sanitizer。
- OpenSpec: 更新 Admin service credential owner boundary 与 Insight admin provider wrapper 的 runtime policy 契约。
- Security: saved policy 只允许安全 audience/scope/digest/mode/count/source 摘要，继续拒绝 secret-like material 和完整 issuer URL。
