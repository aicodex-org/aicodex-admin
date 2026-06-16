## 1. 提案与设计

- [x] 1.1 新建 OpenSpec change，说明短二维码和紧凑扫码页目标。
- [x] 1.2 明确短授权入口的安全边界和非目标。

## 2. 后端短授权入口

- [x] 2.1 为登录意图响应增加 `shortAuthUrl`。
- [x] 2.2 新增短授权 GET 入口，校验 intentId、state、过期状态和 Provider 后 302 到企业微信 OAuth2 URL。
- [x] 2.3 更新路由和匿名 API 授权规则。
- [x] 2.4 增加 controller/object 测试，覆盖短 URL 生成、跳转和无效 state 拒绝。

## 3. 前端紧凑扫码页

- [x] 3.1 企业微信主二维码优先渲染 `shortAuthUrl`，缺失时 fallback 到 `authUrl`。
- [x] 3.2 企业微信扫码模式给登录页添加 compact class。
- [x] 3.3 CSS 限定 compact 模式下品牌图尺寸和间距，降低桌面视口滚动概率。
- [x] 3.4 增加前端测试，覆盖短 URL 优先级和 compact class。

## 4. 验证

- [x] 4.1 运行后端相关 `go test`。
- [x] 4.2 运行前端聚焦测试和 coverage。
- [x] 4.3 运行 `yarn build`。
- [x] 4.4 运行 `openspec validate compact-wecom-oauth-qrcode-login --strict`。
- [x] 4.5 运行 `git diff --check`。
