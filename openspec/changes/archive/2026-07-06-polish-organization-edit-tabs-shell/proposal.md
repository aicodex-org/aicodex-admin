## Why

组织编辑页承载组织主数据、品牌资产、登录安全、导航菜单、账号资料、多因素认证、目录服务和交易记录。当前页面仍是旧式长表单，保存按钮会随页面内容滚走，缺少稳定返回/取消入口，子表格和只读记录也被挤在同一表单流里，管理员在长页面中定位和保存配置的成本较高。

用户已经确认以 7000 项目策略编辑页为参考，将组织编辑页先改造成 Tabs + 固定路径/动作栏的样板页，后续再作为其它编辑页模板。

## What Changes

- 将组织编辑页从单个长表单改为页内 Tabs：基础、品牌、登录安全、导航菜单、账号资料、多因素认证、目录服务、交易记录。
- 在组织编辑页顶部提供固定返回与页面内路径，正文使用紧凑白底工作区和下划线 Tabs。
- 在组织编辑页底部提供固定操作栏，按钮顺序为 `取消`、`保存`、`保存并返回`。
- 为 `名称`、`显示名称` 增加红色必填标识和保存前前端校验；校验失败时切回基础 tab 并阻止提交。
- 保留现有字段 tooltip/tip、保存 payload、主题刷新、组织变更事件、交易记录只读语义和新增模式取消清理语义。
- 不新增后端 API，不改变组织字段、保存契约、LDAP/MFA/交易记录接口或全局 shell breadcrumb。

## Capabilities

### New Capabilities

无。

### Modified Capabilities

- `admin-enterprise-identity-console-shell`: 调整组织编辑页单编辑壳契约，允许组织编辑页主要保存动作位于同一编辑壳的固定底部操作栏，而不是 Card 标题内。
- `admin-enterprise-organization-identity-center`: 增加组织编辑页 Tabs 信息架构、固定返回路径、固定底部动作、必填校验和 tip 保留要求。

## Impact

- Affected code: `web-admin/src/OrganizationEditPage.tsx`, `web-admin/src/App.less`, `web-admin/src/OrganizationEditPage.test.tsx`, `web-admin/src/table/AccountTable.tsx`, `web-admin/src/table/LdapTable.tsx`, `web-admin/src/table/MfaTable.tsx`, `web-admin/src/common/resizeObserverLoopErrorPreflight.ts`, `web-admin/src/common/resizeObserverLoopErrorGuard.ts`, related focused tests, `web-admin/src/locales/en/data.json`, `web-admin/src/locales/zh/data.json`.
- Affected docs: `DESIGN.md`, `docs/design/admin-identity-console/large-edit-page-migration-guide.md` and this OpenSpec change.
- Affected validation: OpenSpec strict validate, incremental TypeScript gate, `yarn typecheck`, focused organization edit tests, large edit layout tests, and local frontend browser smoke where environment permits.
