## Why

`web-admin` 的应用开发与生产构建已经迁移到 Vite 8，但 Jest 仍由 `react-scripts 5.0.1` 隐式提供 transform、jsdom、setup、模块映射和 discovery。接入时基线已达到 141 suites / 1329 tests；上游 base 更新后还会重新实跑确认。现在应在不迁移 Vitest、不升级 React 生态依赖且不改变业务行为的前提下，把测试工具链收口为显式、可维护、可独立验证的 Jest 配置。

## What Changes

- 建立显式 Jest 27 配置，覆盖 TS/TSX/JS/JSX transform、jsdom environment、setup files、测试发现、coverage、module extensions、reset mocks、watch plugins、style/asset/SVG mapping 与 CommonJS/ESM 兼容边界。
- 保持 `yarn test` 的开发 watch 体验，并让 `yarn test:ci` 通过独立 Jest CLI 以非 watch、单进程、非交互方式执行全部已提交测试；0 tests 或任一 suite 失败时命令必须失败。
- 将当前经 `react-scripts` 间接获得、但 Jest 或现有测试直接需要的包改为显式开发依赖；移除 `react-scripts` 及只为其遗留的 package 配置，同时保留生产入口仍使用的 `react-app-polyfill`。
- 对照旧 runner 与新显式配置的 `--listTests` 路径集合和全量结果，不增加 ignore、skip、silent omission 或删除测试来制造绿灯；保留 mocks、fake timers、dynamic imports、CommonJS/ESM、jsdom globals 与既有 React 18 warning 断言语义。
- 保持 Vite `start/build`、public scripts、生产 lint、TypeScript gates 和 GitHub Actions job 边界；现有 workflow 继续调用 `yarn test:ci`，不修改 Go/backend/integration/linter 段。
- 不改变用户可见行为、路由、权限、后端 API、认证协议或运行态配置，不迁移 Vitest，不升级 React、React Router、Testing Library，也不执行 class-to-hooks。

## Capabilities

### New Capabilities

- `web-admin-jest-toolchain`: 定义独立于 React Scripts 的显式 Jest 配置、兼容语义、discovery/coverage 契约和开发/CI 运行入口。

### Modified Capabilities

- `web-admin-test-baseline-and-ci-gates`: 将全量测试入口从 React Scripts 隐式 Jest 改为独立 Jest CLI，并允许为该解耦收敛显式测试开发依赖与 lockfile，同时继续保持生产行为和 CI gate 不变。

## Impact

- 影响 `web-admin/package.json`、`web-admin/yarn.lock`、新的 Jest 配置/transform/mock 文件，以及验证测试和本 change OpenSpec artifacts。
- `.github/workflows/build.yml` 的 frontend Jest step 继续调用稳定的 `yarn test:ci`；若无需调整 step，本 change 保持 workflow 零 diff，从而不接管并行 Go worker 的写集。
- 直接测试依赖将固定在当前 Jest 27 兼容线，不升级 React、Router、Testing Library 或运行时依赖；Vite 8.1.4 仍是唯一默认应用 dev/build 工具链。
- 不影响 Admin Go runtime config、Go fixture/schema、后端 job、真实认证链路、数据库或测试/生产环境。
