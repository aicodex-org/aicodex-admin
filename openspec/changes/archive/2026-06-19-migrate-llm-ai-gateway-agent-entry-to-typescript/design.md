## Context

当前 `/agents` 由 `ManagementPage.js` 无后缀导入 `AgentListPage`，列表页继承 `BaseListPage` 并在表格前渲染 `LlmAiGatewayCenter.tsx`。`AgentEditPage.js` 是 class component，直接调用 `AgentBackend.js`、`OrganizationBackend.js` 和 `ApplicationBackend.js`，负责 Agent 读取、组织/应用下拉、字段更新、保存、保存并退出、取消新增和删除。

本 change 是纯前端类型迁移。Agent 后端 wrapper 仍保持 `.js`，因为迁移 wrapper 会牵出更多调用方类型边界；当前页面可以通过局部类型描述本页消费的响应 shape，并保持运行时调用完全一致。

## Goals / Non-Goals

### Goals

- 保留 `AgentListPage`、`AgentEditPage` 默认导出和 `ManagementPage.js` 的无后缀 import 兼容。
- 使用局部类型描述 Agent、Organization、Application、列表 fetch 参数、路由 props、页面 state 和 AntD 表格列，避免无解释 `any`。
- 保持 Agent 列表、搜索、排序、分页、新增、编辑、删除、总览块渲染、编辑页加载、保存、保存并退出、取消新增和 404 跳转行为不变。
- 新增或迁移 React 测试为 `.test.tsx`，聚焦用户可观察行为和关键 mutation 路径。

### Non-Goals

- 不新增或修改 Agent 后端 API，不迁移 `AgentBackend.js`。
- 不改变 Agent 保存/删除语义，不触发 Gateway projection publish。
- 不迁移 MCP Server、MCP Store、入口配置、站点范围、治理规则、应用接入、组织账号、权限角色或其它菜单页面。
- 不调整 LLM AI/Gateway 工作台视觉、文案、导航 IA、权限 key 或 i18n key。
- 不修改 TypeScript 基建、`package.json`、lockfile 或 `tsconfig.json`。

## Decisions

- **页面级局部类型优先**：Agent 页面当前只消费少量字段，先在页面内定义局部接口，避免把 legacy backend wrapper 一次性升级成共享 API 模型。
- **保留 class component 形态**：迁移目标是行为兼容 TSX，不把 class component 重写为 hooks，避免扩大生命周期和状态更新风险。
- **对 legacy 响应保持宽松**：后端响应和历史 state 字段可能缺少可选字段，类型采用可选字段与最小响应接口描述，运行时仍沿用既有 `res.status === "ok"` 判断和 `res.data || []` 兜底。
- **测试覆盖关键入口而非 mock 细节**：列表页测试验证总览块与表格入口仍渲染，编辑页测试验证基础加载和保存请求路径；不为覆盖率添加只断言 mock 调用次数的低价值测试。

## Rollout / Compatibility

- React Scripts/CRACO 会按既有 TS 基建解析 `.tsx`，`ManagementPage.js` 的 `./AgentListPage` 和 `./AgentEditPage` 无后缀导入继续解析到迁移后的文件。
- 路由、权限、菜单和后端 endpoint 不变，既有管理员 URL 可继续访问。
- 如果 typecheck 暴露 legacy JS 继承或第三方库类型缺口，只在迁移页面和测试内做最小局部类型适配；若必须大改共享组件或其它页面，则停止并回传 `needs_master_decision=true`。

## Validation Strategy

- `openspec validate migrate-llm-ai-gateway-agent-entry-to-typescript --strict`
- `openspec validate --changes --strict`
- `openspec validate --specs --strict`
- `git diff --check`
- `cd web-admin; node scripts/check-incremental-typescript-gate.mjs --base origin/hfl-test-base`
- `cd web-admin; yarn typecheck`
- `cd web-admin; yarn test --watchAll=false --runInBand --coverage --collectCoverageFrom=src/AgentListPage.tsx --collectCoverageFrom=src/AgentEditPage.tsx --runTestsByPath <agent-focused-tests>`
- `cd web-admin; yarn build`，用于验证 `ManagementPage.js` 到迁移后 TSX 页面的导入边界。
