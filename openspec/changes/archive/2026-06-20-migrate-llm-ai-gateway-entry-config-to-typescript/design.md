## Context

LLM AI/Gateway 菜单下 `/entries` 是入口配置管理页，当前由 `EntryListPage.js` 与 `EntryEditPage.js` 提供列表和编辑能力，并由 `ManagementPage.js` 通过无扩展名 import 接入。上一阶段已完成 AI Agent 入口页面 TSX 迁移，本 change 延续同一增量 TypeScript 路线，优先迁移低风险的入口配置后台页面。

现有 `EntryPage.js` 是登录、注册、OAuth、SAML、CAS、支付和验证码等认证入口容器，不属于 LLM AI/Gateway 后台菜单“入口配置”页面。本 change 不触碰该文件，避免把认证入口链路混入网关菜单迁移。

## Goals / Non-Goals

**Goals:**

- 将 `EntryListPage` 与 `EntryEditPage` 保守迁移为 TSX，补充局部 props、state、Entry 记录、列表查询参数、表格列和编辑表单类型。
- 保持 `/entries` 和 `/entries/:organizationName/:entryName` 现有路由、权限、接口、文案和页面行为不变。
- 补充 `.test.tsx` 聚焦测试，覆盖列表页渲染、新增/删除行为、编辑页加载和保存关键路径。
- 继续复用 legacy JS 后端 wrapper 和 `BaseListPage`，通过局部兼容类型约束 TSX 页面需要的继承面。

**Non-Goals:**

- 不迁移 `EntryPage.js` 登录入口容器。
- 不迁移 `EntryBackend.js`、`ManagementPage.js`、`LlmAiGatewayCenter.tsx` 视觉布局或其它 LLM AI/Gateway 页面。
- 不修改后端 Entry API、保存/删除语义、Gateway projection publish、认证授权、OAuth/OIDC、Provider 或真实配置链路。
- 不引入新 UI 库、不做视觉重设计、不调整 i18n 文案。

## Decisions

- **保留 legacy API wrapper**：`EntryBackend.js` 继续作为 JS 模块使用，页面通过局部 `EntryBackendCompat` 类型描述当前调用契约。这样避免一次迁移牵出所有 Entry API wrapper 调用和后端契约重整。
- **复用 Agent 迁移模式**：列表页沿用 `AgentListPage.tsx` 中对 `BaseListPage` 的局部兼容类型做法，避免为 legacy 基类建立全局类型声明。
- **保持 import 语义**：`ManagementPage.js` 继续使用 `./EntryListPage` 与 `./EntryEditPage` 无扩展名导入，由现有构建解析 `.tsx`。这可避免无关路由 diff。
- **测试聚焦可观察行为**：测试覆盖页面标题/字段、按钮动作、后端调用参数、跳转和错误提示，不以 mock 调用数量替代用户可见结果。

## Risks / Trade-offs

- **Legacy JS 继承面类型不完整** → 只声明列表页实际使用的 `getColumnSearchProps`、`getTablePaginationProps` 和 `handleTableChange`，并通过 `yarn typecheck` 验证。
- **Entry 编辑页当前存在原地修改 state 对象的 legacy 行为** → 本 change 保持行为兼容，不在 TS 迁移中重写状态管理；必要空值 guard 只防止未加载时误触发。
- **认证入口文件名相近** → 明确排除 `EntryPage.js`，只迁移 LLM AI/Gateway 菜单下 `/entries` 管理页。
- **后续 MCP/站点/规则页面仍为 JS** → 作为后续 change 继续推进，不在本 change 扩大写集。
