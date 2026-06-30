## Why

Admin 前端仍有一批基础入口页、basic 展示组件和账号轻组件停留在 legacy JavaScript。趁当前无新功能窗口，将这些低耦合文件批量迁移到 TypeScript/TSX，可以减少 JS/TS 混合维护成本，并为后续 shell/config 批次保留清晰边界。

## What Changes

- 将基础入口/公开轻页面 `EntryPage`、`CaptchaPage`、`QrCodePage` 迁移为 `.tsx`。
- 将 `web-admin/src/basic/` 下的展示组件 `AppListPage`、`Dashboard`、`GridCards`、`SingleCard`、`CustomHead` 迁移为 `.tsx`。
- 将账号轻组件 `WeComProfileSyncPanel`、`AccountAvatar` 及触碰的 React 测试迁移为 `.tsx` / `.test.tsx`。
- 在不牵出共享组件、backend、auth、provider、Application 或 Syncer 写集的前提下，迁移低风险独立轻文件 `pricing/SingleCard`、`IframeEditor`、`ToolTable`、`TourConfig` 和触碰测试。
- 保持既有路由、跳转、captcha/二维码/account sync API payload、dashboard 数据契约和 Tour 配置语义不变。

## Capabilities

### New Capabilities

### Modified Capabilities

- `web-admin-incremental-typescript`: 增加基础入口、basic 展示组件、账号轻组件和独立轻文件的渐进 TypeScript 迁移要求。

## Impact

- 影响前端源码：`web-admin/src/EntryPage`、`CaptchaPage`、`QrCodePage`、`basic/*`、`account/*` 和可并入的独立轻文件。
- 影响测试：触碰的 React 测试改为 `.test.tsx` 并继续覆盖既有行为。
- 不新增依赖，不修改 `web-admin/package.json`、lockfile、`tsconfig.json` 或构建基础设施。
- 不修改 `test`、backend/common/table/auth/provider/Application/Syncer 写集、全局 shell/config 文件或真实认证/Provider/生产配置行为。
