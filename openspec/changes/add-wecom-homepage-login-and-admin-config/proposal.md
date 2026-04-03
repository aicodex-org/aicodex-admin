## Why

当前 `web-admin` 虽然已经具备 WeCom OAuth Provider 的基础能力，但登录首页仍缺少面向最终用户的企业微信扫码登录入口，后台也缺少一套清晰、完整、可校验的企业微信登录配置体验。这会让企业微信登录停留在“代码里支持、产品上不可用”的状态，既不利于对外验收，也会增加后续联调和排障成本。

## What Changes

- 在 `web-admin` 登录首页增加企业微信扫码登录入口，参考 `../CRM-Agent` 已实现的双入口思路，并与现有登录页结构兼容。
- 为企业微信登录增加首页侧的扫码容器、发起逻辑、失败提示、重试入口和回调落地后的统一成功/失败反馈。
- 本次首页扫码登录主交付优先支持企业内部登录场景，即 `WeCom + Internal + Normal` 组合；第三方服务商与 Silent 模式以配置完善和兼容校验为主，不作为本次首页主链路验收条件。
- 完善后台企业微信 Provider 配置页，使企业微信登录所需参数、登录模式、回调地址和前置条件能够被明确配置和理解。
- 为企业微信 Provider 增加更明确的字段约束、必填校验、配置说明和默认推荐值，减少 Internal / Third-party、Normal / Silent 配置误用。
- 校正并补齐后端企业微信登录链路，确保首页扫码登录、回调解析和用户信息换取能够与当前前端发起方式保持一致。
- 补充企业微信登录相关文档与联调说明，明确域名、回调地址、AgentId、CorpId、Secret、可信域名与登录入口之间的关系。

## Capabilities

### New Capabilities
- `wecom-homepage-signin`: 定义登录首页中的企业微信扫码登录入口、扫码发起、扫码容器、回调反馈和失败重试要求。
- `wecom-provider-configuration`: 定义后台企业微信登录配置的字段要求、校验规则、推荐模式、提示文案和联调信息展示要求。

### Modified Capabilities

## Impact

- 主要影响 `web-admin/src/auth/LoginPage.js`、`web-admin/src/auth/Provider.js`、`web-admin/src/auth/AuthCallback.js`、`web-admin/src/auth/ProviderButton.js`、`web-admin/src/ProviderEditPage.js` 与相关样式和国际化文案。
- 主要影响后端企业微信登录接入实现，包括 `admin/idp/wecom_internal.go`、`admin/idp/wecom_third_party.go`、`admin/idp/provider.go` 及相关登录回调链路。
- 影响后台运营配置方式，需要补充企业微信登录参数说明、回调地址约定与联调/排障文档。
- 需要回归验证登录首页多登录方式切换、企业微信扫码回调、Provider 配置保存与错误提示行为，避免现有 OAuth 登录能力退化。
