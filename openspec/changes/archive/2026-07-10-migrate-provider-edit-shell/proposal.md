## Why

Provider 编辑页仍保留旧 Card title 按钮和页面底部重复操作区，正文也以页面私有 `Row/Col` 间距承载主要字段。组织、用户、群组、角色、权限和应用编辑页已经收敛到共享大型编辑页壳，Provider 作为认证源配置页需要跟进，避免后续改造继续复制旧布局。

## What Changes

- 将 `/providers/:organizationName/:providerName` 的 Provider 编辑页接入共享大型编辑页壳，统一头部返回、面包屑、标题、滚动正文和底部动作栏。
- 去掉 Provider 编辑页旧 Card title 内保存按钮和额外页面底部重复按钮，只保留共享壳底部动作栏。
- 将 Provider 基础字段用共享区块和字段行呈现，动态 Provider 专属字段继续复用既有渲染 helper 与保存语义。
- 增加聚焦前端测试，验证共享壳、底部动作和关键 Provider 字段仍可渲染。
- 不改变 Provider API、保存 payload、删除语义、OAuth/SAML/WeCom/Lark 字段校验、认证回调或真实 provider 探测行为。

## Capabilities

### New Capabilities

- 无。

### Modified Capabilities

- `admin-enterprise-identity-auth-source-center`: Provider 编辑页应复用共享大型编辑页壳，并保持既有认证源配置行为兼容。

## Impact

- 影响前端代码：`web-admin/src/ProviderEditPage.tsx`、相关前端测试、必要的 Provider 编辑页样式入口。
- 影响 OpenSpec 文档：`admin-enterprise-identity-auth-source-center` delta spec。
- 不涉及后端 API、数据库、权限模型、Provider contract、OAuth/OIDC/SAML 回调或运行态认证流程。
