## Context

Admin 前端已经完成多个一级菜单的渐进 TypeScript 迁移，当前允许 `.js`、`.ts`、`.tsx` 共存，并通过 `scripts/check-incremental-typescript-gate.mjs` 防止新增 React JS 页面或 JSX `.test.js`。本 change 聚焦“管理工具”一级菜单：

- `/sysinfo` 由 `SystemInfo.js` 承载，负责系统资源、版本和 Prometheus 指标展示。
- `/forms` 和 `/forms/:formName` 由 `FormListPage.js`、`FormEditPage.js` 承载，依赖 `FormBackend`、`BaseListPage`、`FormItemTable` 和多个列表页预览。
- `/tickets` 和 `/tickets/:organizationName/:ticketName` 由 `TicketListPage.js`、`TicketEditPage.js` 承载，依赖 `TicketBackend` 和旧列表页模式。
- `/swagger` 是 `enterpriseNavigation.js` 中的外链，不是 React 页面。

本次迁移只改变源文件类型和局部类型声明，不改变业务行为、后端接口或菜单信息架构。

## Goals / Non-Goals

**Goals:**

- 将系统信息、表单列表/编辑、工单列表/编辑页面迁移为 `.tsx`。
- 为迁移页面补充局部 props、state、record、message、API response、fetch params 等类型。
- 新增或迁移 `.test.tsx` 聚焦测试，覆盖关键渲染、列表列、编辑行为入口和消息发送入口。
- 保持 `/swagger` API 文档外链导航配置不变。
- 通过 OpenSpec、增量 TS gate、`yarn typecheck`、focused Jest coverage 和 `yarn build` 验证。

**Non-Goals:**

- 不把 `/swagger` 改造成 React 页面。
- 不迁移或重构 `FormBackend`、`TicketBackend`、`SystemInfo` backend client、`BaseListPage`、`FormItemTable`、`PrometheusInfoTable`、`ToolTable` 或 `Setting`。
- 不迁移所有 `FormBackend` 使用方，不修改用户、应用、Provider、组织列表页的动态表单预览行为。
- 不改变认证/OIDC/Gateway、真实密钥、生产配置、权限策略或运行态外部服务。
- 不做视觉重设计或菜单重命名。

## Decisions

### 1. 页面文件作为迁移边界

本 change 迁移菜单直接打开的页面文件：`SystemInfo`、`FormListPage`、`FormEditPage`、`TicketListPage`、`TicketEditPage`。API 文档是外链，仅验证导航配置继续指向 `/swagger`，不新增页面。

替代方案是连同 `FormItemTable`、backend client 和所有动态表单使用方一起迁移。该方案会把一个菜单页面 TS 迁移扩大成公共表单系统重构，风险更高，也不符合当前“保持行为不变”的目标。

### 2. 使用局部类型和 legacy 边界

迁移页面沿用现有 class component、`BaseListPage` 和 JS backend client 模式。页面内使用局部接口描述 record、state、route params 和 API response；对仍为 JS 的基类和 helper 使用 `types/legacyPage.ts` 中的 legacy 边界类型。

这能让页面进入 TypeScript 检查，同时避免为了类型严格而改写旧运行时逻辑。

### 3. 表单预览保持运行时兼容

`FormEditPage` 会根据表单类型嵌入用户、应用、Provider、组织列表页预览。本次只为 props 和 `formItems` 传递补齐类型，不改变预览容器、遮罩点击、动态字段默认值或 `FormItemTable` 行为。

如果实现过程中发现 `FormItemTable` 或预览列表页必须实质改造，先停止并回传评估，而不是扩大写集。

### 4. 测试以行为保持为主

新增聚焦测试覆盖用户可见行为和迁移风险点：

- 系统信息页面能渲染 CPU、内存、磁盘、网络、版本和指标区域。
- 表单列表保持表单项分栏展示、添加入口和删除入口。
- 表单编辑保持类型切换默认项、预览入口和保存按钮。
- 工单列表保持状态标签、添加入口和管理员删除入口。
- 工单编辑保持字段权限、消息列表和发送入口。
- API 文档继续是导航外链，不进入 React 路由迁移范围。

测试可以 mock 后端 client 和慢速子列表页，但断言必须落在页面行为和可见输出上，不断言 mock 本身存在。

## Risks / Trade-offs

- [Risk] `FormEditPage` 依赖多个未完全 TS 化的列表页预览，过度类型化可能带来无关 diff。
  → Mitigation: 只为当前页面 props/state 和 `formItems` 增加局部类型，预览列表页通过现有 props 透传。

- [Risk] `SystemInfo` 包含轮询定时器，测试可能留下未清理 timer。
  → Mitigation: 聚焦测试中使用 fake timer 或在组件卸载后确认不会依赖真实轮询；生产逻辑保持 `componentWillUnmount` 清理。

- [Risk] 覆盖率按 touched-file 统计可能低于 85%，尤其是旧列表页继承和长编辑页。
  → Mitigation: 优先覆盖高价值行为路径；如 touched-file 全文件覆盖率仍低于 85%，在 `verification.md` 记录 legacy 迁移覆盖风险，不用低价值 mock-only 测试制造假达标。

- [Risk] 构建可能出现项目既有 React 18 / AntD / Browserslist warning。
  → Mitigation: 记录 warning 来源，不把既有依赖 warning 当成本 change 行为回归。
