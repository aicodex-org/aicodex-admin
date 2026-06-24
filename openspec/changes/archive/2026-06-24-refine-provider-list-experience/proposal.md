## Why

`/providers` 当前仍带有认证源概览区，和已经收敛后的“群组”“应用”“接入中心”等列表页相比，列表首屏信息密度和扫描效率不一致。管理员在这个页面的主要任务是按认证源属性查找、核对并操作 Provider，因此需要把页面重新收敛为列表页，并完成被触碰页面的渐进 TypeScript 迁移。

## What Changes

- 移除 `/providers` 列表上方的认证源概览区，使页面首屏直接聚焦查询工具栏和 Provider 表格。
- 在现有基础搜索之外增加可展开的扩展搜索，覆盖认证源类别、类型、归属组织、客户端 ID、Provider URL 等当前列表可承载的字段。
- 保持 Provider 列表既有分页、排序、新增、编辑、删除、权限 key、路由和后端 API 参数语义兼容。
- 将 `ProviderListPage` 和对应 React 测试从 legacy JavaScript 渐进迁移为 TSX / `.test.tsx`，并使用局部类型描述 props、state、Provider 记录、搜索状态和表格列。
- 不改动 OAuth/OIDC 回调、真实认证链路、Provider backend contract、Gateway 投影、真实密钥或生产/类生产配置。

## Capabilities

### New Capabilities

无。

### Modified Capabilities

- `admin-enterprise-identity-auth-source-center`: 调整 `/providers` 的页面验收，从“认证源中心概览 + 列表”收敛为 Provider 列表页，并要求扩展搜索和列表扫描体验。
- `web-admin-incremental-typescript`: 增加 Provider 列表页被触碰时应迁移为 TSX 的约束和验证要求。

## Impact

- 前端页面：`web-admin/src/ProviderListPage.js` 迁移为 `web-admin/src/ProviderListPage.tsx`。
- 前端测试：`web-admin/src/ProviderListPage.test.js` 迁移为 `web-admin/src/ProviderListPage.test.tsx`，并补充扩展搜索和顶部概览移除的行为测试。
- 共享组件：继续复用 `ListPageTable`、`EnterpriseListQueryToolbar`、`ListPageIdentityCell`、`ListPageRowActions` 等公共列表组件；如需调整，仅限为 Provider 列表传参服务的低风险局部用法。
- 验证：运行 OpenSpec strict 校验、增量 TypeScript gate、Provider 聚焦 Jest、`yarn typecheck`、`git diff --check`、`yarn build`，并对 `/providers` 做浏览器视觉核对。
