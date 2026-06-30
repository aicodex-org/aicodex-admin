## 1. OpenSpec

- [x] 1.1 创建 `migrate-admin-syncer-edit-to-typescript` change，补齐 proposal、design、tasks 和 spec delta。
- [x] 1.2 完成实施前 review，确认范围只覆盖同步器编辑页和必要的字段映射表格组件。

## 2. 实现

- [x] 2.1 将 `web-admin/src/table/SyncerTableColumnTable.js` 迁移为 `SyncerTableColumnTable.tsx`，补齐字段行、props、回调和表格列类型。
- [x] 2.2 将 `web-admin/src/SyncerEditPage.js` 迁移为 `SyncerEditPage.tsx`，补齐 props、state、同步器记录和历史动态字段类型。
- [x] 2.3 确认 `ManagementPage.js` 的 `./SyncerEditPage` 无后缀 import、同步器 backend client 和表格组件导入在 JS/TS 共存下保持兼容。
- [x] 2.4 如新增或触碰同步器编辑页测试，使用 `.test.tsx`，不引入真实数据库、真实密钥或真实外部同步器调用。

## 3. 验证与交付

- [x] 3.1 运行 `openspec validate migrate-admin-syncer-edit-to-typescript --strict` 和 `git diff --check origin/hfl-test-base..HEAD`。
- [x] 3.2 在 `web-admin` 运行同步器相关聚焦 Jest、`yarn typecheck`、增量 TypeScript gate 和 `yarn build`。
- [x] 3.3 记录验证结果、deferred 片段和剩余风险；按 release-candidate-only 提交并推送工作分支，不 archive、不合入 `hfl-test-base`、不 push `test`。
