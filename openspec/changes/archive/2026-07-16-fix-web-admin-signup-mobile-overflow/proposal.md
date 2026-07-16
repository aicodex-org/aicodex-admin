## Why

注册页在窄屏桌面窗口中会因 400px Form、320px logo 和父容器 30px 双侧 padding 形成页面级横向溢出；移动 UA 在 320/360px 下也会由 300px Form 与同一固定内容链产生溢出。该缺陷会裁切注册表单、语言入口和操作文案，并破坏移动端注册主流程。

## What Changes

- 为 Signup 自有表单壳、logo、Form 和 Email/Phone 模式切换建立容器约束，使 320/360/390px 与桌面视口均不产生页面级横向溢出。
- 保持 Email/Phone 切换、国家区号与手机号组合、验证码、校验错误、提交与登录链接、键盘焦点及桌面 400px Form 视觉基线。
- 用直接 Jest 契约、changed executable coverage 和脱敏 production preview 验证窄屏、长文案、错误态与两种模式。
- 不修改共享登录页样式、认证请求/响应、Provider 行为、路由、依赖、全局主题或其它认证页面。

## Capabilities

### New Capabilities

- `web-admin-signup-responsive-layout`: 规定注册页在窄屏、移动端和桌面端的页面级无溢出、表单组合与键盘交互兼容要求。

### Modified Capabilities

无。

## Impact

- 生产代码：`web-admin/src/auth/SignupPage.tsx` 及 Signup 直接拥有的局部响应式样式。
- 测试：`web-admin/src/auth/SignupPage.test.tsx`，以及本地脱敏 Chromium 验证记录。
- 文档：当前 OpenSpec、归档后主规格与 Admin 技术债路线事实。
- API、认证 contract、依赖版本、共享 CSS、Go/schema、CI workflow 和 `test` 分支均不变。
