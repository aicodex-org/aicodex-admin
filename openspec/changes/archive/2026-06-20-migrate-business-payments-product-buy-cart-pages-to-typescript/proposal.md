## Why

“商业付款”商品目录页面已经迁移到 TSX，但商品购买页和购物车页仍停留在 legacy JavaScript。它们是商品目录之后最自然的一段用户链路：用户从商品商店或商品详情进入购买页，调整数量或金额，加入购物车，或从购物车创建订单并跳转支付页。

本 change 继续渐进 TypeScript 路线，只迁移购买与购物车前端页面，不改变订单、支付、订阅或 provider 的业务语义。

## What Changes

- 将购买与购物车类 React 页面迁移为 TSX：
  - `/products/:organizationName/:productName/buy` 的 `ProductBuyPage`
  - `/cart` 的 `CartListPage`
- 为本次触碰且包含 JSX 的页面新增 `.test.tsx` 聚焦测试，覆盖商品加载、充值金额、数量调整、加入购物车、购物车无效项、清空/删除/数量更新和创建订单入口。
- 复用上一轮已迁移的 `CartControls.tsx` 和 `types/productCatalog.ts`，按需补充购买/购物车局部类型。
- 保持现有 `ManagementPage` 路由、`enterpriseNavigation` 菜单、权限可见性、后端 API 调用、文案、购物车持久化、订单创建入口、支付跳转入口、敏感信息脱敏和 JS/TS 共存边界不变。
- 不迁移订单、付款、计划、定价、订阅、交易、支付结果页面、后端 payment/provider 逻辑或真实支付链路。
- 不修改认证/OIDC/Gateway、真实密钥、生产配置或类生产配置，不触碰 `test` 分支。

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `web-admin-incremental-typescript`: 增加“商业付款”购买与购物车页面的渐进 TypeScript 迁移要求、订单/支付非目标边界和验证要求。

## Impact

- Affected frontend pages:
  - `web-admin/src/ProductBuyPage.js`
  - `web-admin/src/CartListPage.js`
- Affected shared types:
  - `web-admin/src/types/productCatalog.ts`
- Affected tests:
  - 新增购买与购物车相关 `.test.tsx`
- Explicitly out of scope:
  - `Order*Page.js`
  - `Payment*Page.js`
  - `Plan*Page.js`
  - `Pricing*Page.js`
  - `Subscription*Page.js`
  - `Transaction*Page.js`
  - `ProductBackend.js`
  - `OrderBackend.js`
  - `UserBackend.js`
  - `PaymentBackend.js`
  - payment/provider backend logic and real payment flows
- Validation:
  - OpenSpec target/changes/specs strict validation
  - `git diff --check`
  - `web-admin` incremental TypeScript gate
  - `yarn typecheck`
  - focused Jest coverage for migrated buy/cart files
  - `yarn build`
