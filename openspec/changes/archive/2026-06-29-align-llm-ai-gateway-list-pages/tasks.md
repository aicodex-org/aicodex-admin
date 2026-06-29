## 1. OpenSpec

- [x] 1.1 创建 LLM AI 网关列表壳对齐 change。
- [x] 1.2 更新规格，明确 `/agents` 不再渲染中心式快捷入口墙。
- [x] 1.3 新增标准对象列表统一壳要求，并排除 MCP Store。

## 2. 前端实现

- [x] 2.1 移除 `AgentListPage` 上方的 `LlmAiGatewayCenter` 渲染。
- [x] 2.2 将 `AgentListPage`、`ServerListPage`、`EntryListPage` 迁移到统一列表壳和轻量行操作。
- [x] 2.3 将 `SiteListPage`、`RuleListPage` 迁移到统一列表壳和轻量行操作。
- [x] 2.4 移除这些标准列表页中不必要的固定操作列。

## 3. 验证

- [x] 3.1 更新聚焦测试，覆盖统一列表壳、操作区、固定列移除和 Agent 页不再渲染中心控制台。
- [x] 3.2 运行 OpenSpec 严格校验、增量 TypeScript 门禁、聚焦 Jest 和 typecheck/build。
- [x] 3.3 使用本地预览做浏览器检查，确认目标列表页首屏对齐且无固定列 sticky 单元格。
