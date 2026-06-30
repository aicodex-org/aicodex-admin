## Why

Admin 前端仍有一批核心后台路由页面停留在 legacy JavaScript。用户确认当前 Admin 项目主要由本路线推进，历史 active changes 不应限制本轮 TypeScript 迁移步幅，因此本 change 的范围从“审计运维四页”扩容为“核心后台路由页面批量 TS/TSX 迁移 batch”。

本轮目标是继续推进 `web-admin` 渐进式 TypeScript 路线，用类型检查约束列表、编辑页、概览页、路由 props、分页、表单、行操作和后端响应边界，同时保持现有业务行为、视觉、路由语义和 API 契约不变。

## What Changes

- 保留原审计运维四页迁移：`RecordListPage.js`、`SessionListPage.js`、`TokenListPage.js`、`VerificationListPage.js` 迁移为 `.tsx`，保留查询、分页、排序、删除、详情抽屉、复制和敏感字段脱敏行为。
- 增加凭据/令牌中小编辑页迁移：`CertEditPage.js`、`KeyEditPage.js`、`TokenEditPage.js` 迁移为 `.tsx`。
- 增加连接/同步中小编辑页迁移：`LdapEditPage.js`、`LdapSyncPage.js`、`WebhookEditPage.js` 迁移为 `.tsx`。
- 增加身份控制台总览页迁移：`IdentityConsoleOverview.js` 迁移为 `.tsx`，如触碰测试则将 `IdentityConsoleOverview.test.js` 迁移为 `.test.tsx`。
- 可顺手迁移低风险小型路由/页面壳：`AccountPage.js`、`basic/AppListPage.js`、`basic/Dashboard.js`、`EntryPage.js`、`CaptchaPage.js`、`QrCodePage.js`，若某页类型洞明显放大风险则记录 deferred。
- 如聚焦测试触碰相关页面测试，优先迁移为 `.test.tsx`，并保留既有行为断言。
- 为 legacy `BaseListPage.js`、后端 API wrapper 或宽松响应结构补最小局部类型，不因本 change 重构 BaseListPage、App、ManagementPage、Setting、认证登录主链路、Provider/Application/Syncer 主编辑链路。
- 不新增后端 API，不改变菜单/路由语义，不做视觉设计或交互行为改版。

## Capabilities

### New Capabilities

无。

### Modified Capabilities

- `web-admin-incremental-typescript`: 增加 Admin 核心后台路由页面 batch TS/TSX 迁移要求，约束迁移范围、行为兼容、deferred 规则和验证门禁。

## Impact

- 主要影响 `web-admin/src/RecordListPage.*`、`web-admin/src/SessionListPage.*`、`web-admin/src/TokenListPage.*`、`web-admin/src/VerificationListPage.*`、`web-admin/src/CertEditPage.*`、`web-admin/src/KeyEditPage.*`、`web-admin/src/TokenEditPage.*`、`web-admin/src/LdapEditPage.*`、`web-admin/src/LdapSyncPage.*`、`web-admin/src/WebhookEditPage.*`、`web-admin/src/IdentityConsoleOverview.*` 及低风险小型页面壳。
- 影响 TypeScript no-emit 检查、增量 TS gate、聚焦 Jest 和生产构建。
- 不涉及 Admin 后端、数据库、认证授权、真实 token/验证码生成、OIDC、WeCom/Feishu 同步、`ManagementPage.js`、`App.js`、`Setting.js`、`BaseListPage.js` 或 `test` 分支发布流程。
