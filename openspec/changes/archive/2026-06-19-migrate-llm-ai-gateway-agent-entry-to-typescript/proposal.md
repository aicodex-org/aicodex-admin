## Why

`LLM AI/Gateway` 菜单已经有 `LlmAiGatewayCenter.tsx` 作为 AI/Gateway 工作台摘要，但承载它的 `AgentListPage.js` 和 `AgentEditPage.js` 仍是 legacy JavaScript。AI Agent 入口是该菜单下风险较低的第一组页面：只涉及既有 Agent 列表、编辑、保存、删除和应用绑定表单，不需要改动后端 API、Gateway projection publish 或 MCP/规则等后续页面。

本 change 按 web-admin 增量 TypeScript 路线，将 AI Agent 入口相关页面迁移为 TSX，并用聚焦测试和类型检查证明现有 JS/TSX 共存路径仍可用，为后续入口配置、MCP Store、MCP Server、站点范围和治理规则迁移建立节奏。

## What Changes

- 将 `web-admin/src/AgentListPage.js` 迁移为 `AgentListPage.tsx`，为列表页 props、state、Agent 记录、fetch 参数和 AntD 表格列补充局部 TypeScript 类型。
- 将 `web-admin/src/AgentEditPage.js` 迁移为 `AgentEditPage.tsx`，为路由参数、页面 state、Agent/Organization/Application 记录和表单字段更新补充局部 TypeScript 类型。
- 增加或迁移聚焦 `.test.tsx` 测试，覆盖列表页渲染、`LlmAiGatewayCenter` 总览块仍存在、编辑页基础加载和保存关键路径。
- `LlmAiGatewayCenter.tsx` 仅在 Agent 页面迁移导致类型或 import 需要时做最小兼容调整，不做 UI redesign。
- 保持 `ManagementPage.js` 对 `./AgentListPage`、`./AgentEditPage` 的无后缀导入语义和 `/agents`、`/agents/:organizationName/:agentName` 路由不变。
- 不迁移或重构 MCP Server、MCP Store、入口配置、站点范围、治理规则、应用接入、组织账号、权限角色或后端 wrapper 页面。

## Capabilities

### Modified Capabilities

- `web-admin-incremental-typescript`: 增加 `LLM AI/Gateway` 菜单 AI Agent 入口页面的保守 TSX 迁移约束和验证场景。
- `admin-enterprise-identity-llm-ai-gateway-center`: 明确 AI Agent 入口页面迁移后仍保持 `/agents` 工作台摘要、列表操作和编辑保存删除行为兼容。

## Impact

- 前端：
  - `web-admin/src/AgentListPage.js` -> `web-admin/src/AgentListPage.tsx`
  - `web-admin/src/AgentEditPage.js` -> `web-admin/src/AgentEditPage.tsx`
  - 对应 `.test.tsx` 聚焦测试
  - 如类型检查需要，最小调整 `LlmAiGatewayCenter.tsx` 或测试 import 类型
- OpenSpec：新增本 change 的 proposal、design、tasks、spec delta；归档后更新相关主规格。
- 不影响后端 API、数据库、认证/OIDC、Provider contract、Gateway projection、MCP Server/MCP Store/Entry/Site/Rule 页面、密钥或生产/类生产配置。
