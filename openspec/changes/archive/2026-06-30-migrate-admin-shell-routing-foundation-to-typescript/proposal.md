## Why

Admin 前端的大部分页面和 provider/syncer 配置链路已经进入渐进 TypeScript 迁移，但 root shell、路由入口、全局配置与基础列表父类仍停留在 legacy JavaScript。后续页面迁移会继续穿过 `App`、`ManagementPage`、`Setting` 和 `BaseListPage` 这些高扇出边界，当前适合用一次保守批次降低 JS/TS 混合成本。

本 change 聚焦机械迁移 root shell / routing / config foundation，不重做 UI、不改变菜单、登录守卫、路由语义、设置读写或后端 API 契约。

## What Changes

- 将 root shell、路由与配置基础文件迁移到 `.ts` / `.tsx`：`adminLoginRouting`、`Conf`、`enterpriseNavigation`、`i18n`、`serviceWorker`、`setupTests`、`index`、`App`、`ManagementPage`、`Setting` 和 `BaseListPage`。
- 将对应根壳与管理页测试迁移到 `.test.tsx`：`App.test`、`ManagementPage.test`、`ManagementPage.navigation.test` 和 `Setting.test`。
- 使用局部 props/state、路由、配置、菜单和 legacy dynamic 类型封住未迁移页面或第三方组件边界，保持无后缀 import 兼容。
- 如 `BaseListPage` 或其它高扇出文件牵出过大类型洞，记录明确 deferred 和后续拆分，但优先完成本批主体。
- 不改变登录入口、权限、菜单、workspace tabs、设置保存、service worker 行为、i18n 初始化、后端 API wrapper 或用户可见文案。

## Capabilities

### New Capabilities

- 无。

### Modified Capabilities

- `web-admin-incremental-typescript`: 增加 Admin root shell、routing、config foundation 的渐进 TS/TSX 迁移约定与验证要求。

## Impact

- Affected code:
  - `web-admin/src/adminLoginRouting.js` -> `.ts`
  - `web-admin/src/Conf.js` -> `.ts`
  - `web-admin/src/enterpriseNavigation.js` -> `.ts` / `.tsx`
  - `web-admin/src/i18n.js` -> `.ts`
  - `web-admin/src/serviceWorker.js` -> `.ts`
  - `web-admin/src/setupTests.js` -> `.ts`
  - `web-admin/src/index.js` -> `.tsx`
  - `web-admin/src/App.js` -> `.tsx`
  - `web-admin/src/App.test.js` -> `.test.tsx`
  - `web-admin/src/ManagementPage.js` -> `.tsx`
  - `web-admin/src/ManagementPage.test.js` -> `.test.tsx`
  - `web-admin/src/ManagementPage.navigation.test.js` -> `.test.tsx`
  - `web-admin/src/Setting.js` -> `.tsx`
  - `web-admin/src/Setting.test.js` -> `.test.tsx`
  - `web-admin/src/BaseListPage.js` -> `.tsx`
- Affected specs: `web-admin-incremental-typescript`
- 不涉及后端、数据库、Provider/Application/Syncer 编辑页、auth 组件、common/table shared UI primitives、locales 文案或 `test` 分支。
