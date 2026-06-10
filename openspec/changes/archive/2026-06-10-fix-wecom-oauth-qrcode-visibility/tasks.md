## 1. 问题定位

- [x] 1.1 确认问题来源于企业微信 OAuth2 敏感授权主二维码，而不是兼容 PC Web 登录组件。
- [x] 1.2 对比 Ant Design `QRCode` 和企业微信官方组件的显示差异，确认主授权二维码缺少显式静区。
- [x] 1.3 检查登录面板样式，确认固定高度和外层裁剪会放大二维码边缘贴边问题。

## 2. 前端修复

- [x] 2.1 放大企业微信 OAuth2 主授权二维码码面。
- [x] 2.2 为主授权二维码增加白色静区容器。
- [x] 2.3 调整扫码面板最小高度，确保二维码和静区完整显示。
- [x] 2.4 保持兼容网页登录 fallback 不受影响。
- [x] 2.5 隐藏企业微信/微信扫码登录模式下密码登录专属的“忘记密码？”区域。

## 3. 测试与验证

- [x] 3.1 增加 `WeComLoginPanel` 回归测试，断言 OAuth2 二维码尺寸、静区和承载区高度。
- [x] 3.2 运行 `yarn test WeComLoginPanel.test.js --watchAll=false`。
- [x] 3.3 运行 `yarn build`。
- [x] 3.4 运行 `openspec validate fix-wecom-oauth-qrcode-visibility --strict`。
- [x] 3.5 运行 `git diff --check`。
- [x] 3.6 运行目标组件 coverage，并在验证记录中确认受影响实施文件达到 85% 覆盖率目标。
- [x] 3.7 增加并运行登录页可见性测试，覆盖扫码登录模式下不渲染密码找回入口。
