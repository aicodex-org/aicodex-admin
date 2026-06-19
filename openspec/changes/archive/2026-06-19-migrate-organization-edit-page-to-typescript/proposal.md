## Why

“组织账号”菜单已经按增量 TypeScript 路线迁移了多个低风险列表页，下一步需要开始覆盖组织编辑页这类核心但仍可保守迁移的历史 React 页面。`OrganizationEditPage.js` 目前承载组织详情、主题、LDAP、MFA、导航配置和交易记录等编辑入口，迁移为 TSX 可以让后续维护有更明确的 props/state/API 响应类型，同时保持现有页面行为不变。

## What Changes

- 将 `web-admin/src/OrganizationEditPage.js` 保守迁移为 `OrganizationEditPage.tsx`。
- 为页面 props、state、组织记录、应用记录、LDAP 记录和交易记录补充局部 TypeScript 类型。
- 补充 `OrganizationEditPage.test.tsx`，覆盖页面加载、保存、失败提示、重定向、删除/取消和交易记录展示等关键可观察行为。
- 保留现有路由、权限、后端 API 调用、表单文案、组织名称锁定规则、主题更新回调和 `storageOrganizationsChanged` 事件行为。
- 不迁移 `OrganizationBackend.js`、`ApplicationBackend.js`、`LdapBackend.js`、`TransactionBackend.js` 或其它组织账号页面。

## Capabilities

### New Capabilities

- 无。

### Modified Capabilities

- `web-admin-incremental-typescript`: 增加组织编辑页按保守 TSX 方式迁移的验收场景。

## Impact

- 影响前端文件：`web-admin/src/OrganizationEditPage.js`、新增或更新其聚焦测试。
- 影响 OpenSpec：`web-admin-incremental-typescript` delta。
- 不改变后端接口、数据库、权限、认证、OAuth/OIDC、Provider、Gateway projection、生产/类生产配置或真实同步链路。
