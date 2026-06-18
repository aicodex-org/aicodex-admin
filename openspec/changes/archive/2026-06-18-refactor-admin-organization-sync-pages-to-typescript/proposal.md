## Why

企业微信组织同步和飞书组织同步页面已经成为同类 Admin 组织身份同步入口，但当前仍是大型 legacy JavaScript 页面，视觉密度、操作区、运行记录和诊断呈现不一致，后续维护和继续迁移到 TS/React 的成本偏高。

本 change 以“共享外壳 + 保守迁移”为边界，把两个同步页面逐步迁移到 TypeScript/TSX，并统一同类同步页面的基础体验，同时保留飞书已有 dry-run、绑定诊断和交接证据等差异能力。

## What Changes

- 新增或迁移 Admin 前端组织同步页面的共享 TS/TSX 外壳、类型和轻量展示组件，用于页面标题、provider logo、目标组织、操作按钮、同步选项、定时同步、状态摘要和同步记录等共同结构。
- 将企业微信组织同步页迁移到 TSX，保持现有接口、路由、权限、保存、测试连接、手动同步、定时同步和同步记录行为兼容。
- 将飞书组织同步页按保守方式迁移到 TSX 或 TS/TSX 分层文件，保留现有 dry-run 预览、dry-run 历史、绑定诊断、交接证据、验收资料、连接测试、手动同步和同步记录行为。
- 统一企业微信和飞书同步页面的管理后台风格：共同的标题区、provider logo、表单布局、操作按钮顺序、状态标签和同步记录扫描方式。
- 在合适位置展示企业微信和飞书/Lark provider logo，优先复用现有 `Setting.getProviderLogoURL` provider logo 资源，不新增外部品牌素材。
- 保持 KISS/YAGNI：小诊断默认收敛，有告警或阻断时再展开；飞书差异能力不强行复制到企业微信页面，企业微信已发布行为不做功能扩张。
- 不改变后端 API、同步执行逻辑、真实租户凭据、OAuth/OIDC 登录、Gateway/Insight 投影或生产/类生产配置。

## Capabilities

### New Capabilities

- 无。

### Modified Capabilities

- `web-admin-incremental-typescript`: 组织同步页面迁移 SHALL 遵循渐进 TS/TSX 规则，新增共享组件和类型默认使用 TS/TSX，并以 typecheck、聚焦测试和 build 验证。
- `wecom-organization-sync`: 企业微信组织同步 Admin UI SHALL 使用统一组织同步页面外壳、provider logo 和一致的同步操作/记录呈现，同时保持现有发布行为兼容。
- `feishu-organization-sync`: 飞书/Lark 组织同步 Admin UI SHALL 使用统一组织同步页面外壳、provider logo 和一致的基础同步操作/记录呈现，同时保留飞书特有的 compact dry-run、绑定诊断和交接证据体验。

## Impact

- Affected frontend code:
  - `web-admin/src/WecomOrganizationSyncPage.js` and tests, expected migration to `.tsx` or wrapper-backed TSX.
  - `web-admin/src/FeishuOrganizationSyncPage.js`, existing `FeishuOrganizationSyncPageUtils.ts`, and tests, expected incremental split or migration to `.tsx`.
  - New shared files under `web-admin/src/organizationSync/` or an equivalent local frontend folder for organization sync UI shell, types, logo header, action bar, status tags, and run table helpers.
  - `web-admin/src/backend/*OrganizationSyncBackend.js` may remain JS unless request/response typings require a small TS wrapper; backend API contracts are unchanged.
- Validation impact:
  - `web-admin` incremental TypeScript gate.
  - `yarn typecheck`.
  - Focused Jest tests for both sync pages and shared TS/TSX helpers.
  - `yarn build`.
  - Browser or Playwright visual verification for both `/wecom-org-sync` and `/feishu-org-sync`.
- No database, Go backend, OAuth/OIDC, real Feishu/Lark/WeCom credential, Gateway, Insight, or production data writes are in scope.
