## Context

上一轮 `migrate-business-payments-product-buy-cart-pages-to-typescript` 已将商品购买页和购物车页迁移到 TSX，并将订单创建入口保留为 legacy `OrderBackend.placeOrder` 调用和 `/orders/<owner>/<order>/pay` 跳转。

当前订单链路前端边界如下：

- `/orders` 由 `OrderListPage.js` 承载，负责订单分页、筛选、排序、产品摘要、状态展示、管理员新增、取消、编辑/查看和删除入口。
- `/orders/:organizationName/:orderName` 由 `OrderEditPage.js` 承载，负责订单加载、产品/用户/付款选择、状态和消息编辑、保存、保存并退出、取消新增和删除。
- `/orders/:organizationName/:orderName/pay` 由 `OrderPayPage.js` 承载，负责加载订单、加载首个商品、展示订单和商品摘要、渲染支付渠道、调用 `OrderBackend.payOrder` 并根据 provider 类型跳转或调用 WeChat JSAPI。

本 change 只改变源文件类型、局部类型声明和测试覆盖，不改变订单状态机、支付 provider、支付回调、订阅流转、真实密钥或后端 API。

## Goals / Non-Goals

**Goals:**

- 将 `OrderListPage`、`OrderEditPage` 和 `OrderPayPage` 迁移为 TSX。
- 使用局部 props、route params、state、order、productInfo、payment provider、pagination、table column、select option 和 WeChat attach info 类型描述本次触碰代码。
- 新增 `.test.tsx` 聚焦测试，覆盖订单列表、编辑和支付页的主要行为与失败分支。
- 保持 `/orders`、`/orders/:organizationName/:orderName`、`/orders/:organizationName/:orderName/pay` 路由和菜单行为不变。
- 保持 `OrderBackend`、`ProductBackend`、`UserBackend`、`PaymentBackend`、`BaseListPage`、`PaginateSelect` 和 `Setting` 作为 legacy JS 边界。
- 通过 OpenSpec、增量 TS gate、`yarn typecheck`、focused Jest coverage 和 `yarn build` 验证。

**Non-Goals:**

- 不迁移付款记录、支付结果、计划、定价、订阅、交易页面。
- 不迁移或重构 `OrderBackend.js`、`ProductBackend.js`、`UserBackend.js`、`PaymentBackend.js`、`BaseListPage`、`PaginateSelect`、`Setting`、payment provider、真实支付链路、真实密钥、生产配置、Gateway/OIDC/认证相关逻辑。
- 不改变订单创建、取消、删除、状态编辑、支付跳转、二维码支付、WeChat JSAPI 支付、支付结果展示、支付回调或订阅状态流转行为。
- 不做视觉重设计、菜单重命名或商业付款信息架构调整。

## Decisions

### 1. 以订单列表、编辑和支付页作为一个业务页面组

三个页面共同构成购物车创建订单后的订单处理闭环：列表查看和管理、详情编辑、支付发起。把它们放在同一个 change 可以共享订单类型和测试 fixture，同时避免把付款记录、订阅和交易页面一次性拉进来。

### 2. 使用局部订单类型和 legacy 后端边界

页面继续沿用 class component、`BaseListPage`、JS backend client、`PaginateSelect` 和 `Setting` 模式。类型只描述本次页面实际读取和写入的字段，避免为了类型完整性重构后端 client 或支付模型。

### 3. 支付页只验证前端入口契约

`OrderPayPage` 只验证 `payOrder` 调用参数、provider 类型分支、二维码 URL 拼装、WeChat JSAPI 调用入口、成功/取消/失败提示和跳转契约。它不调用真实支付 provider，也不验证真实支付结果、回调或订阅状态。

### 4. 测试覆盖用户可观察行为和边界保护

新增测试应覆盖：

- 订单列表的新增、取消、删除、编辑/查看/支付入口、产品摘要、价格和状态提示。
- 订单编辑页的订单加载、产品/付款列表加载、404 跳转、字段更新、保存、保存并退出和删除。
- 订单支付页的订单加载、商品加载、产品信息渲染、不可支付状态隐藏支付区、无 provider 空态、普通 provider 跳转、WeChat 浏览器 JSAPI 分支、二维码支付跳转和失败提示。

测试可以 mock backend client 和 `Setting`，但断言必须落在可见 UI、调用参数、状态变化和导航契约上，不添加只为覆盖率执行行号的低价值测试。

## Risks / Trade-offs

- [Risk] `OrderListPage` 继承 `BaseListPage`，表格 column/search/pagination 类型较宽。
  → Mitigation: 用局部兼容类型描述本页依赖的基类能力，不重构 `BaseListPage`。

- [Risk] `OrderEditPage` 依赖多个 legacy backend client 和 `PaginateSelect` 动态参数。
  → Mitigation: 保留运行时调用和参数顺序，只为 route/state/record 添加局部类型。

- [Risk] `OrderPayPage` 包含真实支付入口，错误迁移可能影响支付体验。
  → Mitigation: 只 mock `OrderBackend.payOrder` 并断言前端分支和跳转契约；不触发真实 provider，不改支付结果确认。

- [Risk] 覆盖率目标可能诱导测试触碰真实支付链路。
  → Mitigation: 覆盖率只统计 touched TSX 页面，支付行为用 provider fixture 和 mock response 验证。
