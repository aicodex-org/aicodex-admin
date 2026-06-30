## Why

`ApplicationEditPage.js` 是 Admin 应用接入流程中剩余体量最大的 legacy JavaScript 页面之一。它承载应用身份、OAuth/OIDC、SAML、UI 自定义、安全和反向代理等配置，继续保留 JS 会增加后续维护应用配置链路的 JS/TS 混合成本。

本 change 将该页面保守迁移为 TSX，同时保持既有路由、后端 payload、预览行为和 Provider 绑定语义不变。

## What Changes

- 将 `web-admin/src/ApplicationEditPage.js` 重命名为 `ApplicationEditPage.tsx`。
- 为页面 props、state、应用记录、组织、Provider、证书、群组和 legacy 动态值补充页面局部 TypeScript 类型。
- 保持 `ManagementPage.js` 通过无后缀路径导入的兼容性。
- 保持既有应用保存、保存并退出、取消/删除、预览、主题、登录/注册面板、SAML metadata、Provider 绑定和上传行为。
- 不迁移 auth 页面、Provider 编辑页、共享表格组件、backend wrappers、`ManagementPage.js`、`BaseListPage.js`、`Setting.js` 或其它无关应用接入页面。

## Capabilities

### New Capabilities

无。

### Modified Capabilities

- `web-admin-incremental-typescript`: 在渐进 TypeScript 迁移路线下增加 Application 编辑页 TSX 迁移场景。

## Impact

- 前端：`web-admin/src/ApplicationEditPage.js` 迁移为 `ApplicationEditPage.tsx`。
- 测试：运行可能受无后缀 import 解析影响的 Application 相关聚焦测试。
- OpenSpec：新增 `web-admin-incremental-typescript` spec delta 和迁移任务。
- 不改变后端 API、数据库、授权、认证、OAuth/OIDC callback、Provider contract、Gateway projection、secret 处理或生产配置行为。
