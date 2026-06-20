## Why

“管理工具”一级菜单下仍有多个管理员常用页面停留在历史 `.js`，与 Admin 前端渐进 TypeScript 路线不一致。系统信息、表单和工单页面相对独立，适合作为下一批保守迁移目标，减少后续维护继续堆在旧 JS 页面上的风险。

## What Changes

- 将“管理工具”一级菜单下仍为 `.js` 的 React 页面迁移为 `.tsx`：
  - `/sysinfo` 的 `SystemInfo`
  - `/forms` 的 `FormListPage`
  - `/forms/:formName` 的 `FormEditPage`
  - `/tickets` 的 `TicketListPage`
  - `/tickets/:organizationName/:ticketName` 的 `TicketEditPage`
- 为本次触碰且包含 JSX 的页面新增或迁移 `.test.tsx` 聚焦测试，覆盖页面渲染、关键列表列、编辑表单、工单状态和消息发送入口。
- 保持现有 `ManagementPage` 路由、`enterpriseNavigation` 菜单、权限可见性、后端 API 调用、文案、动态表单字段逻辑和运行边界不变。
- `/swagger` 仍作为 API 文档外链保留，不强行创建 React 页面，也不改变外链 URL 计算逻辑。
- 不迁移 `FormBackend`、`TicketBackend`、`SystemInfo` backend client、`BaseListPage`、`FormItemTable`、`Setting` 或其它动态表单使用方；如 TypeScript 编译必须触碰公共组件，先评估并回传。
- 不修改认证/OIDC/Gateway、真实密钥、生产配置或类生产配置，不触碰 `test` 分支。

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `web-admin-incremental-typescript`: 增加“管理工具”菜单页面的渐进 TypeScript 迁移要求、API 文档外链边界和验证要求。

## Impact

- Affected frontend pages:
  - `web-admin/src/SystemInfo.js`
  - `web-admin/src/FormListPage.js`
  - `web-admin/src/FormEditPage.js`
  - `web-admin/src/TicketListPage.js`
  - `web-admin/src/TicketEditPage.js`
- Affected tests:
  - 新增或迁移管理工具页面相关 `.test.tsx`
- Validation:
  - OpenSpec target/changes/specs strict validation
  - `git diff --check`
  - `web-admin` incremental TypeScript gate
  - `yarn typecheck`
  - focused Jest coverage for migrated pages
  - `yarn build`
