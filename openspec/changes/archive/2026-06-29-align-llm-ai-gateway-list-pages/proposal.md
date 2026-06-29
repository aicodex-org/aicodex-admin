## Why

LLM AI 网关下多个页面已经是标准对象列表，但 `/agents` 上方的中心式控制台主要重复侧栏和页签里的菜单入口，压低表格主任务；其它列表页也还保留旧表格标题、大按钮和固定操作列，和最近统一列表壳不一致。

## What Changes

- `/agents` 不再渲染 `LlmAiGatewayCenter` 快捷入口墙和大块摘要区，首屏回到 AI Agent 列表、查询、添加和表格操作。
- `/agents`、`/servers`、`/entries`、`/sites`、`/rules` 对齐最近统一列表壳，使用统一标题/动作区、查询工具栏、表格壳、分页和轻量行操作。
- 移除这些标准列表页中桌面不必要的固定操作列，避免 sticky 分割线和横向噪声。
- `/server-store` 暂不纳入本次统一列表壳改造，因为它是目录/商店式页面，不是标准分页 CRUD 列表。
- 不新增后端 API，不改变路由、权限、查询、排序、分页、新增、编辑、删除或 Gateway projection 行为。

## Capabilities

### New Capabilities

无。

### Modified Capabilities

- `admin-enterprise-identity-llm-ai-gateway-center`: 调整 LLM AI 网关列表页体验契约，移除 AI Agent 页中心式快捷入口墙，并要求标准对象列表复用统一列表壳。

## Impact

- 前端代码：`AgentListPage.tsx`、`ServerListPage.tsx`、`EntryListPage.tsx`、`SiteListPage.tsx`、`RuleListPage.tsx`、`LlmAiGatewayCenter.tsx` 及相关测试。
- OpenSpec：同步更新 LLM AI 网关中心主规格。
- API / 数据库 / 权限 / 导航：无变更。
