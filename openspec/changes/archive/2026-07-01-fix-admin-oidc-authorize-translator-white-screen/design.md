## Context

Insight 用量验收链路依赖浏览器从 Insight 跳转到 Admin `/login/oauth/authorize`，在 Admin 完成登录或授权后回到 Insight。当前阻断点发生在 Admin 前端授权页渲染阶段：页面白屏，console 出现 translator 相关 TypeError，导致后续登录、consent 和回跳都无法验证。

该问题属于显式授权入口的可用性和 i18n 初始化边界，不应通过修改 Insight 本地登录、OIDC token 签发或 60 环境配置来规避。

## Goals / Non-Goals

**Goals:**

- 定位 translator TypeError 的具体调用链，并在源头修复授权页白屏。
- 保持授权页在 i18n 资源尚未就绪、缺少 key 或 translator 输入不完整时仍能渲染可操作 UI。
- 补充聚焦测试，先复现白屏触发路径，再验证修复。
- 完成 60 测试环境脱敏浏览器 smoke，证明 Insight 发起 Admin OIDC 登录不再停在 Admin 白屏。

**Non-Goals:**

- 不改变 OIDC authorization code、token、userinfo、scope 或 Insight admin-provider 后端契约。
- 不调整 60 或生产 OIDC client secret、回调地址、真实账号权限、Caddy/网关路由或数据库 fixture，除非复现证明白屏根因必须依赖这些外部状态。
- 不触碰 Organization/User/Application/Provider/Syncer/Gateway 编辑布局类文件。

## Decisions

1. 修复优先落在授权页 i18n/translator 调用边界，而不是在 Insight 侧绕过 Admin 登录。

   这样能保持真实验收路径：Insight 仍通过 Admin OIDC 获取 admin 用户和 scope。绕过 Admin 登录会让 current-user、scope 和 owner attribution 证据失真。

2. 先用 focused test 捕获 translator 白屏条件，再做最小实现。

   授权页白屏是前端运行时异常，单靠 typecheck 或 build 不能证明已覆盖。聚焦测试应直接覆盖导致 TypeError 的 helper、组件或初始化路径。

3. 运行态 smoke 只记录脱敏证据。

   60 环境允许测试登录和浏览器验证，但报告与 OpenSpec 验证记录不得包含账号密码、token、Cookie、完整 URL、DSN 或 raw payload。

## Risks / Trade-offs

- [translator fallback 过宽掩盖真实缺 key] → 测试只允许授权页不白屏，缺失 key 仍应通过可诊断 fallback 或日志暴露，不静默改变全局语言行为。
- [授权页依赖真实会话和 OIDC 参数] → 单测覆盖白屏 root cause，浏览器 smoke 覆盖真实跳转；若需要服务重启或 DB 配置变更，则停在 RC 并回传 master decision。
- [登录链路敏感] → 不修改 token/cookie 名称、后端授权契约和 provider scope，仅修复前端渲染边界。
