## Context

上一轮 `migrate-business-payments-order-pages-to-typescript` 已将订单列表、订单编辑和订单支付入口迁移到 TSX。订单支付后会进入 `PaymentResultPage` 查看支付状态；管理员也会在 `PaymentListPage` 和 `PaymentEditPage` 查看付款记录、维护发票信息并触发发票动作。

当前支付结果与付款记录前端边界如下：

- `/payments/:organizationName/:paymentName/result` 迁移前由 `PaymentResultPage.js` 承载，本 change 后由 `PaymentResultPage.tsx` 承载，负责付款加载、支付处理中轮询、部分 provider 的 `notifyPayment` 入口、订阅 pricing/subscription 关联加载、付款成功后刷新当前用户余额和结果页状态展示。
- `/payments` 迁移前由 `PaymentListPage.js` 承载，本 change 后由 `PaymentListPage.tsx` 承载，负责付款分页、筛选、排序、产品摘要、状态展示、结果页入口、管理员新增、编辑/查看和删除入口。
- `/payments/:organizationName/:paymentName` 迁移前由 `PaymentEditPage.js` 承载，本 change 后由 `PaymentEditPage.tsx` 承载，负责付款加载、发票字段维护、发票信息校验、开票确认弹窗、发票下载、保存和删除。

本 change 只改变源文件类型、局部类型声明和测试覆盖，不改变支付状态机、真实 provider、支付通知、支付回调、开票或订阅状态流转。

## Goals / Non-Goals

**Goals:**

- 将 `PaymentResultPage`、`PaymentListPage` 和 `PaymentEditPage` 迁移为 TSX。
- 使用局部 props、route params、state、payment、productInfo、pricing、subscription、invoice 和 pagination 类型描述本次触碰代码。
- 新增 `.test.tsx` 聚焦测试，覆盖支付结果、付款列表和付款编辑页的主要行为与失败分支。
- 保持 `/payments`、`/payments/:organizationName/:paymentName`、`/payments/:organizationName/:paymentName/result` 路由和菜单行为不变。
- 保持 `PaymentBackend`、`PricingBackend`、`SubscriptionBackend`、`UserBackend`、`BaseListPage`、`Provider` 和 `Setting` 作为 legacy JS 边界。
- 通过 OpenSpec、增量 TS gate、`yarn typecheck`、focused Jest coverage 和 `yarn build` 验证。

**Non-Goals:**

- 不迁移计划、定价、订阅、交易页面。
- 不迁移或重构 `PaymentBackend.js`、`PricingBackend.js`、`SubscriptionBackend.js`、`UserBackend.js`、`BaseListPage`、`Provider`、payment provider、真实支付通知、真实支付回调、真实开票、真实密钥、生产配置、Gateway/OIDC/认证相关逻辑。
- 不改变支付状态轮询间隔、`notifyPayment` 调用条件、发票校验规则、保存/删除/开票接口参数、支付结果展示文案或订阅状态流转行为。
- 不做视觉重设计、菜单重命名或商业付款信息架构调整。

## Decisions

### 1. 以支付结果和付款记录作为一个业务页面组

`PaymentResultPage` 是订单支付入口后的结果承接，`PaymentListPage` 和 `PaymentEditPage` 是同一付款事实的后台查看和维护入口。三者共同构成“付款结果/记录”边界；放在同一个 change 可以共享付款类型和 fixture，同时避免把计划/定价/订阅/交易页面一次性拉进来。

### 2. 使用局部付款类型和 legacy 后端边界

页面继续沿用 class component、`BaseListPage`、JS backend client、`Provider` 和 `Setting` 模式。类型只描述本页实际读取和写入的字段，避免为了类型完整性重构 payment provider、发票模型或 backend client。

### 3. 支付和开票只验证前端入口契约

`PaymentResultPage` 只验证付款结果渲染、轮询/notify 入口和跳转契约；`PaymentEditPage` 只验证发票字段校验、弹窗、接口调用参数和链接打开入口。测试不调用真实 payment provider，不触发真实支付通知、真实支付回调或真实开票。

### 4. 测试覆盖用户可观察行为和边界保护

新增测试应覆盖：

- 支付结果页的空加载、paid/recharge/created/canceled/timeout/failed 状态渲染、订单跳转、订单缺失提示、订阅 pricing/subscription 加载、`notifyPayment` 分支和错误提示。
- 付款列表页的新增、删除、结果页入口、编辑/查看入口、产品摘要、价格、provider/user/organization 链接、类型筛选、权限禁用和错误分支。
- 付款编辑页的付款加载、404 跳转、字段更新、个人/组织发票校验、开票成功/失败/异常、发票下载、保存、保存并退出和删除。

测试可以 mock backend client、`Provider` 和 `Setting`，但断言必须落在可见 UI、调用参数、状态变化和导航契约上，不添加只为覆盖率执行行号的低价值测试。

## Risks / Trade-offs

- [Risk] `PaymentListPage` 继承 `BaseListPage`，表格 column/search/pagination 类型较宽。
  → Mitigation: 用局部兼容类型描述本页依赖的基类能力，不重构 `BaseListPage`。

- [Risk] `PaymentEditPage` 包含较多发票字段和校验规则，迁移时容易误改可编辑状态。
  → Mitigation: 保留现有 JSX 结构和校验顺序，测试覆盖个人/组织发票关键分支、已开票禁用和开票入口。

- [Risk] `PaymentResultPage` 包含轮询和 provider notify 入口，错误迁移可能影响支付结果体验。
  → Mitigation: 使用 fake timers / mock backend 验证轮询和 notify 调用，不触发真实 provider。

- [Risk] 覆盖率目标可能诱导测试触碰真实支付或开票链路。
  → Mitigation: 覆盖率只统计 touched TSX 页面，支付和开票行为用 backend fixture 和 mock response 验证。
