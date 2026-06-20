## Why

“商业付款”商品目录、购买页和购物车页已经按渐进 TypeScript 路线迁移到 TSX。订单链路仍由 legacy JavaScript 页面承载，包括订单列表、订单编辑和订单支付入口；这些页面直接连接购物车下单后的订单查看、管理员维护、取消/删除和支付发起流程，是商业付款路线下一段自然边界。

本 change 继续迁移订单链路前端页面，目标是让订单页面进入 TypeScript 检查和 `.test.tsx` 回归保护，同时保持真实订单创建、支付 provider、支付回调和订阅状态流转语义不变。

## What Changes

- 将订单链路 React 页面迁移为 TSX：
  - `/orders` 的 `OrderListPage`
  - `/orders/:organizationName/:orderName` 的 `OrderEditPage`
  - `/orders/:organizationName/:orderName/pay` 的 `OrderPayPage`
- 新增订单链路 `.test.tsx` 聚焦测试，覆盖订单列表加载、产品摘要展示、管理员操作、取消/删除、新增入口、订单编辑加载/保存/删除、订单支付页加载、支付渠道展示、WeChat JSAPI 分支、二维码支付跳转和错误提示。
- 复用现有 `OrderBackend`、`ProductBackend`、`UserBackend`、`PaymentBackend`、`BaseListPage`、`PaginateSelect`、`Setting` 和 i18n 调用模式，只增加页面局部类型。
- 保持现有 `ManagementPage` 路由、商业付款菜单、权限可见性、后端 API 调用、文案、订单状态展示、取消/删除按钮约束、支付按钮和跳转入口不变。
- 不迁移付款记录、支付结果、计划、定价、订阅、交易页面，不重构 backend client，不调用真实 payment provider，不改变真实支付结果确认或回调语义。

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `web-admin-incremental-typescript`: 增加“商业付款”订单列表、订单编辑和订单支付页面的渐进 TypeScript 迁移要求、支付 provider 非目标边界和验证要求。

## Impact

- Affected frontend pages:
  - `web-admin/src/OrderListPage.js`
  - `web-admin/src/OrderEditPage.js`
  - `web-admin/src/OrderPayPage.js`
- Affected shared types:
  - `web-admin/src/types/productCatalog.ts` 或新增局部订单类型，按实现需要决定
- Affected tests:
  - 新增订单链路 `.test.tsx`
- Explicitly out of scope:
  - `Payment*Page.js`
  - `Plan*Page.js`
  - `Pricing*Page.js`
  - `Subscription*Page.js`
  - `Transaction*Page.js`
  - `OrderBackend.js`
  - `ProductBackend.js`
  - `PaymentBackend.js`
  - `BaseListPage`
  - payment provider backend logic、真实支付回调和真实外部支付流程
- Validation:
  - OpenSpec target/changes/specs strict validation
  - `git diff --check`
  - `web-admin` incremental TypeScript gate
  - `yarn typecheck`
  - focused Jest coverage for migrated order files
  - `yarn build`
