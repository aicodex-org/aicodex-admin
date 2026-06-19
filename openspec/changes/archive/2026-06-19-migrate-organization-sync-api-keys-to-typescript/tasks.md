## 1. OpenSpec

- [x] 1.1 创建 proposal、design、tasks 和 spec delta，限定本 change 只迁移组织同步密钥前端页面与 backend client。
- [x] 1.2 完成实施前 review，确认不接管 `add-organization-sync-api-keys` active change，不改变后端 API Key 行为。

## 2. 前端迁移

- [x] 2.1 将 `OrganizationSyncApiKeyBackend.js` 迁移为 `OrganizationSyncApiKeyBackend.ts`，补充请求 payload、记录和响应类型。
- [x] 2.2 将 `OrganizationSyncApiKeyListPage.js` 迁移为 `OrganizationSyncApiKeyListPage.tsx`，补齐 props、state、API Key 记录、草稿和表格回调类型。
- [x] 2.3 保持 `ManagementPage.js`、导航和 `/organization-sync-api-keys` 路由继续导入并渲染页面，权限、文案和操作行为不变。
- [x] 2.4 新增聚焦测试，覆盖列表渲染、非 `built-in` 组织保护、明文弹窗、复制动作和 backend endpoint/payload 行为。

## 3. 验证与收口

- [x] 3.1 运行 `openspec validate migrate-organization-sync-api-keys-to-typescript --strict` 和 `git diff --check`。
- [x] 3.2 在 `web-admin` 运行增量 TypeScript 门禁、`yarn typecheck`、聚焦 Jest 覆盖率和 `yarn build`。
- [x] 3.3 记录验证结果、覆盖率口径、既有 warning 和剩余风险。
- [x] 3.4 完成归档前 review，并进入 archive / 单 commit closeout 流程，显式保持 `push_test=false`。
