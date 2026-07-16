## Why

`web-admin` 已使用 React 18 与 Vite `es2020` production build，当前浏览器查询也不包含已停止维护的 Internet Explorer，但生产入口和 Jest setup 仍由 `react-app-polyfill` 注入 CRA/IE 兼容层。这形成重复且误导的浏览器支持信号，并保留无独立 owner 的 fetch、Promise、RAF 等传递依赖。

最新基线证明 `core-js`、自定义 `replaceAll` fallback、Jest/Babel/jsdom 与认证回调均有独立边界，可以在不改变现有现代浏览器目标、认证契约或测试 runner 的前提下退役 CRA polyfill，并用依赖、bundle、全量测试和真实 Chromium smoke 验证结果。

## What Changes

- 固化 `web-admin` 的 production 浏览器支持边界：Vite `es2020` 与当前 production browserslist 是真值，Internet Explorer 不在支持范围内；本 change 不扩大或收窄其它现代浏览器目标。
- 从生产入口移除 `react-app-polyfill/ie9` 与 `react-app-polyfill/stable`，从 Jest setup 移除 `react-app-polyfill/jsdom`，并删除 `react-app-polyfill` 直接依赖及失去 owner 的 lock 条目。
- 保留有独立 owner 的 `core-js`、Babel/Jest/jsdom、`regenerator-runtime` 传递依赖和当前 `replaceAll` fallback；不通过删除 CRA 残留顺手升级 React、Router、Jest、AntD、Vite 或 Bun。
- 用 TDD 固定 production/Jest 不再依赖 CRA polyfill，运行完整质量门禁，并以同口径记录直接依赖、lock entries、production JS bytes/gzip 差异。
- 使用真实 Chromium 验证登录启动、OIDC/认证回调路由可达性与 public auth scripts，不连接或写入 60 真实配置。
- 更新 Admin 技术债基线，将 P2 CRA/IE polyfill 条目标记为完成并记录保留的显式兼容 owner。

## Capabilities

### New Capabilities
- `web-admin-browser-support-and-polyfills`: 定义 React 18 + Vite production 浏览器支持真值、CRA/IE polyfill 退役、保留兼容 owner、认证入口 smoke 与 bundle/依赖验证要求。

### Modified Capabilities
- `web-admin-jest-toolchain`: Jest 的显式 jsdom 初始化不再加载 `react-app-polyfill/jsdom`，同时保持现有 jsdom globals、setup、discovery、mock 与测试行为。

## Impact

- 前端生产入口：`web-admin/src/index.tsx`。
- Jest 配置与契约测试：`web-admin/jest.config.cjs`、`web-admin/src/FrontendCiGates.test.ts`及必要聚焦测试。
- 依赖真值：`web-admin/package.json`、`web-admin/yarn.lock`；Yarn 1继续是唯一 package manager 真值。
- 验证与文档：Vite production build、Playwright/Chromium smoke、public auth scripts、`docs/admin-technical-debt-baseline-2026-07-14.md`。
- 不修改 API/后端/Provider/Syncer/TLS/schema/fixture/CI workflow、认证 payload 或路由契约，也不 push/merge `test`。
