## 验证记录

### 2026-06-10 前端定向测试

- 命令：`yarn test WeComLoginPanel.test.js --watchAll=false`
- 工作目录：`web-admin`
- 结果：通过，`Done in 13.71s.`
- 说明：测试输出包含既有 React 18 `ReactDOM.render` legacy 警告，未导致失败。
- 补充命令：`yarn test WeComLoginPanel.test.js --watchAll=false --runInBand --silent`
- 结果：通过，`TEST_EXIT=0`，`Done in 11.02s.`

### 2026-06-10 前端构建

- 命令：`yarn build`
- 工作目录：`web-admin`
- 结果：通过，输出 `Compiled successfully.`，项目脚本将 `build-temp` 移动为忽略的 `build` 目录。
- 说明：构建提示 bundle size 较大，这是项目既有 CRA 构建提示，与本次二维码修复无关。

### 2026-06-10 浏览器检查

- 入口：本地开发前端 `/login/built-in`
- 结果：页面可打开，但本地 `app-built-in` 登录配置只有密码、验证码、WebAuthn 和 Face ID，没有企业微信登录方式，因此不能用本地真实配置直接复现企业微信 tab。
- 替代验证：通过组件单测固定企业微信 OAuth2 二维码尺寸、白色静区和扫码面板最小高度；后续可在配置了企业微信 Provider 的测试应用上做真实扫码冒烟。

### 覆盖率

- 命令：`yarn test WeComLoginPanel.test.js --watchAll=false --coverage --collectCoverageFrom=src/auth/WeComLoginPanel.js`
- 工作目录：`web-admin`
- 首次结果：通过，但 `WeComLoginPanel.js` 文件级 lines 73.3%，未达到 85% 文件级覆盖率目标。
- 补充测试：增加创建意图失败、刷新主二维码、过期状态、轮询异常、MFA 方法切换、fallback URL 解析失败和 fallback 刷新等用户可见分支覆盖。
- 最新命令：`yarn test WeComLoginPanel.test.js --watchAll=false --runInBand --coverage --collectCoverageFrom=src/auth/WeComLoginPanel.js --silent`
- 最新结果：通过，`COVERAGE_EXIT=0`，`WeComLoginPanel.js` 文件级 statements 85.08%、branches 77.94%、functions 85.1%、lines 85.52%。
- 结论：受影响实施文件达到 85% 覆盖率目标。

### 2026-06-10 登录页扫码模式可见性

- 红灯命令：`yarn test LoginPageVisibility.test.js --watchAll=false --runInBand --silent`
- 红灯结果：失败，测试引用的 `LoginPageVisibility` helper 尚不存在，符合先补行为测试再实现的预期。
- 命令：`yarn test LoginPage.test.js LoginPageVisibility.test.js --watchAll=false --runInBand --silent`
- 工作目录：`web-admin`
- 结果：通过，`LoginPage.test.js` 直接覆盖 `renderFormItem()` 在 `wecom` / `wechat` 扫码模式下不渲染 `Forgot password?` 区域；`LoginPageVisibility.test.js` 覆盖扫码与非扫码登录方法的可见性规则。
- 覆盖率命令：`yarn test LoginPage.test.js LoginPageVisibility.test.js --watchAll=false --runInBand --coverage --collectCoverageFrom=src/auth/LoginPageVisibility.js --silent`
- 覆盖率结果：通过，`LoginPageVisibility.js` statements 100%、branches 100%、functions 100%、lines 100%。
- 说明：`LoginPage.js` 是大体量登录页编排组件，本次只新增命名导出和调用已覆盖的可见性 helper；直接行为测试覆盖了实际 `renderFormItem()` 接入点，覆盖率统计聚焦新增规则 helper。
- 追加复跑：`yarn test WeComLoginPanel.test.js --watchAll=false --runInBand --coverage --collectCoverageFrom=src/auth/WeComLoginPanel.js --silent` 通过，`WeComLoginPanel.js` 文件级 statements 85.08%、branches 77.94%、functions 85.1%、lines 85.52%。
- 追加构建：`yarn build` 通过，输出 `Compiled successfully.`；仍有 CRA bundle size、Browserslist 过期和 `fs.F_OK` deprecation 提示，均为既有构建提示。

### 2026-06-10 OpenSpec 与 diff 检查

- 命令：`openspec validate fix-wecom-oauth-qrcode-visibility --strict`
- 结果：通过，输出 `Change 'fix-wecom-oauth-qrcode-visibility' is valid`。
- 命令：`git diff --check`
- 结果：通过，无空白错误输出。
