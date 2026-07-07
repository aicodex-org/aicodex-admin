## Why

用户编辑页承载账号资料、联系方式、组织/群组、认证状态、授权、MFA、第三方登录和交易记录等大量字段，但当前仍是旧式 Card 标题按钮 + 内部 Menu/Tabs + 页面底部重复保存按钮的长表单。管理员在长页面中切换分组、返回或保存时容易失去上下文；组织编辑页已经沉淀出固定业务多 tabs 编辑模式，群组编辑页代表单正文编辑模式。两者的头部、滚动正文和底部动作栏应使用同一套大型编辑壳，差异只体现在正文是否提供 tabs。

## What Changes

- 抽出共享 `LargeEditShell`，统一组织、用户、群组编辑页的顶部返回路径、对象标题、未保存状态、滚动正文和底部固定操作栏。
- 将用户编辑页改为参考组织编辑页的固定业务多 tabs：基础、身份认证、权限管理、安全、第三方登录、记录；继续使用 URL hash 恢复当前 tab。
- 组织 `accountItems` 仍控制用户字段可见性、权限和字段配置；`accountItems.tab` 不再决定用户页顶层 tabs。
- 移除 Card 标题内保存按钮和页面底部重复保存按钮，统一为底部 `取消`、`保存`、`保存并返回`。
- 增加用户页 dirty 状态、提交中状态和返回/取消未保存确认；新增模式取消仍沿用删除临时用户语义。
- 保留现有用户字段渲染、表格回调、目录同步只读约束、MFA/第三方登录/交易记录展示和 `UserBackend.updateUser` 保存契约。
- 补充 zh/en locale、共享壳组件和聚焦 Jest，覆盖固定业务 tabs、hash、固定操作栏、dirty 确认、提交中防重复和旧字段回调不丢失。
- 不新增后端 API，不改变用户保存 payload、权限、认证、目录同步、MFA 后端或用户列表行为。

## Capabilities

### New Capabilities

无。

### Modified Capabilities

- `admin-enterprise-identity-console-shell`: 更新大型编辑页共享壳要求，使组织、用户、群组共用同一套头部、滚动正文和固定底部动作栏。
- `admin-enterprise-organization-identity-center`: 增加用户编辑页固定业务 Tabs、固定操作栏、dirty 确认和保存语义兼容要求。

## Impact

- Affected code: `web-admin/src/common/LargeEditShell.tsx`, `web-admin/src/UserEditPage.tsx`, `web-admin/src/UserEditPage.test.tsx`, `web-admin/src/OrganizationEditPage.tsx`, `web-admin/src/GroupEditPage.tsx`, `web-admin/src/App.less`, `web-admin/src/locales/en/data.json`, `web-admin/src/locales/zh/data.json`.
- Affected docs/specs: `openspec/changes/polish-user-edit-tabs-shell/**`, `openspec/specs/admin-enterprise-identity-console-shell/spec.md` delta, `openspec/specs/admin-enterprise-organization-identity-center/spec.md` delta.
- Affected validation: OpenSpec strict validate, `git diff --check`, incremental TypeScript gate, `yarn typecheck`, focused `UserEditPage.test.tsx`; UI smoke if local frontend preview is available.
