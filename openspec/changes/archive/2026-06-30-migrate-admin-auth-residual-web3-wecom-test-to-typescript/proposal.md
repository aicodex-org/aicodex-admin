## Why

Admin `web-admin/src/auth` 的核心流程、support 组件和登录按钮批次已经完成 TS 迁移，但目录内仍残留 `Web3Auth.js` 和 `WeComLoginPanel.test.js`。将这两个低范围残口迁移到 TypeScript/TSX，可以收尾 auth 目录 JS/TS 混合成本，同时不改变真实登录、轮询、MFA 或第三方 SDK 行为。

## What Changes

- 将 `web-admin/src/auth/Web3Auth.js` 按实际 JSX 使用迁移为 `Web3Auth.ts`。
- 将 `web-admin/src/auth/WeComLoginPanel.test.js` 迁移为 `WeComLoginPanel.test.tsx`，保持现有 WeCom panel 测试真实执行。
- 仅在 auth 本地使用窄类型描述 Web3 SDK/window 注入对象、组件 props、测试 mock 和事件边界。
- 保持 Web3 登录、WeCom panel 轮询/intent/MFA、认证 URL、回调参数、token/cookie 处理和后端 API 契约不变。

## Capabilities

### New Capabilities

### Modified Capabilities

- `web-admin-incremental-typescript`: 增加 auth residual Web3/WeCom 测试残留文件的渐进 TypeScript 收尾要求。

## Impact

- 影响前端源码：`web-admin/src/auth/Web3Auth`。
- 影响测试：`web-admin/src/auth/WeComLoginPanel.test`。
- 不新增依赖，不修改 `web-admin/package.json`、lockfile、`tsconfig.json` 或构建基础设施。
- 不触碰 common/table/provider/backend/Application/Syncer/root shell/config/basic/account/pricing/entry 等并行或已完成写集。
