## Context

上一轮 `migrate-business-payments-payment-result-pages-to-typescript` 已将支付结果页、付款记录列表页和付款记录编辑页迁移到 TSX。商业付款链路中仍保留 legacy JavaScript 的核心页面主要集中在计划、定价、订阅和交易区域。

当前计划、定价和订阅前端边界如下：

- `/plans` 迁移前由 `PlanListPage.js` 承载，本 change 后由 `PlanListPage.tsx` 承载，负责计划分页、筛选、排序、新增、编辑/查看、删除、角色/商品链接、价格和启用状态展示。
- `/plans/:organizationName/:planName` 迁移前由 `PlanEditPage.js` 承载，本 change 后由 `PlanEditPage.tsx` 承载，负责计划加载、组织/角色/payment provider 选项、价格/周期/币种/启用/独占字段、保存和删除。
- `/pricings` 迁移前由 `PricingListPage.js` 承载，本 change 后由 `PricingListPage.tsx` 承载，负责定价分页、筛选、排序、新增、编辑/查看、删除、应用链接、计划链接和启用状态展示。
- `/pricings/:organizationName/:pricingName` 迁移前由 `PricingEditPage.js` 承载，本 change 后由 `PricingEditPage.tsx` 承载，负责定价加载、组织/应用/计划选项、试用期、启用开关、公开预览 URL 复制和内嵌定价预览。
- `pricing/PricingPage` 迁移前由 `PricingPage.js` 承载，本 change 后由 `PricingPage.tsx` 承载，作为定价编辑页的预览展示和公开选择计划页复用组件。
- `/subscriptions` 迁移前由 `SubscriptionListPage.js` 承载，本 change 后由 `SubscriptionListPage.tsx` 承载，负责订阅分页、筛选、排序、新增、编辑/查看、删除、时间、用户、计划、付款和状态展示。
- `/subscriptions/:organizationName/:subscriptionName` 迁移前由 `SubscriptionEditPage.js` 承载，本 change 后由 `SubscriptionEditPage.tsx` 承载，负责订阅加载、组织/用户/pricing/plan 选项、时间、周期、付款、描述、状态、保存和删除。

本 change 只改变源文件类型、局部类型声明和测试覆盖，不改变 plan/pricing/subscription 后端 API、真实订单、支付、回调、付款结果确认或订阅状态流转。

## Goals / Non-Goals

**Goals:**

- 将 `PlanListPage`、`PlanEditPage`、`PricingListPage`、`PricingEditPage`、`pricing/PricingPage`、`SubscriptionListPage` 和 `SubscriptionEditPage` 迁移为 TSX。
- 使用局部 props、route params、state、plan、pricing、subscription、provider、organization、application、pagination 和 select option 类型描述本次触碰代码。
- 新增 `.test.tsx` 聚焦测试，覆盖计划、定价、订阅列表和编辑页的主要行为与失败分支。
- 保持 `/plans`、`/plans/:organizationName/:planName`、`/pricings`、`/pricings/:organizationName/:pricingName`、`/subscriptions` 和 `/subscriptions/:organizationName/:subscriptionName` 路由和菜单行为不变。
- 保持 `PlanBackend`、`PricingBackend`、`SubscriptionBackend`、`ProductBackend`、`UserBackend`、`BaseListPage` 和 `Setting` 作为 legacy JS 边界。
- 通过 OpenSpec、增量 TS gate、`yarn typecheck`、focused Jest coverage 和 `yarn build` 验证。

**Non-Goals:**

- 不迁移交易页面、交易表格或交易 backend client。
- 不迁移或重构 `PlanBackend.js`、`PricingBackend.js`、`SubscriptionBackend.js`、`ProductBackend.js`、`UserBackend.js`、`BaseListPage`、`Setting`、payment provider、真实订单创建、真实支付跳转、真实支付通知、真实支付回调、真实支付结果确认、真实密钥、生产配置、Gateway/OIDC/认证相关逻辑。
- 不改变计划价格、定价 trial duration、计划选择、订阅状态、保存/删除接口参数、公开定价预览 URL、复制行为或任何订阅状态流转行为。
- 不做视觉重设计、菜单重命名或商业付款信息架构调整。

## Decisions

### 1. 以计划、定价和订阅作为一个业务页面组

Plan 是定价和订阅共同引用的售卖方案，Pricing 负责把多个 Plan 组合成公开选择页，Subscription 负责记录用户实际订阅关系。三者字段和测试 fixture 可以共享；放在同一个 change 能保持迁移后的类型边界一致，同时避免把交易明细和用户编辑页内嵌交易表格拉入本轮。

### 2. 使用局部类型和 legacy 后端边界

页面继续沿用 class component、`BaseListPage`、JS backend client、`PaginateSelect` 和 `Setting` 模式。类型只描述本页实际读取和写入的字段，避免为了类型完整性重构 backend client、订阅状态机或支付 provider。

### 3. 定价预览随 PricingEditPage 一起迁移

`PricingEditPage` 直接渲染 `pricing/PricingPage`，如果只迁移编辑页而保留预览为 JS，会让同一业务页面继续跨 TSX/JSX 边界。`PricingPage` 是展示组件，适合在本轮迁移并用 fixture 覆盖计划展示和购买入口。

### 4. 测试覆盖用户可观察行为和边界保护

新增测试应覆盖：

- 计划列表/编辑页的新增、删除、加载、组织切换、payment provider 过滤、字段更新、保存和错误提示。
- 定价列表/编辑页的新增、删除、计划链接、应用选择、计划选择、复制预览 URL、预览展示、保存和错误提示。
- 订阅列表/编辑页的新增、删除、状态渲染、用户/计划/付款链接、组织切换、时间字段、状态选择、保存和错误提示。

测试可以 mock backend client、`PricingPage` 的消费者边界和 `Setting`，但断言必须落在可见 UI、调用参数、状态变化和导航契约上，不添加只为覆盖率执行行号的低价值测试。

## Risks / Trade-offs

- [Risk] 列表页继承 `BaseListPage`，表格 column/search/pagination 类型较宽。
  → Mitigation: 用局部兼容类型描述本页依赖的基类能力，不重构 `BaseListPage`。

- [Risk] `PricingEditPage` 内嵌 `PricingPage`，预览组件可能被公开选择计划页复用。
  → Mitigation: 保持组件 props、按钮、链接和展示文案不变，测试覆盖预览 fixture；不改公开购买语义。

- [Risk] `SubscriptionEditPage` 包含订阅状态字段，误改可能影响管理员维护体验。
  → Mitigation: 保留状态选项、管理员禁用条件和保存 payload 形状，测试覆盖状态选择和保存参数。

- [Risk] 覆盖率目标可能诱导测试触碰真实支付或订阅链路。
  → Mitigation: 覆盖率只统计 touched TSX 页面，订单/支付/订阅真实流转用 backend fixture 和 mock response 验证。
