## Why

“组织账号”菜单下的邀请码列表页和 `InvitationBackend` 已经迁移到 TypeScript，但邀请码编辑页仍是 legacy JavaScript。该页面承载 `/invitations/:organizationName/:invitationName` 的加载、保存、保存并退出、取消新增、删除、复制注册链接和发送邀请邮件行为，继续保留 JS 会让后续邀请码编辑流程缺少类型保护。

## What Changes

- 将 `web-admin/src/InvitationEditPage.js` 保守迁移为 `InvitationEditPage.tsx`。
- 新增 `InvitationEditPage.test.tsx`，覆盖加载、404、组织切换、字段更新、复制注册链接、发送邀请、保存成功/失败、保存并退出、取消新增、删除失败和网络错误。
- 在页面内补齐 props、route params、state、邀请码记录、组织记录、应用记录、群组记录和发送邮件状态的局部类型。
- 保持 `/invitations/:organizationName/:invitationName` 路由、权限判断、文案、AntD 表单控件、后端 API 调用、复制链接、发送邮件和页面行为不变。
- 不迁移 `InvitationBackend.ts`、`InvitationListPage.tsx`、`SignupPage.js`、`ManagementPage.js` 或其它组织账号/身份源页面。

## Capabilities

### New Capabilities

- 无。

### Modified Capabilities

- `web-admin-incremental-typescript`：补充“组织账号”菜单下邀请码编辑页的保守 TSX 迁移要求和验证场景。

## Impact

- Affected code:
  - `web-admin/src/InvitationEditPage.js` -> `InvitationEditPage.tsx`
  - 新增 `web-admin/src/InvitationEditPage.test.tsx`
- OpenSpec：新增本 change delta，并在 archive 后同步 `web-admin-incremental-typescript` 主规格。
- 不涉及后端 Go、数据库、真实组织数据、认证/OAuth/OIDC、Provider、Gateway、Insight、生产配置或 `test` 分支。
