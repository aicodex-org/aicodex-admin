## Context

企业微信 OAuth2 主链路需要 `snsapi_privateinfo` 敏感授权，不能直接替换为官方 PC Web 登录组件。当前前端二维码编码的是完整企业微信授权 URL，URL 长度直接推高二维码密度；纯 CSS 放大只能改善识别距离，无法让码面接近官方组件的稀疏观感。

页面滚动条来自纵向内容总高度：顶部品牌图 320px 宽并带 30px 底部间距，叠加 tab、提示、二维码、按钮和第三方图标后，在 1080p 桌面浏览器可视区域内容略超出。

## Goals / Non-Goals

**Goals:**

- 让企业微信主二维码编码短链接，降低二维码密度。
- 短链接必须保持一次性意图、`state` nonce、过期状态和 Provider 校验边界。
- 企业微信扫码模式下压缩顶部品牌图和局部间距，降低垂直滚动概率。
- 保持密码、验证码等非扫码登录模式视觉不变。

**Non-Goals:**

- 不新增数据库字段保存明文授权 URL 或明文 nonce。
- 不放宽企业微信回调校验。
- 不对所有应用登录页做全局布局重构。

## Decisions

- 短授权入口使用 `/api/wecom-profile-consent/intents/:intentId/authorize?state=<state>`。
  - 原因：二维码只需编码本站短路径和既有 `state`，比完整企业微信 OAuth2 URL 短得多。
  - 安全边界：服务端通过 intentId 查询意图，校验 `state` nonce hash、过期状态、Provider 配置和意图类型后，再重建完整企业微信 OAuth2 URL 并 302 跳转。
  - 备选方案：把完整 OAuth URL 存入数据库后短链跳转。该方案会持久化含 `state` 的完整授权 URL，不如按 intent 重建清晰。

- 登录意图响应同时返回 `authUrl` 和 `shortAuthUrl`。
  - 原因：前端可优先扫码短链接；旧客户端或异常情况下仍能使用完整 `authUrl`。

- 企业微信扫码模式给登录面板加专属 compact class。
  - 原因：生产应用可以继续保留原 logo 资产，只由扫码模式压缩图标尺寸和下边距，避免影响其它登录方式的视觉设计。

## Risks / Trade-offs

- 短授权入口是匿名 GET 接口。
  - 缓解：它只接受已有二维码中的 `state`，不创建新意图、不暴露 pollToken、不完成登录；无效、过期或非 pending 意图直接拒绝。

- 企业微信 OAuth2 URL 仍由服务端重建。
  - 缓解：继续使用原 `BuildWecomProfileConsentOAuth2AuthURL`，回调地址和 scope 不分叉。

- 不同浏览器工具栏高度不同，不能保证所有桌面环境都无滚动。
  - 缓解：以 1080p 常见桌面视口为主要验收目标，缩小 logo 和间距，并通过测试固定 compact class 和二维码尺寸。
