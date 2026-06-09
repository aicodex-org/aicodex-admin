## Why

`aicodex-api` 的产品级 `aicodex-admin` OIDC 登录需要可选地通过 `https://ai.leagsoft.com` 网关域名访问认证中心。当前认证中心自身已经能在 `https://auth.leagsoft.com` 返回 Discovery、JWKS、授权页、Token Endpoint 和 UserInfo，但线上 `https://ai.leagsoft.com` 仍把这些路径交给 AICodex 网关 SPA 或模型网关 API 处理，导致网关转发模式不可用。

## What Changes

- 在 `Caddyfile` 中为 `ai.leagsoft.com` 补齐认证中心 OIDC 和登录页路径转发。
- 保持外部 `Host` 为 `ai.leagsoft.com`，让认证中心 Discovery、Token `iss`、JWKS URI 和 UserInfo Endpoint 使用同一个外部 issuer 边界。
- 覆盖 Discovery、JWKS、Authorization Endpoint、Token Endpoint、UserInfo、登录页静态资源、回调页、企业微信/密码/验证码/WebAuthn/Face ID/SAML 等登录方式依赖 API。
- 不改变认证中心 OAuth/OIDC 核心签发逻辑；`JWT-Standard`、RS256、JWKS `kid` 和 authorization code 流程仍由现有代码负责。

## Impact

- 主要文件：`Caddyfile`。
- 部署影响：线上 Caddy 或上游反代必须加载该配置后，`ai.leagsoft.com` 的认证中心路径才会从网关 SPA/API 切到 `aicodex-admin`。
- 回滚：移除或禁用 `ai.leagsoft.com` 下新增的认证中心 matcher，并在 `aicodex-api` 中关闭 `aicodex-admin` provider 或切回 `auth.leagsoft.com` 直接认证域名模式。
