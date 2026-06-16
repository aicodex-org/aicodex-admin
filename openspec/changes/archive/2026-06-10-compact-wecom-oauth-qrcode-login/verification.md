## 验证记录

### 2026-06-10 TDD 红灯

- 后端命令：`go test ./controllers -run 'Test(CreateWecomProfileConsentLoginIntent|AuthorizeWecomProfileConsentIntent)'`
- 工作目录：`admin`
- 结果：失败，`AuthorizeWecomProfileConsentIntent` 尚不存在，符合先补短授权入口测试再实现的预期。
- 前端命令：`yarn test WeComLoginPanel.test.js LoginPageVisibility.test.js --watchAll=false --runInBand --silent`
- 工作目录：`web-admin`
- 结果：失败，企业微信二维码仍渲染完整 OAuth2 URL，且 `getLoginPanelClassName` 尚不存在，符合预期。

### 2026-06-10 聚焦测试

- 命令：`go test ./object -run 'TestBuildWecomProfileConsent'`
- 工作目录：`admin`
- 结果：通过，覆盖企业微信完整 OAuth2 URL 和短授权 URL 构造。
- 命令：`go test ./controllers -run 'Test(CreateWecomProfileConsentLoginIntent|AuthorizeWecomProfileConsentIntent)'`
- 工作目录：`admin`
- 结果：通过，覆盖 `shortAuthUrl` 响应、短授权入口 302 跳转和无效 `state` 拒绝。
- 命令：`yarn test WeComLoginPanel.test.js LoginPageVisibility.test.js --watchAll=false --runInBand --silent`
- 工作目录：`web-admin`
- 结果：通过，覆盖前端优先渲染 `shortAuthUrl`、完整 URL fallback 和企业微信扫码 compact class。

### 2026-06-10 收尾验证

- 命令：`go test ./object -run 'Test(BuildWecomProfileConsent|ParseWecomProfileConsent|WecomProfileConsentIntent)' -coverprofile=%TEMP%\aicodex-wecom-compact-cover\wecom-object-shell.out`
- 工作目录：`admin`
- 结果：通过；`BuildWecomProfileConsentAuthorizeURL` 函数覆盖率 100.0%，object 包总覆盖率受包内既有大量非本次逻辑影响为 1.0%。
- 命令：`go test ./controllers -run 'Test(CreateWecomProfileConsentLoginIntent|AuthorizeWecomProfileConsentIntent|HandleWecomProfileConsentCallback|GetWecomProfileConsentIntentStatus|CompleteWecomProfileConsent)' -coverprofile=%TEMP%\aicodex-wecom-compact-cover\wecom-controller-shell.out`
- 工作目录：`admin`
- 结果：通过；`CreateWecomProfileConsentLoginIntent` 函数覆盖率 89.2%，覆盖 `shortAuthUrl` 响应以及无效 JSON、缺参数、应用/Provider 异常、Provider 配置不完整和 issuer 失败分支；新增短授权入口 `AuthorizeWecomProfileConsentIntent` 函数覆盖率 90.7%，覆盖成功 302、无效 state、过期/非 pending 意图、Provider 异常和 corp/agent 边界拒绝。
- 命令：`yarn test WeComLoginPanel.test.js LoginPageVisibility.test.js LoginPage.test.js --watchAll=false --runInBand --coverage --collectCoverageFrom=src/auth/WeComLoginPanel.js --collectCoverageFrom=src/auth/LoginPageVisibility.js --silent`
- 工作目录：`web-admin`
- 结果：通过，26 个测试通过；`WeComLoginPanel.js` 行覆盖率 85.52%，`LoginPageVisibility.js` 行覆盖率 100%。
- 命令：`yarn build`
- 工作目录：`web-admin`
- 结果：通过；构建输出保留既有 bundle size、Browserslist 数据过期和 Node `fs.F_OK` deprecation 警告。
- 命令：`openspec validate compact-wecom-oauth-qrcode-login --strict`
- 工作目录：仓库根目录
- 结果：通过，`Change 'compact-wecom-oauth-qrcode-login' is valid`。
- 命令：`git diff --check`
- 工作目录：仓库根目录
- 结果：通过，无空白错误。
- 样式验证：企业微信扫码 compact 模式将登录面板上下外边距压到 `16px`、品牌图宽度压到 `180px`、品牌图下边距压到 `12px`，并将该模式下 `.login-form` 垂直内边距压到 `20px`；影响范围限定在 `login-panel-wecom-compact`，密码/验证码等非企业微信扫码模式不变。
