## Why

组织编辑页的密码配置区域包含 `密码Salt值`、`密码复杂度选项`、`密码类型` 等较长中文标签。当前桌面布局下左侧 label column 会被裁切或与侧栏边界视觉重叠，影响管理员理解和编辑密码策略。

## What Changes

- 定位组织编辑页 AntD Form 的 label 布局、容器宽度和相关 scoped style。
- 将修复限定在组织编辑页或组织编辑页 scoped class 内，保证长标签完整可见。
- 保持组织读取、保存、密码配置字段、选项语义和后端 API 契约不变。
- 增加最小测试或样式契约验证，防止修复泄漏为全局 Form label 改动。
- 使用浏览器 smoke/screenshot 验证桌面视口下密码字段 label 不裁切、不重叠且页面无横向 overflow。

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `admin-enterprise-organization-identity-center`: 补充组织编辑页长表单标签在桌面布局下必须完整可读、不得被容器裁切的 UI 契约。

## Impact

- Affected code: `web-admin/src/OrganizationEditPage.tsx` and, if necessary, organization edit page scoped styles in `web-admin/src/App.less`.
- Affected validation: OpenSpec strict validate, focused organization edit/page tests, `yarn typecheck`, incremental TypeScript gate, `yarn build`, and browser screenshot smoke.
- No backend API, organization save semantics, password configuration semantics, auth flow, provider flow, common component rewrite, or `test` branch behavior change.
