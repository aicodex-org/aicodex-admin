## Why

“身份源”菜单已经完成 `AuthSourceCenter` 低风险入口的 TSX 迁移，下一步需要继续按同一增量 TypeScript 路线推进到“组织同步密钥”页面。该页面属于身份源菜单下的独立管理页，已经有明确的后端 API 和操作边界，适合作为第二个渐进迁移 change。

本 change 目标是类型化现有页面和请求封装，保持组织同步 API Key 的创建、轮换、禁用、删除、一次性明文展示和列表行为不变，不改变尚处于 active 状态的 `add-organization-sync-api-keys` 功能规格。

## What Changes

- 将 `web-admin/src/OrganizationSyncApiKeyListPage.js` 迁移为 `OrganizationSyncApiKeyListPage.tsx`，为页面 props、state、API Key 记录、草稿和后端响应建立局部类型。
- 将 `web-admin/src/backend/OrganizationSyncApiKeyBackend.js` 迁移为 `.ts`，补充组织同步 API Key 请求/响应类型，保持 endpoint、method、credentials 和 headers 不变。
- 新增或迁移对应 `.test.tsx` / `.test.ts` 聚焦测试，覆盖列表渲染、空态/权限失败路径、built-in 组织保护、明文弹窗和请求封装脱敏边界。
- 保持 `/organization-sync-api-keys` 路由、导航、权限、文案、表格列、操作按钮、一次性明文展示和后端 API 契约不变。
- 不归档、不接管 `add-organization-sync-api-keys` active change；本 change 只表达前端 TS 迁移契约。

## Capabilities

### New Capabilities

无。

### Modified Capabilities

- `web-admin-incremental-typescript`: 身份源菜单下的组织同步密钥页面 SHALL 按渐进 TypeScript 规则迁移为 TSX/TS，并保持现有组织同步 API Key 行为兼容。

## Impact

- 影响前端文件：
  - `web-admin/src/OrganizationSyncApiKeyListPage.js` -> `web-admin/src/OrganizationSyncApiKeyListPage.tsx`
  - `web-admin/src/backend/OrganizationSyncApiKeyBackend.js` -> `web-admin/src/backend/OrganizationSyncApiKeyBackend.ts`
  - 新增或迁移相关测试文件。
- 不影响：
  - 后端 `OrganizationSyncApiKey` 模型、控制器、路由、鉴权和数据库表。
  - `/api/organization-sync-api-keys*` 和 `/api/organization-sync/export` API 契约。
  - 企业微信/飞书组织同步页面、同步器列表页、同步器编辑页、OIDC/OAuth 登录、Gateway/Insight。
  - 真实密钥、真实租户同步、生产或类生产配置。
