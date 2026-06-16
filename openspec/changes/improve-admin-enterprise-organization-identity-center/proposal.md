## Why

Admin 企业认证中心已经完成总览、认证源中心、应用接入中心和审计运维工作台，但“组织与身份”域仍主要是组织、用户、部门、角色和权限的分散列表。管理员需要在多个菜单之间切换，才能理解当前组织主数据、用户治理、权限配置和同步诊断的关系。

本 change 的目标是把组织与身份相关既有页面组织成企业身份域工作台，让管理员从组织主数据、用户/部门治理、权限入口、目录质量和同步诊断入口理解企业身份状态，同时保留既有路由、权限 key、表格、筛选、分页和操作行为。

## What Changes

- 新增共享组织身份工作台组件，复用现有 `EnterpriseIdentityConsoleLayout` 的企业认证中心视觉语言。
- 在组织、用户、角色和权限相关列表页上方接入工作台壳层，基于当前列表视图、分页 total、账号上下文和只读前端数据展示摘要、风险提示和下一步入口。
- 强化运行时侧栏 IA 和组织配置页导航树的一致性测试，确认组织身份、认证源同步和权限治理入口继续使用稳定叶子 key。
- 补充 zh/en 国际化文案，避免新增组织身份域 UI 出现中英文混用或硬编码后台标签。
- 保持后端接口、真实认证授权执行、组织同步执行、OAuth/OIDC 回调、Gateway projection publish/cleanup/receipt、密钥和生产/类生产配置不变。

## Capabilities

### New Capabilities

- `admin-enterprise-organization-identity-center`: 组织与身份域 SHALL 以企业身份治理工作台方式承载组织、用户、部门、权限和同步诊断入口。

### Modified Capabilities

- `admin-enterprise-identity-console-shell`: 运行时侧栏和组织配置导航树 SHALL 保持组织身份、认证源同步、权限治理入口的同一信息架构和稳定叶子 key。

## Impact

- 主要影响 `web-admin/src/OrganizationListPage.js`、`web-admin/src/UserListPage.js`、`web-admin/src/RoleListPage.js`、`web-admin/src/PermissionListPage.js`、`web-admin/src/enterpriseNavigation.js`、zh/en locale 和新增共享 TSX 组件/测试。
- 新增 TSX/TS 改动遵守渐进 TypeScript 规则，必须运行 `cd web-admin; yarn typecheck`。
- 验证包括 OpenSpec strict、`git diff --check`、聚焦 Jest/coverage、`yarn build` 和 local-dev 浏览器桌面/窄屏复验。
- 不触碰 `test` / `origin/test`，不 force-push 或自动合入 `hfl-test-base`。
