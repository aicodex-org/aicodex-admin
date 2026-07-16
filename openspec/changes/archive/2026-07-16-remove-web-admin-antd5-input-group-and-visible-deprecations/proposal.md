## Why

`web-admin` 当前固定 Ant Design 5.24.1，但登录、注册、用户编辑和短信 Provider 字段仍使用 4 处已废弃的 `Input.Group`；验证码与人脸识别链路还通过 7 个调用点向 3 个自定义 wrapper 传递已废弃的 `visible` prop。它们会持续产生开发与测试告警，并提高后续 AntD 升级和 overlay 生命周期维护成本，因此需要在不改变用户可观察行为的前提下迁移到当前版本已支持的 `Space.Compact` 与 `open`。

## What Changes

- 将 `LoginPage`、`SignupPage`、`UserEditPage` 与 `SmsProviderFields` 的 `Input.Group` 等价迁移到 `Space.Compact`，保留宽度、控件顺序、表单校验、键盘输入和响应式布局。
- 将 `CaptchaModal`、`FaceRecognitionCommonModal`、`FaceRecognitionModal` 的对外 `visible` prop 端到端重命名为 `open`，同步修改 `CaptchaPage`、`LoginPage`、`SendCodeInput`、`CaptchaPreview`、`FaceIdTable` 调用点与直接测试。
- 删除 `UserEditPage.test.tsx` 中仅为 `Input.Group` warning 存在的过滤；不新增 console suppression、skip、sleep 或放宽断言。
- 补充聚焦 Jest、changed production coverage、完整前端门禁和真实浏览器 smoke，验证输入组合、弹窗关闭/重开、异步状态、键盘操作与窄屏布局。
- 在技术债记录中把 `destroyOnClose` 明确留待 AntD minor 升级后评估；本 change 不伪造 `destroyOnHidden` 兼容。

## Capabilities

### New Capabilities

- `web-admin-antd5-deprecation-cleanup`: 定义 Admin 前端迁移 AntD deprecated API 时的等价交互、overlay prop、版本边界和验证契约。

### Modified Capabilities

无。

## Impact

- 生产组件：登录、注册、用户编辑、短信 Provider 字段，以及验证码/人脸识别 modal wrapper 与其调用点。
- 测试：上述组件的直接 Jest 测试与覆盖率证据。
- 文档：本 change OpenSpec artifacts、验证记录和必要的技术债状态更新。
- 不影响依赖版本、lockfile、Provider/Syncer 编辑页、TLS 策略、后端 API、Go、schema、CI workflow、运行时配置或 `test` 分支。
