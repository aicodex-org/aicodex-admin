## Context

上一轮企业认证中心路线已为总览、认证源中心和应用接入中心建立共享工作台视觉组件。当前“审计运维”分组仍停留在四个运行态列表入口：`/sessions`、`/records`、`/tokens`、`/verifications`。这些页面承载真实运维行为，但缺少共同的页面角色、入口关系、风险核对和只读说明，导致左侧导航看起来像杂项堆叠。

本轮只治理 Admin 前端 IA 和展示层。后端接口、会话删除、令牌新增/编辑/删除、审计记录详情、验证码记录查询等既有行为必须保持兼容。

## Goals / Non-Goals

**Goals:**

- 将审计运维定位为企业认证中心的运行态核对域，围绕会话、审计记录、令牌、验证记录组织统一工作台。
- 四个既有页面共享同一个审计运维壳层，展示当前视图摘要、四类入口、风险核对和只读边界。
- 运行时导航和组织配置页导航树使用同一 IA 和双语文案，保留叶子 key 兼容 `navItems` / `userNavItems`。
- 新增前端组件默认 TSX，关键状态推导提供聚焦测试和覆盖率。

**Non-Goals:**

- 不新增审计聚合后端接口，不新增真实失败探测或风险扫描。
- 不触发会话清理、令牌签发、验证码重发、认证/授权/OIDC 回调、组织同步、Gateway projection publish 等执行行为。
- 不改后端权限模型、API contract、数据库结构或生产/类生产配置。
- 不扩大到组织身份中心、LLM AI / Gateway 中心或商业计费分组。

## Decisions

### 1. 复用四个既有路由，而不是新增第五个中心路由

审计运维已有四个核心运行态入口，新增 `/audit-operations` 会增加左侧子项数量，也会引入新的路由权限 key 和配置树迁移成本。本轮选择在四个既有页面上方嵌入共享壳层，让任一入口都能看到同一工作台语义，同时保留 `/sessions`、`/records`、`/tokens`、`/verifications` 的路由和权限兼容性。

### 2. 新增 `AuditOperationsCenter.tsx` 专注运行态核对

新增 TSX 组件负责：

- 基于当前列表视图和 `pagination.total` 展示只读摘要；
- 将 Sessions / Records / Tokens / Verifications 表达为会话核对、审计记录、令牌核对、验证核对四个入口；
- 根据当前页数据做轻量前端风险提示，例如 4xx/5xx 审计记录、可见令牌数量、未使用验证码、活跃会话数量；
- 明确当前摘要只来自当前列表或分页总数，不包装成后端全量治理事实。

四个旧 JS 列表页只负责传入当前 data、loading、pagination total 和 active view，不做大规模迁移。

### 3. 导航 IA 使用 locale key，而不是继续硬编码

`enterpriseNavigation.js` 继续作为运行时侧栏和 `NavItemTree` 的唯一导航源。审计运维叶子 label 改用新增 locale key：

- `Session Review`
- `Audit Records`
- `Token Review`
- `Verification Review`

中文分别为“会话核对、审计记录、令牌核对、验证核对”。叶子 key 不变，避免组织配置迁移。

### 4. 保持写操作边界不变

`/sessions` 的删除、`/tokens` 的新增/编辑/删除属于既有页面行为，本轮不删除、不改权限、不新增批量操作。新增工作台中的入口只跳转既有路由，不执行写操作。

## Risks / Trade-offs

- [Risk] 当前摘要来自当前列表视图，不代表全量审计事实。→ 在页面文案和 spec 中明确“只读当前视图/分页总数”，后续真实聚合接口另起 change。
- [Risk] 旧 JS 页面接入新 TSX 组件可能暴露类型互操作问题。→ 运行 `yarn typecheck`、聚焦 Jest 和 `yarn build`。
- [Risk] 新增双语文案可能遗漏某个导航触点。→ 覆盖 `ManagementPage.navigation.test.js` 与 `NavItemTree.test.js`，并检查 zh/en locale。
- [Risk] 工作台增加首屏内容可能挤压表格。→ 保持高密度、无嵌套卡片、表格仍紧随工作台下方，浏览器验证桌面和窄屏。

## Migration Plan

1. 创建 delta specs 与 tasks，先通过 OpenSpec strict。
2. 测试先行：导航 IA、配置树、审计运维中心摘要/风险/入口和敏感字段不展示。
3. 新增 `AuditOperationsCenter.tsx`，四个列表页嵌入壳层。
4. 更新 locale 与样式，运行 typecheck、聚焦测试/coverage、build、浏览器验证。
5. 补充 `verification.md`、路线台账和脱敏最终报告。

如需回滚，可移除 `AuditOperationsCenter.tsx` 引用和相关 locale/导航 label 调整；本 change 不包含后端迁移或数据变更。

## Open Questions

- 暂无阻塞问题。若后续需要跨租户全量失败率、活跃会话、令牌风险或验证码滥用检测，应新增只读聚合接口和独立 change。
