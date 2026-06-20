## Why

“商业付款”一级菜单下的商品商店和商品管理页面仍停留在 legacy JavaScript。商品目录是商业付款中相对低风险的一组页面，先迁移它们可以延续 Admin 前端渐进 TypeScript 路线，同时避免一次性触碰订单、付款、订阅和交易等准资金链路。

## What Changes

- 将商品目录类 React 页面和控件迁移为 TS/TSX：
  - `/product-store` 的 `ProductStorePage`
  - `/products` 的 `ProductListPage`
  - `/products/:organizationName/:productName` 的 `ProductEditPage`
  - 商品商店、商品购买和购物车共用的 `CartControls`
- 为本次触碰且包含 JSX 的页面/控件新增或迁移 `.test.tsx` 聚焦测试，覆盖商品商店展示、加购入口、商品列表、商品编辑和数量/购物车控件行为。
- 保持现有 `ManagementPage` 路由、`enterpriseNavigation` 菜单、权限可见性、后端 API 调用、文案、商品展示、商品编辑保存、加购入口、敏感信息脱敏和 JS/TS 共存边界不变。
- `ProductBuyPage.js` 暂时保留为 legacy JS，只通过类型边界保持与 `ProductEditPage`、`ProductStorePage` 和 `CartControls` 的现有调用兼容。
- 不迁移购物车页面、订单、付款、计划、定价、订阅、交易、支付结果、公开购买页、后端 payment/provider 逻辑或真实支付链路。
- 不修改认证/OIDC/Gateway、真实密钥、生产配置或类生产配置，不触碰 `test` 分支。

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `web-admin-incremental-typescript`: 增加“商业付款”商品目录类页面的渐进 TypeScript 迁移要求、购买/支付链路非目标边界和验证要求。

## Impact

- Affected frontend pages/components:
  - `web-admin/src/ProductStorePage.js`
  - `web-admin/src/ProductListPage.js`
  - `web-admin/src/ProductEditPage.js`
  - `web-admin/src/common/product/CartControls.js`
- Affected tests:
  - 新增或迁移商品目录相关 `.test.tsx`
- Explicitly out of scope:
  - `ProductBuyPage.js`
  - `CartListPage.js`
  - `Order*Page.js`
  - `Payment*Page.js`
  - `Plan*Page.js`
  - `Pricing*Page.js`
  - `Subscription*Page.js`
  - `Transaction*Page.js`
  - payment/provider backend logic and real payment flows
- Validation:
  - OpenSpec target/changes/specs strict validation
  - `git diff --check`
  - `web-admin` incremental TypeScript gate
  - `yarn typecheck`
  - focused Jest coverage for migrated product catalog files
  - `yarn build`
