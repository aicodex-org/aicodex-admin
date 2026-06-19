## Why

“组织账号”菜单仍有多处 legacy JavaScript 页面。父 session 正在按增量 TypeScript 路线迁移“身份源”菜单，本并行 change 从“组织账号”菜单下低风险入口开始，避免一次性迁移组织、群组、用户和编辑页带来的大 diff。

`InvitationListPage` 是 `/invitations` 下的邀请码列表入口，负责列表展示、新建、删除、分页筛选排序和未授权状态。它比用户、组织编辑和组织目录质量页面更小，且不触发真实认证、OAuth/OIDC、Provider、Gateway 或组织同步链路，适合作为“组织账号”路线的第一个 TSX 迁移 change。

## What Changes

- 将 `web-admin/src/InvitationListPage.js` 迁移为 `InvitationListPage.tsx`，为 props、state、邀请码记录、fetch 参数和表格列补齐局部类型。
- 将 `web-admin/src/backend/InvitationBackend.js` 迁移为 `InvitationBackend.ts`，导出邀请码记录、响应和发送目标类型，保持所有 endpoint、参数顺序和 HTTP 方法不变。
- 新增 `InvitationListPage.test.tsx` 和 `InvitationBackend.test.ts`，覆盖列表渲染、新建默认邀请码、组织筛选、删除、未授权、错误分支和 backend endpoint 契约。
- 更新 `web-admin-incremental-typescript` 主规格，记录“组织账号”菜单下邀请码列表页迁移规则。

## Non-Goals

- 不迁移 `InvitationEditPage.js`、组织列表、群组列表、用户列表、组织树运营或组织目录质量页面。
- 不改变 `/invitations`、`/invitations/:organizationName/:invitationName` 路由、权限、表格列、分页筛选排序、按钮文案或后端 API 契约。
- 不新增邀请码业务能力，不调整邀请码发送、验证、配额或后端实现。
- 不触碰真实认证、OAuth/OIDC、Provider contract、Gateway projection、真实密钥或生产/类生产配置。

## Impact

- Affected specs: `web-admin-incremental-typescript`
- Affected code:
  - `web-admin/src/InvitationListPage.js` -> `web-admin/src/InvitationListPage.tsx`
  - `web-admin/src/backend/InvitationBackend.js` -> `web-admin/src/backend/InvitationBackend.ts`
  - 新增 `web-admin/src/InvitationListPage.test.tsx`
  - 新增 `web-admin/src/backend/InvitationBackend.test.ts`
