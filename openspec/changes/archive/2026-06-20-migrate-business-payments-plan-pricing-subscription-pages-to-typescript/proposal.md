## Why

“商业付款”商品、购买、购物车、订单和付款链路页面已经按渐进 TypeScript 路线迁移到 TSX。计划、定价和订阅页面仍是 legacy JavaScript，且它们共同承接商品售卖方案、公开定价预览和订阅维护，是付款记录之后的自然迁移边界。

本 change 将计划、定价和订阅链路页面迁移到 TSX，并用 `.test.tsx` 覆盖前端可观察行为，同时保持真实支付 provider、订单、付款、订阅状态流转和后端业务语义不变。

## What Changes

- 将计划、定价和订阅链路 React 页面迁移为 TSX：
  - `/plans` 的 `PlanListPage`
  - `/plans/:organizationName/:planName` 的 `PlanEditPage`
  - `/pricings` 的 `PricingListPage`
  - `/pricings/:organizationName/:pricingName` 的 `PricingEditPage`
  - 定价编辑页内嵌的 `pricing/PricingPage` 预览组件
  - `/subscriptions` 的 `SubscriptionListPage`
  - `/subscriptions/:organizationName/:subscriptionName` 的 `SubscriptionEditPage`
- 新增计划、定价、订阅 `.test.tsx` 聚焦测试，覆盖：
  - 列表页的新增、删除、筛选/排序 fetch 参数、权限禁用、状态列和错误分支。
  - 编辑页的加载、404 跳转、组织切换联动、字段更新、保存、保存并退出、取消新增和删除。
  - 定价预览组件在已有 pricing fixture 下的计划展示和购买入口。
- 复用现有 `PlanBackend`、`PricingBackend`、`SubscriptionBackend`、`ProductBackend`、`UserBackend`、`BaseListPage`、`Setting` 和 AntD 组件模式，只补充页面局部类型和商业付款共享类型。
- 保持现有 `ManagementPage` 路由、商业付款菜单、权限可见性、接口调用、文案、计划/定价/订阅维护入口、定价预览和 JS/TS 共存边界不变。
- 不迁移交易页面和交易表格；不重构 backend client；不调用真实 payment provider；不改变真实订单创建、支付跳转、支付回调、支付结果确认或订阅状态流转语义。

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `web-admin-incremental-typescript`: 增加“商业付款”计划、定价和订阅链路页面的渐进 TypeScript 迁移要求、支付/订阅真实业务非目标边界和验证要求。

## Impact

- Affected frontend pages:
  - `web-admin/src/PlanListPage.js` → `web-admin/src/PlanListPage.tsx`
  - `web-admin/src/PlanEditPage.js` → `web-admin/src/PlanEditPage.tsx`
  - `web-admin/src/PricingListPage.js` → `web-admin/src/PricingListPage.tsx`
  - `web-admin/src/PricingEditPage.js` → `web-admin/src/PricingEditPage.tsx`
  - `web-admin/src/pricing/PricingPage.js` → `web-admin/src/pricing/PricingPage.tsx`
  - `web-admin/src/SubscriptionListPage.js` → `web-admin/src/SubscriptionListPage.tsx`
  - `web-admin/src/SubscriptionEditPage.js` → `web-admin/src/SubscriptionEditPage.tsx`
- Affected shared types:
  - 复用或扩展 `web-admin/src/types/businessPayment.ts`，按实现需要补充 plan、pricing、subscription、provider、organization 和 application 局部类型。
- Affected tests:
  - 新增计划、定价和订阅链路 `.test.tsx`
- Explicitly out of scope:
  - `Transaction*Page.js`
  - `web-admin/src/table/TransactionTable*.js`
  - `PlanBackend.js`
  - `PricingBackend.js`
  - `SubscriptionBackend.js`
  - `ProductBackend.js`
  - `UserBackend.js`
  - `BaseListPage`
  - `Setting`
  - payment provider backend logic、真实订单创建、真实支付跳转、真实支付回调、真实支付结果确认和真实订阅状态流转
- Validation:
  - OpenSpec target/changes/specs strict validation
  - `git diff --check`
  - `web-admin` incremental TypeScript gate
  - `yarn typecheck`
  - focused Jest coverage for migrated plan/pricing/subscription files
  - `yarn build`
