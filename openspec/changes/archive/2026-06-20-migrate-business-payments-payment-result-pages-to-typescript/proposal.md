## Why

“商业付款”商品、购买、购物车和订单链路页面已经进入渐进 TypeScript 路线，但支付结果页与付款记录列表/编辑仍是 legacy JavaScript。它们承接订单支付后的状态轮询、付款记录查看、管理员维护和发票动作，是订单链路之后的自然迁移边界。

本 change 将支付结果与付款记录页面迁移到 TSX，并用 `.test.tsx` 覆盖前端可观察行为，同时保持真实 payment provider、真实支付通知、真实开票和后端支付语义不变。

## What Changes

- 将支付结果与付款记录链路 React 页面迁移为 TSX：
  - `/payments/:organizationName/:paymentName/result` 的 `PaymentResultPage`
  - `/payments` 的 `PaymentListPage`
  - `/payments/:organizationName/:paymentName` 的 `PaymentEditPage`
- 新增支付结果与付款记录 `.test.tsx` 聚焦测试，覆盖：
  - 支付结果页的 paid/created/canceled/timeout/failed 渲染、订单跳转、轮询通知入口、订阅 pricing/subscription 加载和错误提示。
  - 付款列表页的加载、类型筛选、产品摘要、结果/编辑/查看/删除入口、管理员新增和错误分支。
  - 付款编辑页的付款加载、404 跳转、表单字段更新、发票校验、开票/下载入口、保存、保存并退出和删除。
- 复用现有 `PaymentBackend`、`PricingBackend`、`SubscriptionBackend`、`UserBackend`、`BaseListPage`、`Provider`、`Setting` 和 AntD 组件模式，只增加页面局部类型。
- 保持现有 `ManagementPage` 路由、商业付款菜单、权限可见性、接口调用、文案、支付状态展示、付款维护入口、发票动作入口、结果页轮询入口和 JS/TS 共存边界不变。
- 不迁移计划、定价、订阅、交易页面；不重构 backend client；不调用真实 payment provider；不改变真实支付通知、支付回调、开票或订阅状态流转语义。

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `web-admin-incremental-typescript`: 增加“商业付款”支付结果页、付款记录列表页和付款记录编辑页的渐进 TypeScript 迁移要求、支付/开票 provider 非目标边界和验证要求。

## Impact

- Affected frontend pages:
  - `web-admin/src/PaymentResultPage.js` → `web-admin/src/PaymentResultPage.tsx`
  - `web-admin/src/PaymentListPage.js` → `web-admin/src/PaymentListPage.tsx`
  - `web-admin/src/PaymentEditPage.js` → `web-admin/src/PaymentEditPage.tsx`
- Affected shared types:
  - 复用或扩展 `web-admin/src/types/businessPayment.ts`，按实现需要补充付款、pricing、subscription、发票字段的局部类型。
- Affected tests:
  - 新增支付结果与付款记录链路 `.test.tsx`
- Explicitly out of scope:
  - `Plan*Page.js`
  - `Pricing*Page.js` 和 `web-admin/src/pricing/PricingPage.js`
  - `Subscription*Page.js`
  - `Transaction*Page.js`
  - `PaymentBackend.js`
  - `PricingBackend.js`
  - `SubscriptionBackend.js`
  - `UserBackend.js`
  - `BaseListPage`
  - `Provider`
  - payment provider backend logic、真实支付通知、真实支付回调、真实开票和真实订阅状态流转
- Validation:
  - OpenSpec target/changes/specs strict validation
  - `git diff --check`
  - `web-admin` incremental TypeScript gate
  - `yarn typecheck`
  - focused Jest coverage for migrated payment files
  - `yarn build`
