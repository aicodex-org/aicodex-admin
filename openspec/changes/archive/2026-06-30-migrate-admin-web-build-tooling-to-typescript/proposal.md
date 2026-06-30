## Why

`web-admin/craco.config.js` 和 `web-admin/mv.js` 仍是构建入口关键脚本。当前 `web-admin/src` 已进入 TypeScript 收尾阶段，如果这些构建/后处理脚本继续完全脱离 TypeScript 静态检查，后续维护 CRACO 代理、webpack build output 和 postbuild 重命名逻辑时仍容易产生隐性回归。

本 change 保守迁移 build tooling 的维护方式：运行入口继续保持 Node/CRACO 可直接加载的 `.js`，同时通过 `// @ts-check`、JSDoc 类型和专用 TypeScript 校验配置覆盖这两个脚本。

## What Changes

- 为 `web-admin/craco.config.js` 和 `web-admin/mv.js` 增加脚本级类型约束。
- 新增专用 build tooling TypeScript 校验入口，覆盖 CRACO 配置和 postbuild 脚本。
- 保持 `craco.config.js`、`mv.js`、`yarn start`、`yarn build` 和 `postbuild` 的 runtime 加载路径兼容。
- 不改变 CRACO dev proxy、Less plugin、webpack output、polyfill fallback、source-map warning ignore 或 postbuild `build-temp -> build` 语义。

## Capabilities

### New Capabilities

无。

### Modified Capabilities

- `web-admin-incremental-typescript`: 增加 web-admin build tooling 脚本的渐进 TypeScript 静态校验场景。

## Impact

- 前端构建工具：触碰 `web-admin/craco.config.js`、`web-admin/mv.js`，新增专用 typecheck config/script。
- 验证：新增/运行 build tooling 静态校验；继续运行 `yarn typecheck`、增量 TS gate 和 `yarn build`。
- 不触碰 `web-admin/src/*`、`web-admin/cypress/*`、`web-admin/public/*` 或认证、Provider、Application、Syncer、Organization 编辑等并行写集。
