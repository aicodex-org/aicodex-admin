## 1. 已完成范围：P0 共享模型和事实边界

- [x] 1.1 新增来源范围、cannotInfer、证据项、影响对象、敏感信息脱敏摘要和安全下一步动作的 TypeScript 模型。
- [x] 1.2 新增共享工具，为当前视图、当前筛选和只读推导数据打标，避免把这些摘要渲染成全局事实。
- [x] 1.3 补充聚焦 `.test.ts` 覆盖来源标签、脱敏、cannotInfer 和禁止全局事实误导文案。
- [x] 1.4 在接入 UI 前，用 `yarn typecheck` 和聚焦测试验证 P0 共享模型。

## 2. 已完成范围：P0 身份资产关系层

- [x] 2.1 为高价值身份资产实现 `.tsx` 对象详情抽屉或轻量详情页入口，覆盖 Application、Provider binding、User/Role/Permission 和 Gateway mapping 等对象。
- [x] 2.2 为组织、用户、角色、权限、应用、认证源、LLM AI/Gateway 和审计证据引用新增当前视图关系列表。
- [x] 2.3 新增时间线和证据入口，跳转到既有审计、同步、令牌、验证、Gateway mapping 或 readiness 页面，且不触发执行行为。
- [x] 2.4 补充 `.test.tsx` 覆盖对象边界、关系来源标签、空态、错误态、权限态、路由动作和敏感信息脱敏。
- [x] 2.5 运行 `yarn typecheck`、聚焦测试、按风险运行 `yarn build`，并用浏览器验证对象入口可用且核心列表仍可访问。

### 2a. 已完成切片：`/applications` + `/providers`

- [x] 2a.1 从现有列表行操作实现 Application 和 Provider 对象上下文抽屉入口。
- [x] 2a.2 新增 Provider 绑定、目标组织、回调、授权范围、认证源、同步诊断、应用绑定查找和配置完整度的当前视图/当前筛选关系列表。
- [x] 2a.3 新增审计、令牌、验证、Gateway mapping、应用列表和诊断路由的时间线/证据入口，且不触发执行行为。
- [x] 2a.4 补充 `.test.tsx` 覆盖 Application/Provider 对象边界、关系来源标签、cannotInfer、权限态、路由动作、敏感信息脱敏和 zh/en 文案。
- [x] 2a.5 对 `/applications` 和 `/providers` 运行 `yarn typecheck`、聚焦测试覆盖率、`yarn build` 与浏览器验证后回传切片。

## 3. 已完成范围：P0 治理任务中心前端只读队列

- [x] 3.1 实现同步失败、孤立账号、高权限角色、应用接入不完整、异常 token、回调缺失、Provider 绑定风险和 Gateway mapping 缺口的 TypeScript 任务分类器。
- [x] 3.2 实现 `.tsx` 治理任务队列页面，支持按任务类型、严重级别、影响对象、来源范围、处理状态和关键字筛选。
- [x] 3.3 将 P0 任务来源明确限定为当前视图、当前筛选和只读候选，并让建议动作只跳转到既有配置、证据或详情页面。
- [x] 3.4 补充聚焦测试覆盖任务类型、严重级别、来源范围标签、cannotInfer、建议动作、空态、错误态和敏感信息脱敏。
- [x] 3.5 后续只读复验证明 `/governance-tasks` direct route 和总览入口可渲染、筛选/任务动作可用、无旧 Tour/overlay、无 console warning/error，并记录其证据层级不是 60/生产端到端。

## 4. 已完成范围：P0 接入向导

- [x] 4.1 为认证源、应用接入和 Gateway/LLM AI mapping flows 实现向导状态、步骤、阻塞项、预检结果和脱敏结果摘要模型。
- [x] 4.2 实现 `.tsx` 向导壳层、步骤、预检清单、启用前检查页和结果页，且不替代既有 Provider/Application/Gateway 编辑路由。
- [x] 4.3 将 P0 预检/测试连接限定为配置完整度和当前对象只读模拟；不执行真实 OAuth/OIDC callback、Provider login、sync、Gateway publish、cleanup 或 receipt verification。
- [x] 4.4 补充聚焦测试覆盖步骤切换、取消/返回、阻塞项、结果页、权限态、预检失败、cannotInfer 和敏感信息脱敏。
- [x] 4.5 后续 60 `/access-wizard` 复验和本地/browser 验证已证明向导流程、取消和 no-write 安全边界可见；该证据不代表真实 OAuth/OIDC/Gateway 执行链路可用。

### 4a. 已完成切片：接入向导结果证据联动

- [x] 4a.1 使用当前对象身份资产上下文、稳定对象 key 和领域化结果证据链接扩展 access wizard 模型。
- [x] 4a.2 从 `/access-wizard` 到 `/identity-assets` 渲染结果摘要证据联动，不新增 KPI 卡片、全宽工作台面板或写动作。
- [x] 4a.3 允许 `/identity-assets` 从 access wizard query context 选择请求的资产，同时保持证据链动作只读。
- [x] 4a.4 补充 `.test.ts` / `.test.tsx` 覆盖模型联动、结果证据渲染和请求资产选择。

## 5. 已完成范围：P1 身份资产关系只读聚合前端切片

- [x] 5.1 定义身份资产关系聚合的前端 TypeScript contract 和只读 GET client，包含 `scope`、`generatedAt`、`sourceOfTruth`、`redactionSummary`、`cannotInfer` 和 permission 字段。
- [x] 5.2 新增聚合响应 adapter，将返回关系/证据标记为 `global_aggregation`，并在渲染前重新执行前端脱敏。
- [x] 5.3 将 Application 和 Provider 对象上下文动作接入只读聚合 endpoint；endpoint 不存在、局部失败或不可用时保留当前行 fallback。
- [x] 5.4 补充聚焦测试覆盖聚合适配、敏感信息脱敏和 no-write GET 行为。

## 6. 归档前收口

- [x] 6.1 将未完成的治理任务后端聚合、接入预检后端接口、权限/脱敏后端校验和持久处理状态从本 umbrella active checklist 中裁出。
- [x] 6.2 在 proposal/design/spec 中明确本次 archive 不声明后端聚合接口、真实连接测试、持久处理状态或历史模型已实现。
- [x] 6.3 补充归档前验证记录，说明本轮为 OpenSpec/docs-only 收口，覆盖率、typecheck、build 和浏览器验证为 N/A。

## Deferred / 从本 umbrella 裁出的未来候选

- `DEFER`: 治理任务后端只读聚合接口，包括分页、任务类型、严重级别、影响对象、来源范围、证据项和安全下一步动作。
- `DEFER`: 认证源、应用接入和 Gateway/LLM AI mapping 的后端只读 preflight/test summary 接口。
- `DEFER`: 后端和前端联合校验权限过滤、脱敏、局部失败和 no-write 行为的完整链路。
- `DEFER`: 治理任务处理状态持久化的数据 owner、权限、审计、保留周期、回滚策略和脱敏导出。
- `DEFER`: 接入向导 preflight/test 历史、红线导出和跨域结果证据历史模型。
