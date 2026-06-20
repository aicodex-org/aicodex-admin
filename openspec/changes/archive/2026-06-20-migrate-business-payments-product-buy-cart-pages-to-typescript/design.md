## Context

上一轮 `migrate-business-payments-product-catalog-pages-to-typescript` 已将商品商店、商品列表、商品编辑和 `CartControls` 迁移到 TSX，并明确把 `ProductBuyPage` 与 `CartListPage` 留给后续 change。

当前购买与购物车链路的前端边界如下：

- `/products/:organizationName/:productName/buy` 由 `ProductBuyPage.js` 承载，负责加载商品、可选 pricing/plan、充值金额、数量调整、加入购物车和创建订单入口。
- `/cart` 由 `CartListPage.js` 承载，负责加载当前用户购物车、补齐商品信息、标记无效项、更新数量、删除/清空购物车和创建订单入口。
- `CartControls.tsx` 已经是 TSX，本轮继续作为 JS/TS 共存边界复用。
- 订单创建仍通过 legacy `OrderBackend.placeOrder`，支付跳转仍由 `Setting.goToLink('/orders/<owner>/<order>/pay')` 承载。

本 change 只改变源文件类型和局部类型声明，不改变商业付款的业务语义、订单创建、支付 provider、支付跳转、支付回调或订阅状态流转。

## Goals / Non-Goals

**Goals:**

- 将 `ProductBuyPage` 和 `CartListPage` 迁移为 TSX。
- 使用局部 props、state、product、cart item、user、pricing、plan、table column 和 route params 类型描述本次触碰代码。
- 为迁移页面补充 `.test.tsx` 聚焦测试，覆盖购买页加载、充值金额、数量控制、加入购物车、创建订单入口、购物车加载、无效项、数量更新、删除/清空和购物车创建订单入口。
- 保持 `/products/:organizationName/:productName/buy`、`/cart` 路由和菜单行为不变。
- 保持 `ProductBackend`、`PlanBackend`、`PricingBackend`、`OrderBackend`、`UserBackend` 作为 legacy JS 后端 client 边界，不重构接口调用。
- 通过 OpenSpec、增量 TS gate、`yarn typecheck`、focused Jest coverage 和 `yarn build` 验证。

**Non-Goals:**

- 不迁移订单、付款、计划、定价、订阅、交易或支付结果页面。
- 不迁移或重构 `ProductBackend.js`、`OrderBackend.js`、`UserBackend.js`、`PaymentBackend.js`、`BaseListPage`、`Setting`、payment provider、真实支付链路、真实密钥、生产配置、Gateway/OIDC/认证相关逻辑。
- 不改变商品购买、购物车持久化、订单创建、支付跳转、支付结果展示、公开购买页或订阅状态流转行为。
- 不做视觉重设计、菜单重命名或商业付款信息架构调整。

## Decisions

### 1. 以购买与购物车作为单个业务页面组

`ProductBuyPage` 和 `CartListPage` 共用购物车 item 结构、数量控件、加购/删购/清空逻辑和订单创建入口。把它们放在同一个 change 能覆盖一段完整但仍有限的用户链路。

替代方案是只迁移单页。该方案会让共享类型和测试分散，且无法验证商品购买到购物车的共同行为。一次性迁移订单/支付则风险过高，暂不采用。

### 2. 使用局部类型和 legacy 后端边界

页面沿用现有 class component、`BaseListPage`、JS backend client、`Setting` 和 i18n 模式。页面内使用局部接口描述商品、购物车、用户、pricing、plan、响应和状态；后端 client 仍通过 legacy boundary 调用。

这能让本批页面进入 TypeScript 检查，同时避免为了类型严格而重写旧运行时逻辑。

### 3. 订单创建和支付跳转只验证入口契约

购买页和购物车页都能调用 `OrderBackend.placeOrder` 并在成功后跳转支付页。本 change 只验证前端组装参数和跳转入口保持不变，不验证真实订单状态、支付 provider、支付结果或回调。

如迁移过程中发现订单或支付语义必须调整，应停止评估并另开业务 change。

### 4. 测试以用户可见行为和边界保护为主

新增聚焦测试覆盖迁移风险点：

- 购买页加载普通商品、pricing/plan 商品和充值商品。
- 购买页金额选择、自定义金额、不可购买充值项、数量调整、加入购物车和创建订单入口。
- 购物车页补齐商品信息、无效商品/币种变化、总价、删除/清空、数量更新和创建订单入口。
- 错误路径保留原有 `Setting.showMessage` 行为。

测试可以 mock 后端 client，但断言必须落在页面可见行为、状态变化、调用参数和导航契约上，不为覆盖率添加低价值 mock-only 断言。

## Risks / Trade-offs

- [Risk] `ProductBuyPage` 同时承载公开购买和后台购买入口，路由 props 形态较多。
  → Mitigation: 保留现有 props fallback 顺序，使用兼容 route props 类型，并覆盖 route params、直接 props 和 query 参数关键路径。

- [Risk] `CartListPage` 继承 `BaseListPage`，table column 和 search props 类型较宽。
  → Mitigation: 只在页面内收窄本次需要的 cart/product 类型；`BaseListPage` 和 AntD table 复杂泛型使用局部兼容边界，不重构基类。

- [Risk] 覆盖率目标可能诱导测试触碰真实订单/支付链路。
  → Mitigation: 订单创建只 mock `OrderBackend.placeOrder` 并断言参数和跳转，不调用真实支付 provider。

- [Risk] 页面存在旧式 `UNSAFE_componentWillMount` 和直接实例方法测试。
  → Mitigation: TS 迁移保持生命周期语义不变；如需后续改造生命周期，另开非本 change 的重构任务。
