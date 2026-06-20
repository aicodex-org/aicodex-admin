## Why

LLM AI/Gateway 菜单已经完成 AI Agent 入口和入口配置页面的保守 TSX 迁移，下一步应迁移同一菜单下低风险的 MCP Store 目录页，继续减少 legacy JS 页面数量。`/server-store` 只负责展示线上 MCP Server 目录并创建本地 Server 草稿，本 change 只做 TypeScript 后缀和局部类型收口，避免改变管理员现有操作流。

## What Changes

- 将 `web-admin/src/ServerStorePage.js` 迁移为 `ServerStorePage.tsx`，保留线上 MCP Server 目录加载、响应兼容、名称筛选、标签筛选、清空筛选、刷新和空态/加载态行为。
- 保留从线上目录创建本地 MCP Server 的现有行为，包括默认名称归一化、production endpoint 校验、`addServer` payload shape、成功跳转 `/servers/:owner/:name` 和错误提示。
- 新增 `ServerStorePage.test.tsx` 聚焦测试，覆盖目录渲染、筛选、响应格式兼容、创建 Server、缺少 production endpoint、加载失败和 TSX 迁移后缀。
- 保持 `ManagementPage.js` 现有 `/server-store` 路由和 import 语义，仅依赖扩展名解析，不做路由重构。
- 不迁移 MCP Server 列表/编辑页 `ServerListPage.js`、`ServerEditPage.js`、`ServerBackend.js`、MCP Server 后端接口、MCP Store API、入口配置、站点范围、治理规则或规则表格组件。
- 不新增 API、不修改后端接口、不改变 Server 保存/删除语义、不触发 Gateway projection publish、不引入新 UI 库或视觉重设计。

## Capabilities

### New Capabilities

- 无。

### Modified Capabilities

- `admin-enterprise-identity-llm-ai-gateway-center`: 明确 MCP Store 页面迁移为 TSX 时必须保持 `/server-store` 目录浏览、筛选和创建本地 Server 行为兼容，并且不扩大到 MCP Server 列表/编辑、站点或规则页面。
- `web-admin-incremental-typescript`: 补充 LLM AI/Gateway MCP Store 页面作为后续渐进 TS 迁移场景，约束测试、typecheck、coverage 和 build 验证。

## Impact

- 影响前端文件：`web-admin/src/ServerStorePage.tsx` 及对应 `.test.tsx`。
- 影响 OpenSpec 文档：本 change delta specs，归档后同步到 `admin-enterprise-identity-llm-ai-gateway-center` 与 `web-admin-incremental-typescript` 主规格。
- 不影响后端 API、数据库、权限、认证、OAuth/OIDC、Provider、Gateway projection、真实密钥或生产/类生产配置。
