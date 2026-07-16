## Why

RTL 16 已让 `web-admin` 使用 React 18 `createRoot`，但最新固定环境 non-silent 全量 Jest 仍稳定暴露 326 条 `not wrapped in act` 文本命中和 1 组 FakeTimers/native timer 提示，且两个测试文件仍按文本静默 act warning。测试虽然 153 suites / 1450 tests 全通过，但未完成的 promise、timer 与 AntD portal/motion 更新会掩盖真实竞态并放大后续升级成本，因此需要在不修改生产行为的前提下收口测试异步边界。

## What Changes

- 以最新 non-silent 全量 Jest 为基线，按 React act、FakeTimers/native timer、AntD/runtime 和其它 console warning 分类，记录脱敏计数与 top owner，不提交原始长日志。
- 对稳定可行动的 owner 使用真实 `act`、`waitFor`、`findBy`、await 交互、microtask/timer flush、cleanup 和 timer restore 语义，确保断言发生在用户可观察状态稳定之后。
- 删除 `ApplicationUsageAccessPage`、`UserEditPage` 中按 act warning 文本返回的局部 suppression，并为治理 owner 增加“不得重新出现 act/FakeTimers warning”的 test-only 防回退断言。
- 保留生产组件、依赖、Jest 全局配置、Vite、Playwright 与 CI 结构不变；不通过全局/局部静默、skip/only、空 `act`、扩大 mock、提高 timeout 或恢复 legacy ReactDOM 制造绿灯。
- 完成聚焦 RED/GREEN、non-silent 全量 Jest 前后量化和现有前端质量门禁；第三方或生产 owner warning 只分类记录，不越界修改生产源码。

## Capabilities

### New Capabilities

无。

### Modified Capabilities

- `web-admin-jest-toolchain`: 增加 React 18 异步提交、fake/native timer 与局部 warning suppression 的可审计测试边界。
- `web-admin-test-baseline-and-ci-gates`: 要求 non-silent 回归对已治理 owner 保持 act/FakeTimers warning 为 0，并保持 discovery、断言和默认 timeout 不弱化。

## Impact

- 测试：最新 warning 命中的 `web-admin/src/**/*.test.ts(x)` 与必要的 test-only 局部 helper。
- 文档：本 change OpenSpec artifacts、验证记录和 `docs/admin-technical-debt-baseline-2026-07-14.md` 的完成状态。
- 不影响生产源码、`package.json`、`yarn.lock`、Jest 全局 config/setup、Signup、AntD 生命周期生产 owner、Admin Go、schema、workflow、API 或 `test` 分支。
