## Context

截图中的红框区域由 `LlmAiGatewayCenter` 渲染，包含页头操作、空态提示、统计摘要、风险待办和多组配置入口。实际使用中，这些入口大多已经由左侧菜单和顶部页签覆盖；摘要又只来自当前 Agent 表格数据，不能代表后端全量网关治理事实。与此同时，AI Agent、MCP Server、入口配置、站点范围、治理规则都是标准对象列表，但它们仍使用旧式 AntD `Table` 标题、行内大按钮和部分固定列。

## Goals / Non-Goals

**Goals:**

- 让 `/agents` 首屏直接呈现 AI Agent 列表主任务。
- 将 `/agents`、`/servers`、`/entries`、`/sites`、`/rules` 对齐最近统一列表壳和轻量行操作。
- 保持现有后端 API、路由、权限、查询、排序、分页、新增、编辑和删除行为不变。
- 保留 MCP Store 当前目录/商店页面形态，后续单独评估。

**Non-Goals:**

- 不新增 LLM AI 网关聚合接口或真实全量风险统计。
- 不改 MCP Store 卡片/目录体验。
- 不迁移编辑页、后端、导航 IA、权限 key 或 Gateway projection 发布链路。
- 不处理项目既有 React 18 测试 warning。

## Decisions

- 直接从 `AgentListPage` 移除 `LlmAiGatewayCenter` 渲染，而不是用 CSS 隐藏。这样 DOM 和首屏高度都回到列表页主任务。
- 五个标准列表页统一使用 `ListPageTable` 和 `LegacyListPageToolbar`。这与近期组织、群组、应用接入、角色权限和 Casbin 列表页保持一致。
- 行操作统一使用 `ListPageRowActions`、`ListPageRowEditAction` 和 `ListPageRowDeleteAction`，降低每行大按钮噪声。
- 桌面不配置不必要固定操作列。窄屏仍可依赖表格内部横向滚动兜底。
- `MCP Store` 暂不改，因为它展示线上目录卡片、筛选和导入动作，不适合直接套标准 CRUD 列表壳。

## Risks / Trade-offs

- 移除 Agent 页大控制台后，跨页面快捷入口减少。缓解方式：左侧菜单和顶部页签仍覆盖这些入口。
- `RuleListPage` 目前没有后端字段搜索能力，本次只统一壳和表格操作，不伪造搜索。缓解方式：工具栏可先承载标题、结果数和新增动作。
- `SiteListPage` 默认 pageSize 仍较大，本次不改变分页数据语义，避免把体验对齐和查询契约变更混在一起。
