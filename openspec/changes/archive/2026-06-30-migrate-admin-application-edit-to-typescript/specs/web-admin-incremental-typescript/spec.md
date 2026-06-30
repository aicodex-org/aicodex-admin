## ADDED Requirements

### Requirement: Application 编辑页 TSX 迁移
`web-admin` SHALL 支持将 `ApplicationEditPage` 从 JavaScript 迁移为 TSX，同时保持既有应用编辑行为、路由导出、后端 API 契约、Provider 绑定语义和管理员可见工作流不变。

#### Scenario: Application 编辑页保守迁移
- **WHEN** `ApplicationEditPage` 被迁移为 `.tsx`
- **THEN** 迁移 SHALL 保持 `/applications/:organizationName/:applicationName` 加载、保存、保存并退出、取消、删除、terms 上传、SAML metadata、signup/signin/prompt 预览、主题编辑、Provider 绑定和身份源绑定行为不变
- **AND** `ManagementPage.js` SHALL 继续通过既有无后缀路径导入 `./ApplicationEditPage`
- **AND** 迁移 SHALL NOT 要求重写 auth 页面、Provider 编辑页、共享表格组件、backend wrappers、`ManagementPage.js`、`BaseListPage.js`、`Setting.js` 或无关应用接入页面
- **AND** 迁移 SHALL NOT 改变后端 API path、请求 payload shape、可见文案、认证/OAuth/OIDC callback 行为、Provider contracts、Gateway projection、secret 处理或生产配置

#### Scenario: Application 编辑页迁移验证
- **WHEN** Application 编辑页 TSX 迁移准备进入 review
- **THEN** 目标 OpenSpec strict validation、`git diff --check`、增量 TypeScript gate、`yarn typecheck`、Application 聚焦 Jest 和 `yarn build` SHALL 对触碰的 TSX 与 JS 共存路径通过
- **AND** 任何 deferred 动态类型片段 SHALL 记录原因和剩余风险
