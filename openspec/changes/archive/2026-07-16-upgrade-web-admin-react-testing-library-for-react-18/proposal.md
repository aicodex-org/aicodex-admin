## Why

`web-admin` 已运行 React 18.2，但 `@testing-library/react` 仍声明为 `^9.3.2` 并解析到使用 legacy `ReactDOM.render` 的 9.x 实现。当前 29 个测试文件只能局部过滤 React 18 退役告警，既掩盖真实渲染边界，也持续增加测试维护成本，因此需要在不改变生产行为的前提下把测试渲染器升级到 React 18 原生路径。

## What Changes

- 将 `@testing-library/react` 升级到经 registry 元数据证明兼容 React 18.2、当前 Node 基线、Jest 27 与 TypeScript 5.7 的维护版本，并仅补充其明确要求的 peer dev dependency。
- 使用 React 18 `createRoot` 路径执行 `render`、`cleanup` 与 `act`，增加聚焦兼容性回归测试。
- 删除最新代码中 29 个测试文件对 `ReactDOM.render` 退役告警的局部过滤；不新增全局 `console` ignore、静默 mock、skip 或放宽断言。
- 保持现有生产组件、路由、Vite、显式 Jest、Playwright、Yarn 和 CI 结构不变；保持至少 144 个 Jest suite / 1369 个 test 与 19 个 Playwright spec / 22 个 test 的发现基线。
- 审计依赖、peer 与 lockfile 差异，并记录升级前后 warning、完整测试与构建门禁证据。

## Capabilities

### New Capabilities

无。

### Modified Capabilities

- `web-admin-jest-toolchain`: 明确 React 18 测试渲染必须使用维护中的 Testing Library `createRoot` 路径，禁止通过 warning suppression 保留 legacy root。
- `web-admin-test-baseline-and-ci-gates`: 明确测试工具链升级不得减少既有 Jest/Playwright discovery 或弱化断言，并必须通过完整前端质量门禁。

## Impact

- 依赖：`web-admin/package.json`、`web-admin/yarn.lock` 中的 Testing Library 与必要 peer dev dependency。
- 测试工具链：Jest setup/config 或 test-only helper，以及 React 18 渲染兼容性测试。
- 测试：当前 29 个局部过滤文件和升级后直接失败、且不属于并行 Provider/Syncer 写集的测试。
- 文档：本 change OpenSpec artifacts、验证记录和必要的技术债路线状态更新。
- 不影响生产 bundle、Admin Go、Provider/Syncer backend wrapper、TLS/Web3 契约、Vite/Playwright/CI 结构或 `test` 分支。
