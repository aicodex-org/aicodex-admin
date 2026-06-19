## Why

“组织账号”菜单的列表页、群组树和组织编辑页已经按增量 TypeScript 路线完成多棒 RC，下一步需要覆盖用户编辑页这类核心维护入口。`UserEditPage.js` 体量较大且同时服务 `/users/:organizationName/:userName` 与账户页嵌入场景，迁移为 TSX 可以让用户资料、保存/删除、MFA、第三方身份绑定和账户页复用边界更可维护，同时保持现有运行时行为不变。

## What Changes

- 将 `web-admin/src/UserEditPage.js` 保守迁移为 `UserEditPage.tsx`。
- 为页面 props、state、用户记录、组织/应用/群组记录、交易记录、MFA/consent 数据和通用 backend 响应补充局部 TypeScript 类型。
- 补充 `UserEditPage.test.tsx`，覆盖加载、404 跳转、保存/保存退出、失败回滚、删除、returnUrl/userListUrl 跳转、分组可见性和关键资料字段更新等可观察行为。
- 保留 `withRouter(UserEditPage)` 默认导出、现有路由、账户页嵌入方式、权限判断、后端 API 调用、文案和页面交互。
- 不迁移 `UserBackend.js`、`GroupBackend.js`、`ApplicationBackend.js`、`OrganizationBackend.js`、MFA backend、子表格、OAuth/SAML widget、modal 或其它用户/组织账号页面。

## Capabilities

### New Capabilities

- 无。

### Modified Capabilities

- `web-admin-incremental-typescript`: 增加用户编辑页按保守 TSX 方式迁移的验收场景。

## Impact

- 影响前端文件：`web-admin/src/UserEditPage.js`、新增或更新其聚焦测试。
- 影响 OpenSpec：`web-admin-incremental-typescript` delta。
- 不改变后端接口、数据库、权限、认证、OAuth/OIDC、Provider、Gateway projection、真实环境配置或账户安全流程。
