## Why

LLM AI / Gateway 长编辑页仍保留旧式 `Row/Col span` 内部表单布局，桌面端 label 列过窄，窄屏下内容列和页面级横向 overflow 风险较高。当前 Admin 前端已进入 TS 稳态，页面 UX/一致性巡检需要把这些编辑页的内部布局收敛到可测试、可维护的 scoped 契约。

## What Changes

- 为 Agent、Entry、MCP Server、站点范围和治理规则编辑页增加稳定的页面/卡片 class hook。
- 用 scoped CSS 约束 LLM AI / Gateway 编辑卡片内部的行、label 列和内容列布局，避免影响嵌套表格、规则表达式编辑器或其它 Admin 页面。
- 增加聚焦 Jest 覆盖 class hook 与布局契约，并执行桌面浏览器 smoke 验证核心页面布局。
- 不修改 API、保存 payload、路由、字段语义、权限、Gateway projection 行为或列表页视觉。

## Capabilities

### New Capabilities

### Modified Capabilities
- `admin-enterprise-identity-llm-ai-gateway-center`: 约束 LLM AI / Gateway 长编辑页内部表单布局一致性和 scoped 样式边界。

## Impact

- 影响前端页面：`web-admin/src/AgentEditPage.tsx`、`web-admin/src/EntryEditPage.tsx`、`web-admin/src/ServerEditPage.tsx`、`web-admin/src/SiteEditPage.tsx`、`web-admin/src/RuleEditPage.tsx`。
- 影响样式：仅在本任务新增 scoped class 下修改 `web-admin/src/App.less`。
- 影响测试：目标页面聚焦 Jest 测试增加布局契约断言；浏览器 smoke 使用脱敏 fixture 或本地拦截验证 DOM/布局，不记录 token、Cookie、真实账号或完整私有 URL。
