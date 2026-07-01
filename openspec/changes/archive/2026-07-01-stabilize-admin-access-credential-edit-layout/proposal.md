## Why

应用接入、凭据和集成配置类编辑页仍有多处内部表单继续依赖 `Col span={2}` / `span={22}` 百分比 label/content 布局。继组织、用户、应用、Provider、Syncer 与 Gateway 编辑页收敛后，这些相邻页面需要同样的 scoped 布局边界，避免桌面 label 列宽不稳定、长字段挤压内容区或窄屏产生页面级横向溢出。

## What Changes

- 为应用接入、凭据和集成配置相关编辑页增加独立 scoped layout class，例如页面、Card 和字段行边界。
- 在 `App.less` 中新增仅命中本 change 页面 class 的布局规则，使桌面 label 列使用稳定宽度、内容列占用剩余空间，窄屏切换为单列换行。
- 增加源码/样式契约测试，覆盖页面 class hook、字段行 class hook 和 scoped CSS 选择器，避免影响已完成的 large/gateway 编辑页。
- 补充本地浏览器 smoke，验证 1280px 桌面布局契约；如可行，补充窄屏布局观察。
- `LdapSyncPage` 是 LDAP 用户同步表格页，不属于本次编辑表单 label/content 布局修复范围。
- 不修改 API、保存 payload、路由、权限、字段语义、认证、LDAP、Token 或 Webhook 业务行为。

## Capabilities

### New Capabilities

- 无。

### Modified Capabilities

- `admin-enterprise-identity-console-shell`: 扩展身份控制台编辑页内部表单布局稳定要求到应用接入、凭据和集成配置相关编辑页。

## Impact

- 影响代码预计限制在 `web-admin/src/*EditPage.tsx`、`web-admin/src/App.less` 和聚焦测试；不修改 `LdapSyncPage.tsx`。
- 不新增生产依赖，不改后端接口、鉴权、数据模型、路由配置或 i18n 文案。
- OpenSpec archive 后同步到 `openspec/specs/admin-enterprise-identity-console-shell/spec.md`。
