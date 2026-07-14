## Why

`web-admin` 当前全量 Jest 基线存在 6 个失败 suite、9 个失败测试，失败主要来自近期公共壳改动后的陈旧精确断言、样式聚合清单漂移和超大异步测试超时。现有 CI 只显式执行前端 build 和 Cypress，没有独立执行全量 Jest、`yarn typecheck` 与增量 TypeScript gate，导致聚焦测试通过的 change 仍可把全量回归基线留红。

## What Changes

- 修复当前可复现的 6 个失败 Jest suite，保持生产页面、路由、权限、后端契约和用户可见行为不变。
- 将依赖源码字符串顺序或过时组件内部结构的断言改为稳定的行为、语义 class 集合或公共组件契约断言。
- 拆分或收敛包含大量串行异步分支的超大测试，使用明确的 promise/状态完成条件替代无必要的重复轮询；不通过全局提高 timeout 掩盖根因。
- 增加可复用的非 watch CI 测试入口，并在 GitHub Actions 中显式运行 `yarn typecheck`、增量 TypeScript gate 和全量 Jest。
- 保留现有 frontend build 与 Cypress 流程；不在本 change 中升级 React、Testing Library、CRACO、React Router 或其它依赖。

## Capabilities

### New Capabilities

- `web-admin-test-baseline-and-ci-gates`: 定义 web-admin 稳定 Jest 基线、低脆弱性测试约束和 CI 必须执行的 TypeScript/Jest 门禁。

### Modified Capabilities

无。

## Impact

- 影响 `web-admin` 当前失败的聚焦 Jest 测试、测试脚本和 `.github/workflows/build.yml`。
- 可能新增仅用于 CI 的 `package.json` script，但不新增或升级依赖，不修改 lockfile。
- 不修改生产组件/API 契约，不需要数据库、60 测试后台或浏览器运行态验收。
