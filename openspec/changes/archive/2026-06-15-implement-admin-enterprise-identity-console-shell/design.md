## Context

`web-admin/src/ManagementPage.js` 已经由既有 active change 改成“顶部工具栏 + 左侧认证中心导航 + 内容区”结构，并把旧菜单放入 `getNavigationGroups()`。当前缺口在于：`/` 仍渲染旧 `Dashboard` 趋势图，左侧分组仍是 Home/User Management/Identity/LLM AI/Admin 等历史后台语义，组织同步、认证源、应用、API 映射和 Gateway 投影入口分散在多个组里。

本次阶段 1 只做企业认证中心 Shell：建立总览页和 IA，不重写旧页面内部，也不触碰组织边界 WIP、认证链路、同步执行或 projection publish。

## Goals / Non-Goals

**Goals:**

- 将 `/` 管理员首页变成身份治理总览，首屏就是可操作控制台，不做 marketing landing page。
- 将左侧导航重组为企业认证中心语义：总览、组织与身份、认证源、应用接入、Gateway 投影、审计与运维。
- 首页用已有数据和页面入口表达轻量状态：组织主数据、企业微信/飞书/OIDC、应用接入/API 映射、Gateway 投影、最近失败/待处理风险。
- 保留 `navItems` / `userNavItems` 权限过滤、深链接高亮、桌面侧栏和移动抽屉共用菜单数据。
- 覆盖加载、空态、错误态、无权限/无数据和窄屏响应式。

**Non-Goals:**

- 不改认证、授权、组织同步、Gateway projection publish、API 映射执行等后端行为。
- 不重构组织目录质量、projection run diff/retry、飞书组织同步等当前 WIP 页面内部。
- 不新增真实 fixture、生产/类生产操作、私有 URL、token/Cookie 或真实组织/用户明细。
- 不改 API/Insight/RedClaw 仓库，不合入或 push `test`。

## Decisions

### 1. 用新总览组件替换旧 Dashboard，而不是做单独落地页

`/` 已经是后台首页，也是当前 `selectedMenuKey` 的根路径。直接替换为 `IdentityConsoleOverview` 能保持深链接、登录重定向和现有管理员入口稳定，同时避免新增一个“介绍页”。旧 Dashboard 的趋势图数据可以被保守复用为统计来源；当数据缺失或接口失败时，总览页以局部错误和空态展示，不阻塞其他入口。

备选方案是新增 `/identity-console` 并保留 `/` 旧 Dashboard，但这会让第一屏仍不表达企业认证中心，因此不采用。

### 2. 导航只调整分组语义和路由归属，不重写旧页面

`getNavigationGroups()` 继续作为桌面侧栏和移动抽屉的单一菜单源，保留 `matchPrefixes`、`visible` 和 `navItems` 权限过滤。分组调整为：

- 总览：身份治理总览、快捷入口。
- 组织与身份：组织、组织树、用户、用户组、邀请、组织目录质量、组织树运营。
- 认证源：认证提供商、企业微信同步、飞书同步、同步器。
- 应用接入：应用、资源、证书、密钥、API 网关映射、Webhook。
- Gateway 投影：MCP/Agent/Entry/Site/Rule 等现有 Gateway 相关入口，并明确为“投影与网关接入”语义。
- 审计与运维：会话、审计记录、令牌、验证码、系统信息、工单、表单和必要管理工具。

备选方案是按后端模型重新拆页面或新增多级路由，但会扩大范围并触碰旧页面内部，因此不采用。

### 3. 总览状态采用前端只读聚合和降级，而不是新增后端域模型

阶段 1 的目标是 Shell。总览页优先复用 `DashboardBackend.getDashboard()` 的已有计数，并从账号、组织配置和既有路由配置推导能力入口状态。对企业微信、飞书、OIDC、API 映射和 Gateway 投影，页面展示“已接入入口 / 待巡检 / 需配置”这类只读状态，不调用写接口，不触发同步、发布、重试或真实探测。

如后续需要准确的失败数、待处理风险和运行健康度，应另起 change 定义后端聚合接口。

### 4. 视觉遵循企业 SaaS 管理台

页面使用 Ant Design 的 `Card`、`Alert`、`Tag`、`Statistic`、`Button`、`Spin` 等现有组件。布局采用紧凑信息带、状态卡片、入口列表和风险队列，避免大 hero、渐变装饰和卡片套卡片。移动端使用响应式栅格和可换行文本，按钮使用图标加短文案。

## Risks / Trade-offs

- [现有 `navItems` 可能仍使用旧路由 key] → 只改变分组，不改变叶子 `key`，继续按既有 key 过滤。
- [总览数据不完整导致误导] → 明确使用“只读巡检入口”和降级态，不宣称真实健康度；接口失败时局部提示。
- [多个 active changes 均触碰壳层] → 本 change 只基于当前基线编辑目标文件，并避免修改 `refactor-web-admin-auth-center-shell` 未完成验证项。
- [覆盖率工具可能只能输出组件级/测试文件级结果] → 使用现有 Jest 测试覆盖总览渲染、权限降级和导航结构；在 `verification.md` 记录统计对象。

## Migration Plan

1. 新增或改造身份治理总览组件和样式，优先使用已有 `DashboardBackend` 数据。
2. 调整 `ManagementPage` 导航分组文案和叶子归属，保持路由 key 与权限过滤兼容。
3. 补充前端测试覆盖总览加载/错误/空态、关键入口和导航分组。
4. 运行 OpenSpec 校验、前端聚焦测试、构建或等效校验、`git diff --check`。
5. 归档后由 archive 同步主规格；测试环境合入由主控统一处理。

回滚策略：如总览或导航上线后出现异常，可恢复 `ManagementPage` 分组和 `/` 路由到旧 Dashboard；该变更不包含数据库或后端协议迁移。
