## Why

线上用户反馈企业微信 OAuth2 扫码登录的二维码没有显示全。该二维码来自归档 change `2026-06-05-add-wecom-sensitive-profile-consent` 新增的主授权链路，用于 `snsapi_privateinfo` 敏感资料授权。

排查发现主授权二维码使用 Ant Design `QRCode` 直接渲染长 OAuth2 URL，默认没有二维码静区，且扫码承载区域只比二维码尺寸略高；在登录面板存在裁剪或用户视口较紧时，二维码边缘容易贴边，视觉上表现为没有显示完整，也会降低扫码识别稳定性。企业微信兼容网页登录组件生成的二维码更清晰，是因为它自带明显白边和更大的码面。

## What Changes

- 放大企业微信 OAuth2 主授权二维码码面。
- 为主授权二维码增加显式白色静区，避免黑色模块贴到容器边缘。
- 增加扫码面板最小高度，确保二维码、静区和状态遮罩都能完整显示。
- 在企业微信扫码登录主路径下隐藏密码登录专属的“忘记密码？”入口，避免与扫码授权操作混排。
- 保持企业微信 PC Web 兼容 fallback 逻辑不变。
- 增加前端回归测试，固定主授权二维码尺寸、静区、承载区高度和扫码模式下的密码找回入口可见性。

## Non-Goals

- 不改变企业微信 OAuth2 授权 URL、scope、回调、轮询或 complete 语义。
- 不调整后端登录意图、资料回填、MFA 或安全边界。
- 不修改应用登录品牌图、登录方式配置或本地数据库配置。

## Capabilities

- `wecom-login-profile-fields`: 补充企业微信 OAuth2 主授权二维码必须完整可识别的前端展示要求。

## Impact

- 前端登录页：`web-admin/src/auth/WeComLoginPanel.js`、`web-admin/src/auth/LoginPage.js`、`web-admin/src/auth/LoginPageVisibility.js`。
- 前端测试：`web-admin/src/auth/WeComLoginPanel.test.js`、`web-admin/src/auth/LoginPage.test.js`、`web-admin/src/auth/LoginPageVisibility.test.js`。
- OpenSpec：新增本 change，并为 `wecom-login-profile-fields` 增加 delta。
