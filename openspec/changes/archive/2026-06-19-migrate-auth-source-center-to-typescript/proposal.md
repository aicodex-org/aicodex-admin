## Why

“身份源”菜单正在按渐进 TypeScript 路线逐步收敛。企业微信组织同步页已经迁移到 TSX，后续还计划迁移组织同步密钥、飞书同步主页面和同步器列表页；在继续迁移更大页面前，先从低风险的身份源中心 `AuthSourceCenter` 开始，可以建立同菜单页面的 TSX 迁移范式。

`AuthSourceCenter` 当前是 `/providers` 页面中的只读身份源摘要区块，文件体量较小、无后端写入、无真实认证触发，适合作为本阶段迁移入口。迁移目标是类型化现有组件和测试，保持路由、权限、Provider 表格、文案、接口和页面行为不变。

## What Changes

- 将 `web-admin/src/AuthSourceCenter.js` 迁移为 `AuthSourceCenter.tsx`，用明确 props、provider、状态卡片和风险摘要类型替代隐式 JavaScript shape。
- 将对应测试迁移为 `.test.tsx`，保留既有断言，覆盖已配置、未配置、loading、空态和 helper 输出。
- 保持 `ProviderListPage.js` 作为既有 JS 页面，只继续从同名模块导入 `AuthSourceCenter`，不迁移整个 Provider 管理页。
- 不改变 `/providers` 路由、Provider 增删改查权限、Provider 数据请求、同步诊断入口、OIDC/企业微信/飞书 provider 配置契约或任何后端 API。
- 运行增量 TypeScript 门禁、`yarn typecheck`、聚焦 Jest 和必要构建，证明 JS/TSX 共存路径仍可用。

## Capabilities

### Modified Capabilities

- `web-admin-incremental-typescript`: 身份源菜单页面迁移 SHALL 通过低风险入口逐步推进，触碰 React 组件时优先迁移为 TSX，并保持历史 JS 页面共存。
- `admin-enterprise-identity-auth-source-center`: 认证源中心工作区 SHALL 在 TSX 迁移后保持现有只读摘要、诊断入口和 Provider 列表操作行为兼容。

## Impact

- 影响前端文件：
  - `web-admin/src/AuthSourceCenter.js` -> `web-admin/src/AuthSourceCenter.tsx`
  - `web-admin/src/AuthSourceCenter.test.js` -> `web-admin/src/AuthSourceCenter.test.tsx`
  - 如有必要，最小调整导入路径或测试类型声明。
- 不影响：
  - `web-admin/src/ProviderListPage.js` 的 Provider 表格行为和路由。
  - `web-admin/src/ProviderEditPage.js`、`auth/`、`provider/`、OIDC/OAuth 登录、组织同步后端、Gateway/Insight。
  - 数据库、后端 API、真实 provider secret、生产或类生产配置。
