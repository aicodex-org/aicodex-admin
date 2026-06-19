## Why

“身份源”菜单已完成 `AuthSourceCenter` 和“组织同步密钥”页面的增量 TypeScript 迁移。下一步应迁移飞书组织同步主页面，因为它是飞书登录/通讯录同步验证的核心入口，也是后续同步页面一致性和维护性的主要风险点。

`FeishuOrganizationSyncPage.js` 当前承载配置、连接测试、预览影响、预览历史、绑定冲突、交接证据、同步记录和手动同步等复杂状态。迁移目标是给现有页面和 backend client 建立类型边界，保持路由、权限、文案、接口、轮询、脱敏、分页和用户可见行为不变。

## What Changes

- 将 `web-admin/src/FeishuOrganizationSyncPage.js` 迁移为 `FeishuOrganizationSyncPage.tsx`，补齐 props、state、配置、运行记录、dry-run、绑定冲突、handoff evidence 和表格/弹窗状态类型。
- 将 `web-admin/src/backend/FeishuOrganizationSyncBackend.js` 迁移为 `.ts`，补充飞书组织同步请求/响应类型，保持 endpoint、method、credentials、headers 和 payload 不变。
- 将主页面测试 `FeishuOrganizationSyncPage.test.js` 迁移为 `.test.tsx`，保留现有断言，覆盖配置、预览、历史、绑定冲突、交接证据、同步记录和复制行为。
- 保留已有 `FeishuOrganizationSyncPageTenantTarget.test.tsx`、`FeishuOrganizationSyncPageUtils.ts` 和 `organizationSync/FeishuOrganizationSyncTypes.ts`，只在类型复用必要时做小范围对齐。
- 不改变飞书/Lark Contact v3 调用、真实租户同步、后端对象、路由、权限、调度、dry-run 历史、绑定冲突或 handoff evidence 语义。

## Capabilities

### New Capabilities

无。

### Modified Capabilities

- `web-admin-incremental-typescript`: 身份源菜单下的飞书组织同步主页面 SHALL 按渐进 TypeScript 规则迁移为 TSX/TS，并保持现有飞书组织同步用户流程兼容。

## Impact

- 影响前端文件：
  - `web-admin/src/FeishuOrganizationSyncPage.js` -> `web-admin/src/FeishuOrganizationSyncPage.tsx`
  - `web-admin/src/backend/FeishuOrganizationSyncBackend.js` -> `web-admin/src/backend/FeishuOrganizationSyncBackend.ts`
  - `web-admin/src/FeishuOrganizationSyncPage.test.js` -> `web-admin/src/FeishuOrganizationSyncPage.test.tsx`
  - 必要时最小调整相关 TS 类型或测试 import。
- 不影响：
  - 后端飞书组织同步服务、控制器、路由、对象、调度和数据库。
  - 真实飞书/Lark secret、真实 Contact v3 调用、真实租户同步或运行态 fixture。
  - 企业微信同步页面、组织同步密钥页面、同步器列表页、同步器编辑页、OIDC/OAuth 登录、Gateway/Insight。
