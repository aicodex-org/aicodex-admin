## Why

“身份源”菜单正在按渐进 TypeScript 路线逐步收敛。`AuthSourceCenter` 和组织同步密钥页面已经迁移到 TSX，飞书组织同步主页面也已作为独立 change 完成本地实现但等待远端 Git TLS 恢复后收口。下一步需要继续迁移同步器列表页，为后续身份源菜单页面统一类型边界和测试验证积累可复用范式。

`SyncerListPage` 是 `/syncers` 下的列表入口，承担同步器新增、删除、运行同步、分页筛选排序和未授权展示。它比 `SyncerEditPage` 小，且不包含复杂编辑表单，适合作为本阶段迁移目标。

## What Changes

- 将 `web-admin/src/SyncerListPage.js` 迁移为 `SyncerListPage.tsx`，为 props、state、同步器记录、表格列和 fetch 参数补齐局部类型。
- 将 `web-admin/src/backend/SyncerBackend.js` 迁移为 `SyncerBackend.ts`，导出同步器记录和通用响应类型，保持所有 endpoint、参数和 HTTP 方法不变。
- 新增或迁移聚焦测试为 `.test.tsx`，覆盖列表渲染、新建默认同步器、组织筛选、运行同步、删除、未授权和错误分支。
- 更新 `web-admin-incremental-typescript` 规格，明确同步器列表页迁移规则和验证要求。

## Non-Goals

- 不迁移 `SyncerEditPage.js`、`SyncerTableColumnTable.js` 或同步器编辑表单；编辑页需要后续单独评估。
- 不改变 `/syncers`、`/syncers/:syncerName` 路由、权限、菜单、表格列、分页筛选排序、按钮文案或后端 API 契约。
- 不新增同步器类型，不调整同步器运行逻辑、定时逻辑、数据库字段或后端实现。
- 不触碰真实认证、OAuth/OIDC、Provider contract、Gateway projection、真实密钥或生产/类生产配置。

## Impact

- Affected specs: `web-admin-incremental-typescript`
- Affected code:
  - `web-admin/src/SyncerListPage.js` -> `web-admin/src/SyncerListPage.tsx`
  - `web-admin/src/backend/SyncerBackend.js` -> `web-admin/src/backend/SyncerBackend.ts`
  - 新增或迁移 `web-admin/src/SyncerListPage.test.tsx`
