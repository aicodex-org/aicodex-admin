## Why

生产环境验证显示企业微信 OAuth2 敏感授权二维码已经完整显示，但二维码仍明显比企业微信官方兼容网页登录组件更密集，视觉识别性较差。根因是主授权二维码直接编码完整企业微信 OAuth2 URL，包含 `redirect_uri`、`scope`、`state`、`agentid` 等参数，二维码版本更高、模块更密。

同时，企业微信扫码登录页顶部品牌图占用较多纵向空间，在 1080p 桌面视口下会产生页面垂直滚动条。扫码登录是单屏高频操作，应尽量保证无需滚动即可完成扫码、刷新和兼容登录切换。

## What Changes

- 为企业微信敏感授权登录意图返回短授权二维码 URL。
- 新增匿名短授权入口，由服务端校验意图和 `state` 后 302 跳转到原企业微信 OAuth2 授权 URL。
- 前端企业微信主二维码优先使用短授权 URL，保留完整授权 URL 作为兼容 fallback。
- 企业微信扫码登录模式启用更紧凑的登录页品牌图尺寸和间距，减少 1080p 桌面视口滚动条。
- 增加后端、前端回归测试，覆盖短授权入口、安全校验和紧凑布局开关。

## Non-Goals

- 不改变企业微信 OAuth2 scope、回调地址、登录意图状态机、轮询或 complete 语义。
- 不把企业微信官方兼容网页登录组件作为主路径。
- 不全局缩小所有登录方式的品牌图；本次只针对企业微信扫码主路径兜底压缩。
- 不修改生产应用配置、Provider 密钥或数据库数据。

## Capabilities

- `wecom-login-profile-fields`: 补充企业微信 OAuth2 主授权二维码可以通过短授权入口降低码面密度，并要求扫码登录页在桌面视口中控制垂直占高。

## Impact

- 后端：`admin/controllers/wecom_profile_consent.go`、`admin/object/wecom_profile_consent*.go`、`admin/routers/router.go`、`admin/authz/authz.go`。
- 前端：`web-admin/src/auth/LoginPage.js`、`web-admin/src/auth/WeComLoginPanel.js`、`web-admin/src/App.less`。
- 测试：企业微信授权 controller/object 测试、登录页和二维码面板测试。
