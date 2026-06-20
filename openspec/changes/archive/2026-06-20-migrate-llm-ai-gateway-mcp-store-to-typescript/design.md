## Context

LLM AI/Gateway 菜单下 `/server-store` 是 MCP Store 目录页，当前由 `ServerStorePage.js` 提供线上 MCP Server 目录加载、筛选和一键创建本地 Server 草稿能力，并由 `ManagementPage.js` 通过无扩展名 import 接入。前两阶段已完成 AI Agent 入口和入口配置页面 TSX 迁移，本 change 延续同一增量 TypeScript 路线，优先迁移不依赖表格基类和编辑表单的 MCP Store 目录页。

`ServerListPage.js` 和 `ServerEditPage.js` 是 MCP Server 管理页，包含列表、编辑和后端 Server API 管理行为。本 change 不触碰这两个页面，避免把 MCP Store 目录迁移扩大成 MCP Server 管理迁移。

## Goals / Non-Goals

**Goals:**

- 将 `ServerStorePage` 保守迁移为 TSX，补充局部 props、state、线上 MCP Server 原始响应、归一化目录项、标签选项和创建 payload 类型。
- 保持 `/server-store` 现有路由、权限、接口、文案和页面行为不变。
- 补充 `.test.tsx` 聚焦测试，覆盖目录渲染、筛选、响应格式兼容、创建本地 Server 和失败路径。
- 继续复用 legacy JS `ServerBackend.js` 和 `Setting.js`，通过局部兼容类型描述页面实际调用契约。

**Non-Goals:**

- 不迁移 `ServerListPage.js`、`ServerEditPage.js`、`ServerBackend.js`、`ManagementPage.js` 或 `LlmAiGatewayCenter.tsx` 视觉布局。
- 不迁移入口配置、站点范围、治理规则、规则表格、应用接入、组织账号或权限角色页面。
- 不修改后端 Server API、线上 MCP Store API、Server 保存/删除语义、Gateway projection publish、认证授权、OAuth/OIDC、Provider 或真实配置链路。
- 不引入新 UI 库、不做视觉重设计、不调整 i18n 文案。

## Decisions

- **只迁移目录页**：本 change 仅触碰 `ServerStorePage`，因为它是 MCP Store 的独立页面；MCP Server 列表/编辑页后续单独作为更高风险 change 处理。
- **保留 legacy API wrapper**：`ServerBackend.js` 继续作为 JS 模块使用，页面通过局部 `ServerBackendCompat` 类型描述 `getOnlineServers` 和 `addServer` 调用契约，避免牵出 Server 管理页和后端 wrapper 全量类型化。
- **保留响应兼容逻辑**：继续支持 `{servers: []}`、数组和 `{data: []}` 三种线上目录响应结构，并只展示 production endpoint 以 `http` 开头的目录项。
- **保持 import 语义**：`ManagementPage.js` 继续使用 `./ServerStorePage` 无扩展名导入，由现有构建解析 `.tsx`，避免无关路由 diff。
- **测试聚焦可观察行为**：测试覆盖页面标题、目录项、筛选结果、按钮动作、后端调用参数、跳转和错误提示，不以 mock 调用数量替代用户可见结果。

## Risks / Trade-offs

- **线上目录响应形态宽松** → 使用局部 `unknown` 输入和类型收窄保持原有兼容逻辑，并通过测试覆盖三种响应结构。
- **创建名称归一化依赖随机 fallback** → 保留现有 `getRandomName` fallback 行为，测试固定随机值验证空名称/非法字符时的稳定输出。
- **链接 website 自动补 `https://` 的 legacy 行为可能不适合所有输入** → 本 change 保持兼容，不在 TS 迁移中改变 URL 规则。
- **后续 MCP Server 管理页仍为 JS** → 作为下一阶段 change 继续推进，不在本 change 扩大写集。
