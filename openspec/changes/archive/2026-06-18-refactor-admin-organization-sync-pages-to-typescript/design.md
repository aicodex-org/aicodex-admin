## Context

`web-admin` 已启用渐进 TypeScript，当前允许 `.js`、`.ts`、`.tsx` 共存，并要求新增 React 组件默认使用 TSX。企业微信组织同步页和飞书组织同步页仍是 legacy JavaScript 页面：

- `web-admin/src/WecomOrganizationSyncPage.js` 约 627 行，已发布，功能集中在配置、连接测试、手动/定时同步和同步记录。
- `web-admin/src/FeishuOrganizationSyncPage.js` 约 1700 行，除基础同步能力外，还包含 dry-run 预览、预览历史、绑定诊断、交接证据和验收资料。

两个页面同属 Admin 组织身份同步入口，但目前标题、操作区、同步记录、诊断区和视觉品牌呈现不一致。用户已确认采用“共享外壳 + 保守迁移”，目标是提高长期可维护性和页面一致性，而不是重新设计同步能力或扩张功能边界。

## Goals / Non-Goals

**Goals:**

- 将企业微信组织同步页和飞书组织同步页迁移到 TypeScript/TSX 路线，符合 `web-admin` 渐进 TypeScript 规则。
- 抽取小而稳定的共享组织同步页面外壳和展示组件，覆盖页面标题、provider logo、目标组织区域、操作按钮、同步选项、定时同步、状态标签和同步记录等共同结构。
- 统一企业微信和飞书页面的后台工具型风格，让同类同步页的基础流程、按钮顺序、状态提示和记录表格可预测。
- 飞书页面保留差异能力，但继续遵循 compact 原则：小诊断默认收敛，有告警、阻断或错误时才展开。
- 复用现有 provider logo 解析能力展示企业微信和飞书/Lark logo，不新增外部品牌素材。

**Non-Goals:**

- 不改变企业微信或飞书后端 API、数据模型、同步执行、定时调度、软禁用、组织绑定或映射规则。
- 不新增企业微信 dry-run、交接证据、绑定诊断等飞书特有能力。
- 不触碰 OAuth/OIDC 登录、Provider 配置契约、Gateway/Insight、真实租户凭据、生产/类生产配置或测试环境数据清理。
- 不做全站 TS 迁移、React hooks 大重写、包升级、路由重构、导航 IA 改造或全局视觉系统重做。

## Decisions

### Decision 1: Use shared shell components, not a generic sync framework

Create a small frontend-only shared layer, for example `web-admin/src/organizationSync/`, with TS/TSX components and helpers such as:

- `OrganizationSyncPageHeader.tsx`: provider logo, title, subtitle or compact status text.
- `OrganizationSyncActionBar.tsx`: stable save/test/preview/history/sync/refresh button layout.
- `OrganizationSyncRunTable.tsx` or `OrganizationSyncRunTableColumns.tsx`: common run status tags, run time, impact counts, safe summary rendering.
- `OrganizationSyncTypes.ts`: minimal shared config/run/status/provider display types.

This keeps common UI consistent without forcing WeCom and Feishu into a single abstract service model. A fully generic sync-page framework was rejected because Feishu has substantially more read-only diagnostics and evidence areas, while WeCom is already published and should remain simple.

### Decision 2: Migrate incrementally and keep behavior-compatible wrappers where useful

Prefer direct `.tsx` migration for the smaller WeCom page. For the larger Feishu page, migrate in slices: shared types/helpers first, extracted TSX components second, then page file rename or typed wrapper once the surface is small enough. Existing JS tests may be migrated to `.test.tsx` when they touch migrated TSX components; test-only JS may remain only when it does not violate the incremental TS gate.

This avoids a high-risk all-at-once rewrite and preserves known edge cases such as organization switching, duplicate running sync handling, polling timers, secret masking, pagination, dry-run history modals, binding diagnostic drawers, and handoff evidence export.

### Decision 3: Use existing provider logo infrastructure

Render logos through existing provider logo helpers such as `Setting.getProviderLogoURL({category: "OAuth", type: "WeCom"})` and `Setting.getProviderLogoURL({category: "OAuth", type: "Lark"})`, or a tiny typed wrapper around them. The UI should use logo marks in the header at modest size, with accessible alt text and no large hero treatment.

This avoids external brand asset licensing risk and keeps the UI consistent with existing provider tables/sign-in visuals.

### Decision 4: Equalize base experience, not feature parity

The shared base experience includes target organization, credentials, enablement, soft-disable, schedule settings, connection test, manual sync, running-state polling, and formal sync run records. Feishu-only areas remain Feishu-only and should appear as compact auxiliary sections or modals, not as default large panels.

This keeps both pages recognizably related while avoiding YAGNI-driven expansion of WeCom.

## Risks / Trade-offs

- Large Feishu page migration could introduce regressions in polling, modals, drawers, or export helpers -> mitigate with small extracted TSX components, focused tests, and keeping behavior-compatible method names until final migration.
- Shared components can become too generic -> keep shared layer presentation-focused and pass explicit props; do not abstract backend APIs or sync business logic.
- Logos can add visual noise in an admin tool -> keep them small, aligned with the title, and avoid marketing-style hero/card layouts.
- Test migration may be noisy -> migrate tests only where implementation files become TSX, preserve existing assertions, and add targeted coverage for shared shell layout.
- Existing active OpenSpec changes touch enterprise IA/auth shell -> avoid navigation, auth center shell, OIDC, Provider configuration, and menu IA write sets in this change.

## Migration Plan

1. Start from latest `origin/hfl-test-base` on a dedicated branch.
2. Add shared organization sync TS/TSX types and presentation components with focused unit tests.
3. Migrate WeCom page first because it is smaller and published; preserve visible behavior and run existing tests.
4. Migrate Feishu page in conservative slices, keeping compact diagnostic behavior and existing API calls intact.
5. Run `node scripts/check-incremental-typescript-gate.mjs --base origin/hfl-test-base`, `yarn typecheck`, focused Jest tests for both pages/shared components, `yarn build`, and browser/Playwright verification for `/wecom-org-sync` and `/feishu-org-sync`.
6. If implementation risk grows beyond this scope, stop after shared TSX shell plus WeCom migration and record Feishu page remaining migration as a follow-up rather than forcing a risky rewrite.
