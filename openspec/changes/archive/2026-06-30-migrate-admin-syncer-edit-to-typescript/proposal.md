## Why

同步器列表页和前端 backend client 已经完成渐进 TypeScript 迁移，但 `/syncers/:syncerName` 对应的 `SyncerEditPage.js` 仍是大型 legacy JavaScript 表单。该页面承载同步器源/目标配置、数据库连接、表格字段映射、保存和删除入口，后续维护同步配置链路时仍需要在 JS/TS 边界之间来回切换。

本 change 聚焦迁移同步器编辑页和必要的字段映射表格组件，以降低后续同步器配置维护成本，同时保持现有同步器保存、测试连接、源/目标配置和后端 API 契约不变。

## What Changes

- 将 `web-admin/src/SyncerEditPage.js` 迁移为 `SyncerEditPage.tsx`，使用页面局部类型描述 props、state、路由参数、同步器记录和历史动态字段。
- 将 `web-admin/src/table/SyncerTableColumnTable.js` 迁移为 `SyncerTableColumnTable.tsx`，为表格字段行、props 和 Ant Design 表格列补齐必要类型。
- 保持 `ManagementPage.js` 对 `./SyncerEditPage` 的无后缀 import 兼容。
- 新增或触碰测试时优先使用 `.test.tsx`，并运行同步器相关聚焦测试、增量 TypeScript gate、`yarn typecheck` 和 `yarn build`。

## Non-Goals

- 不迁移 `ApplicationEditPage.js`、`ProviderEditPage.js`、`provider/*`、`auth/*`、`ManagementPage.js`、`App.js`、`Setting.js` 或 `BaseListPage.js`。
- 不改变同步器保存、源/目标配置、表格列编辑、测试连接、删除或跳转语义。
- 不修改后端同步器 API、请求参数、响应结构、权限、数据库字段、同步运行逻辑或定时逻辑。
- 不新增同步器类型，不重做同步器编辑页 UI，不引入全局同步器模型抽象。

## Impact

- Affected specs: `web-admin-incremental-typescript`
- Affected code:
  - `web-admin/src/SyncerEditPage.js` -> `web-admin/src/SyncerEditPage.tsx`
  - `web-admin/src/table/SyncerTableColumnTable.js` -> `web-admin/src/table/SyncerTableColumnTable.tsx`
  - 同步器编辑页相关 `.test.tsx`（如需要）
