## 1. OpenSpec

- [x] 1.1 创建 proposal、design、tasks 和 spec delta，限定本 change 只迁移飞书组织同步主页面、backend client 和主测试。
- [x] 1.2 完成实施前 review，确认不改变飞书同步后端契约、真实租户同步、页面文案和 UX 语义。

## 2. 前端迁移

- [x] 2.1 将 `FeishuOrganizationSyncBackend.js` 迁移为 `FeishuOrganizationSyncBackend.ts`，补充配置、preview/history、binding conflict、handoff evidence 和 run 响应类型。
- [x] 2.2 将 `FeishuOrganizationSyncPage.js` 迁移为 `FeishuOrganizationSyncPage.tsx`，补齐 props、state、配置、运行记录、preview/history/evidence 和表格/弹窗类型。
- [x] 2.3 将 `FeishuOrganizationSyncPage.test.js` 迁移为 `FeishuOrganizationSyncPage.test.tsx`，保留现有断言并适配 TSX 测试类型。
- [x] 2.4 确认 `ManagementPage.js`、导航和 `/feishu-org-sync` 路由继续导入并渲染页面，权限、文案、请求和用户可见行为不变。

## 3. 验证与收口

- [x] 3.1 运行 `openspec validate migrate-feishu-organization-sync-page-to-typescript --strict` 和 `git diff --check`。
- [x] 3.2 在 `web-admin` 运行增量 TypeScript 门禁、`yarn typecheck`、聚焦 Jest/coverage 和 `yarn build`。
- [x] 3.3 记录验证结果、coverage 口径、既有 warning、未触发真实飞书租户同步的证据层级。
- [x] 3.4 完成归档前 review，并进入 archive / 单 commit closeout 流程，显式保持 `push_test=false`。
