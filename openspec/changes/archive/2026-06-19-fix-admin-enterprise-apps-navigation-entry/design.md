## Context

`web-admin/src/ManagementPage.js` 当前同时保留两个应用相关路由：

- `/apps` 渲染 `basic/AppListPage`，是旧应用门户/卡片入口。
- `/applications` 渲染 `ApplicationListPage`，并承载企业认证中心应用接入中心。

`web-admin/src/enterpriseNavigation.js` 把 `/apps` 放在“中心总览”分组，并使用 `general:Apps`。中文 locale 中该 key 为“应用列表”，导致管理员误以为它是应用管理列表。

## Decision

- 在 `buildEnterpriseNavigationGroupDefinitions` 中继续保留 `/apps` 定义，但仅对非 local admin 可见，并将文案改为 `Application Portal`。
- 对 local admin 运行时导航和组织导航配置树过滤 `visible: false` 叶子，使 `/apps` 不再作为企业认证中心主 IA 的可选入口出现。
- `/applications` 继续位于“应用接入”分组，稳定 route key 不变，作为管理员应用接入/应用管理主入口。

## Compatibility

- 不修改 `ManagementPage.js` 的 `/apps` 路由，直接访问 `/apps` 仍由 `AppListPage` 处理。
- 不修改 `IdentityConsoleOverview` 的非 local admin `/apps` fallback，非 local admin 仍可进入旧应用门户。
- 对已配置 `userNavItems: ["all"]` 的非 local admin，运行时仍可看到 `/apps`，但文案为“应用门户 / Application Portal”。

## Validation

- 先补导航回归测试并确认失败，再实施最小修复。
- 运行 OpenSpec strict 校验、导航聚焦 Jest、增量 TypeScript 门禁、typecheck、build 和 diff 检查。
- 浏览器验证在本地环境可用时覆盖 local admin 侧栏；若环境不可用，在 `verification.md` 中记录原因与替代证据。
