## Why

Admin 企业认证中心已经完成总览、组织身份、认证源、应用接入、审计运维和 LLM AI/Gateway 的控制台化基础，但当前体验仍主要停留在“列表页上方的状态摘要”。下一阶段需要把这些页面串成企业级身份治理体验：管理员能从某个对象进入关系、证据和时间线，能处理跨域治理待办，并能通过向导完成接入前检查，而不是在多个列表间手工拼接事实。

本 change 最初只规划产品体验层和 OpenSpec 契约；后续多个小切片已经把 P0/P1 前端只读能力合入 `hfl-test-base`。归档前收口时，本 umbrella 只保留已成立的前端只读对象上下文、治理任务队列、接入向导安全边界和身份资产关系聚合前端 fallback；未完成的后端聚合接口、真实连接测试、持久处理状态和历史模型从本 scope 裁出。

## What Changes

- 新增“身份资产关系层”规划：围绕组织、用户、角色、权限、应用、认证源、LLM AI/Gateway、审计记录提供对象详情、关系列表/关系图、时间线和审计证据链入口。
- 新增“治理任务中心”规划：把同步失败、孤立账号、高权限角色、应用接入不完整、异常 token、回调缺失、Provider 绑定风险等问题组织成可筛选、可解释、可处理的治理队列。
- 新增“接入体验层”规划：为认证源、应用接入、Gateway/LLM AI 映射设计向导化配置、预检、测试连接、启用前检查和结果页。
- 按已完成事实收口 P0/P1：P0 前端只读对象上下文、治理任务队列和接入向导安全边界已合入；P1 仅保留身份资产关系聚合的前端 contract/client/fallback 切片，不声明后端聚合接口已存在。
- 明确事实边界：前端从当前列表、分页 total 或已加载行推导出的状态只能标记为“当前视图/当前筛选/只读核对”，不得伪装成全局事实；需要全局事实时必须作为后续只读聚合接口单独定义。
- 明确 React + TypeScript 路线：新增体验组件默认 `.tsx`，新增类型、模型、数据转换和只读聚合接口模型默认 `.ts`，实现 change 需要按风险运行 `yarn typecheck`、聚焦测试、`yarn build` 和浏览器验证；本轮仅做 OpenSpec/docs 收口，不新增实现代码。

## Capabilities

### New Capabilities

- `admin-enterprise-identity-asset-relationship-layer`: 定义身份资产详情、关系、时间线和审计证据链的体验契约，覆盖入口、对象边界、只读事实来源、失败/空态和验证要求。
- `admin-enterprise-identity-governance-task-center`: 定义跨域治理任务队列、严重级别、影响对象、建议动作、处理状态、事实来源和 P0/P1/P2 演进边界。
- `admin-enterprise-identity-connection-wizards`: 定义认证源、应用接入、Gateway/LLM AI 映射的向导化接入、预检、测试连接、启用前检查和结果页契约。

### Modified Capabilities

- None. Existing organization identity, auth source, application access, audit operations, LLM AI/Gateway and TypeScript capabilities remain the baseline; this change introduces the next experience layer without changing their current requirements.

## Impact

- Affected frontend areas already covered by prior slices: `web-admin` enterprise identity routes, object detail drawers/pages, governance task center, connection wizard components, shared relationship/timeline/evidence/task models and related tests.
- Deferred future API contracts: optional read-only aggregate endpoints for global governance tasks, evidence chains and preflight checks;这些必须作为未来独立 change 重新定义，不由本 umbrella archive 隐式交付。
- No package, lockfile, build infrastructure, App.less, Tour, locale or existing page implementation changes are made by this proposal.
- No secrets, tokens, cookies, client secrets, private URLs, complete connection strings or real account credentials are required or recorded.
