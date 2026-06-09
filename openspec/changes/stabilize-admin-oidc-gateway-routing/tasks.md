## 1. 反代路径

- [x] 1.1 确认认证中心 Discovery/JWKS 会根据请求 Host 生成外部 issuer 和 JWKS URI。
- [x] 1.2 补齐 `ai.leagsoft.com` 上 `/.well-known/*` 到认证中心后端的转发。
- [x] 1.3 补齐 `ai.leagsoft.com` 上 `/login/oauth/*`、`/login`、`/callback`、`/static/*`、`/branding/*` 和轻量回调脚本的认证中心前端路由。
- [x] 1.4 补齐 Token/UserInfo、登录页、验证码、二维码、SAML、WebAuthn、Face ID、MFA 和 consent 相关认证中心 API 转发。

## 2. 验证与上线

- [x] 2.1 只读验证 `auth.leagsoft.com` 直接认证域名模式的 Discovery、JWKS、授权页、Token Endpoint 和 UserInfo 响应类别。
- [x] 2.2 只读验证当前生产 `ai.leagsoft.com` 仍返回网关 SPA/`Invalid URL`，明确线上配置尚未生效。
- [ ] 2.3 在线上机器运行 `caddy validate --config Caddyfile`，通过后执行 reload。
- [ ] 2.4 reload 后重新验证 `ai.leagsoft.com` 的 Discovery/JWKS 为 JSON、Authorization Endpoint 为认证中心页面、Token/UserInfo 不再返回网关 `Invalid URL`。
- [ ] 2.5 完成一次真实浏览器 OIDC 登录，并确认最终回调由 `aicodex-api` 完成 authorization code + `id_token` 验签。
