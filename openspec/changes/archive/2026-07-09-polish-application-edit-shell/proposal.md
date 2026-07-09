## Why

应用编辑页是应用接入中心的核心配置入口，字段量和 tab 数量都接近组织、用户这类多 tab 大编辑页，但当前仍保留旧式 `Card title` 保存按钮、内嵌 `Layout/Header/Content` 和 card 类型 Tabs。管理员在长 tab 内滚动时保存入口不稳定，页面头部/底部也没有与已定稿的组织、用户编辑页共用同一套壳。

组织、用户、群组、角色编辑页已经沉淀出统一编辑壳和正文密度规则，应用编辑页应作为下一批多 tab 页面迁移，避免后续继续在旧结构上叠加局部样式补丁。

## What Changes

- 将应用编辑页迁移到统一大型编辑页壳：顶部返回路径、对象标题、未保存状态、页内 Tabs、滚动正文和底部固定操作栏。
- 移除旧 `Card title` 内保存按钮和正文内重复保存入口，统一按钮顺序为 `取消`、`保存`、`保存并返回`。
- 保留应用编辑页现有多 tab 信息架构：基础、身份验证、OIDC/OAuth、SAML、提供商、界面定制、安全设置、Reverse Proxy，并继续通过 hash 恢复当前 tab。
- 按大型编辑页迁移指南整理 tab 正文：区块标题、表单网格、全宽表格模块、表格右上操作、空态、行内小操作按钮、Tooltip 和 `aria-label`。
- 为应用 `名称`、`显示名称` 等关键必填字段增加保存前前端校验；校验失败时定位到对应 tab 并阻止提交。
- 保护 Provider 绑定、OIDC/OAuth、SAML、界面定制预览和 Reverse Proxy 等 tab 的全宽内容不被主字段 label/content 布局压窄。
- 保留现有应用保存 payload、Provider 绑定、上传、预览、SAML metadata、证书选择、删除新增临时应用、路由跳转、权限和后端 API 契约。
- 不新增后端 API，不改变认证、授权、OAuth/OIDC、SAML、Reverse Proxy、Provider 登录查找或敏感凭据处理行为。

## Capabilities

### New Capabilities

无。

### Modified Capabilities

- `admin-enterprise-identity-console-shell`: 将应用编辑页纳入组织、用户同类多 tab 大编辑页壳契约，明确头部、tabs、滚动正文、底部动作栏、无重复 Card 和无页面级横向溢出要求。
- `admin-enterprise-identity-application-access-center`: 明确应用编辑页各 tab 正文应保持应用接入配置语义、表格模块一致性和只改 UI 不改后端契约的安全边界。

## Impact

- Affected code: `web-admin/src/ApplicationEditPage.tsx`, `web-admin/src/ApplicationEditPage*.test.tsx`, `web-admin/src/LargeEditFormLayout.test.ts`, `web-admin/src/styles/large-edit-pages.less`, `web-admin/src/App.less`, application edit embedded table tests where needed, and related locale files if new visible copy is introduced.
- Affected docs/specs: this OpenSpec change, `docs/design/admin-identity-console/large-edit-page-migration-guide.md` if migration guidance gains application-specific lessons, and related main specs after archive.
- Affected validation: OpenSpec strict validate, `git diff --check`, focused Application edit Jest tests, affected frontend coverage check, large edit layout tests, incremental TypeScript gate, `yarn typecheck`, `yarn build`, and local dev browser smoke against 60 backend or mock preview for all application edit tabs.
