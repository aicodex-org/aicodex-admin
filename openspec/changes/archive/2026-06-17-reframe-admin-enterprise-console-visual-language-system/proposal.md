## Why

只读视觉复验显示，组织身份四页的去模板化已经有效，但 `/providers`、`/applications`、审计运维四页和 `/agents` 仍把核心列表压到首屏以下，并且旧英文 Tour、移动端大空白和实现痕迹文案继续破坏企业认证中心观感。

本 change 需要把非组织身份页面从“套一层同质工作台模板”收敛为信息密度更高、业务域语义更清楚的企业身份治理控制台，同时保持既有路由、权限 key、表格操作和只读安全边界。

## What Changes

- 认证源 `/providers` 从大块状态卡堆叠改为紧凑接入诊断区，使 Provider 列表在桌面首屏可感知。
- 应用接入 `/applications` 降权应用卡片网格，把应用列表和新增/编辑等高频操作提前到首屏范围，同时保留接入缺口摘要。
- 审计运维 `/sessions`、`/records`、`/tokens`、`/verifications` 改为共享但更紧凑的运行态核对条，避免四层说明卡压住列表。
- LLM AI / Gateway `/agents` 保留 AI、Gateway、MCP 语义，但压缩顶部说明和入口卡，使 Agent 列表和关键操作进入首屏。
- 企业认证中心路由下默认不自动展示旧 Casdoor 英文 Tour，避免遮挡核心列表。
- 移动端减少页头和卡片大空白；抽样页面列表或核心操作不再被推到几千像素后。
- 清理本轮触碰范围的硬编码中文、英文 fallback、Keys/Webhooks/Webhook Events 残留和“只读推导/当前列表视图”等实现痕迹文案，同步 `zh` / `en` locale。

## Capabilities

### New Capabilities

- 无。本 change 修改既有企业认证中心能力的视觉语言、首屏密度和文案契约，不新增独立业务能力。

### Modified Capabilities

- `admin-enterprise-identity-auth-source-center`: 认证源中心改为紧凑接入诊断与列表优先的首屏结构。
- `admin-enterprise-identity-application-access-center`: 应用接入中心改为列表优先、缺口摘要辅助的首屏结构，并清理实现痕迹文案。
- `admin-enterprise-identity-audit-operations-center`: 审计运维中心改为紧凑运行态核对结构，四个页面列表进入首屏可感知范围。
- `admin-enterprise-identity-llm-ai-gateway-center`: LLM AI 网关中心压缩顶部工作台层，让 Agent 列表和关键操作进入首屏。
- `admin-enterprise-identity-console-shell`: 企业认证中心 Shell 更新视觉语言契约，默认不自动弹出旧英文 Tour，并要求移动端密度收口。

## Impact

- 影响 `web-admin` 的 React/Ant Design 页面布局、共享企业认证中心组件、Tour 配置和 `zh` / `en` locale。
- 不修改后端接口、权限 key、OAuth/OIDC 回调执行、真实认证链路、Gateway projection publish/cleanup/receipt 或生产/类生产配置。
- 验证需要 OpenSpec strict、`git diff --check`、`yarn typecheck`、聚焦 Jest/coverage、`yarn build` 和浏览器桌面/移动坐标复验。
