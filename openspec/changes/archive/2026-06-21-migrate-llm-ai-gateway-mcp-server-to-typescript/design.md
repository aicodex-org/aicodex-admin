## Context

当前 `/servers` 由 `ManagementPage.js` 无后缀导入 `ServerListPage`，列表页继承 legacy `BaseListPage`，使用 `backend/ServerBackend.js` 读取、新增和删除 Server。`ServerEditPage.js` 是 class component，读取 `ServerBackend.js`、`OrganizationBackend.js`、`ApplicationBackend.js`，并嵌入 legacy `ToolTable.js` 管理 tools 数组。

本 change 是纯前端类型迁移。`ServerBackend.js` 和 `ToolTable.js` 保持 `.js`，因为迁移它们会牵出 MCP Store、动态表格和更多调用方边界；当前页面可以通过局部类型描述本页消费的响应 shape，并保持运行时调用完全一致。

`origin/hfl-test-base` 当前已包含 Agent 和入口配置 TSX 迁移，但 MCP Store 迁移仍是独立 release candidate，未纳入本分支。本 change 不依赖 MCP Store RC，不修改 `ServerStorePage.js`。

## Goals / Non-Goals

**Goals:**
- 保留 `ServerListPage`、`ServerEditPage` 默认导出和 `ManagementPage.js` 的无后缀 import 兼容。
- 使用局部类型描述 Server、Organization、Application、Tool、列表 fetch 参数、路由 props、页面 state 和 AntD 表格列，避免无解释 `any`。
- 保持 MCP Server 列表、搜索、排序、分页、新增、编辑、删除、MCP Store 跳转、编辑页加载、组织/应用下拉、ToolTable 更新、保存、保存并退出、取消新增和 404 跳转行为不变。
- 使用 `.test.tsx` 聚焦覆盖用户可观察行为和关键状态分支，并记录 changed-file coverage。

**Non-Goals:**
- 不新增或修改 MCP Server 后端 API，不迁移 `ServerBackend.js`。
- 不迁移 `ServerStorePage.js`、`ToolTable.js`、MCP Store、站点范围、治理规则、规则表格或其它 `LLM AI/Gateway` 页面。
- 不改变 Server 保存/删除语义，不触发 Gateway projection publish。
- 不调整 LLM AI/Gateway 工作台视觉、文案、导航 IA、权限 key 或 i18n key。
- 不修改 TypeScript 基建、`package.json`、lockfile 或 `tsconfig.json`。

## Decisions

- **页面级局部类型优先**：Server 页面当前只消费少量字段，先在页面内定义局部接口，避免把 legacy backend wrapper 一次性升级成共享 API 模型。
- **保留 class component 形态**：迁移目标是行为兼容 TSX，不把 class component 重写为 hooks，避免扩大生命周期和状态更新风险。
- **Legacy 依赖用窄 compat 类型包裹**：`BaseListPage`、`ServerBackend.js` 和 `ToolTable.js` 保持运行时不变；TSX 页面只声明实际依赖的继承面、函数签名和 props。
- **TDD 覆盖迁移入口**：先新增 `.test.tsx` 断言 `.tsx` 文件存在、旧 `.js` 文件不存在，并覆盖列表与编辑关键路径；RED 失败后再执行重命名和类型迁移。

## Risks / Trade-offs

- [Risk] `BaseListPage` 和 `ToolTable` 仍是 legacy JS，类型无法完全表达内部行为。→ 使用窄 compat 类型，只声明 MCP Server 页面实际依赖的 props、state、回调和表格方法。
- [Risk] `location.mode` 是历史自定义路由 state，不是标准 router 类型字段。→ 在页面 props 中保留兼容字段，不改变调用方传参。
- [Risk] MCP Store RC 尚未合入 base，后续同一区域 OpenSpec specs 可能需要合并顺序协调。→ 本 change 不修改 `ServerStorePage.js`，只新增 MCP Server delta；最终合入时由主控处理不同 change 的 archive 顺序。
- [Risk] 编辑页涉及 token 字段。→ 测试和验证记录不得写入真实 token，仅使用测试占位字符串；页面仍保持现有 `Input.Password` 行为。

## Migration Plan

1. 创建 OpenSpec artifacts 并通过 `openspec validate migrate-llm-ai-gateway-mcp-server-to-typescript --strict`。
2. 实施前 review 确认 scope、写集和验证计划。
3. 先新增 `ServerListPage.test.tsx`、`ServerEditPage.test.tsx` 并运行 RED。
4. 将 `ServerListPage.js`、`ServerEditPage.js` 重命名为 `.tsx`，补充局部类型和必要 compat 类型，不改变 JSX 结构和运行时调用。
5. 运行聚焦 Jest、changed-file coverage、增量 TypeScript gate、`yarn typecheck`、`yarn build`、OpenSpec strict 校验和 `git diff --check`。
6. 更新 `tasks.md` 和 `verification.md`；若无 self-closeout 授权，则交付 release candidate，不合入 `hfl-test-base`。
