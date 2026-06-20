## Why

“商业付款”一级菜单下的商品购买、购物车、订单、付款、计划、定价、订阅、交易页面和本路线触碰的共享表格已经分批迁移到 TS/TSX。路线收尾需要形成一份可审计的最终扫描证据，说明商业付款范围内是否仍有 legacy JS/JSX 页面或共享组件，以及哪些 JS 文件是明确保留的全局壳或 backend client 边界。

本 change 不做支付业务改造，只完成商业付款 TS 迁移路线的 closeout 记录和主规格收尾。

## What Changes

- 新增商业付款 TS 迁移 closeout OpenSpec delta，要求最终扫描商业付款页面和共享组件。
- 记录商业付款范围内已迁移的 TS/TSX 页面、共享组件和 `.test.tsx` 测试。
- 明确这些 legacy JS 仍保留在边界外：
  - `ManagementPage.js`、`EntryPage.js`、`enterpriseNavigation.js`：全局路由/导航壳，仍可 extensionless import TSX 页面。
  - `ProductBackend.js`、`OrderBackend.js`、`PaymentBackend.js`、`PlanBackend.js`、`PricingBackend.js`、`SubscriptionBackend.js`、`TransactionBackend.js`、`UserBackend.js`：backend client 边界，不在本路线重构。
  - `BaseListPage`、`Setting`：全局 legacy 基础设施，不在商业付款页面迁移中重构。
- 运行商业付款 focused tests、增量 TypeScript gate、typecheck、build 和 OpenSpec 校验。

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `web-admin-incremental-typescript`: 增加商业付款 TypeScript 迁移路线 closeout 要求和验证口径。

## Impact

- Affected OpenSpec:
  - `openspec/specs/web-admin-incremental-typescript/spec.md`
- Affected source code:
  - None. 本 change 只记录和验证最终迁移状态。
- Affected tests:
  - 运行已有商业付款 `.test.tsx` 测试，不新增业务测试。
- Explicitly out of scope:
  - 不迁移或重构全局路由壳、导航壳、backend clients、`BaseListPage`、`Setting`。
  - 不改变真实支付 provider、订单创建、支付跳转、支付回调、支付结果确认、订阅状态流转、购物车写入或交易入账语义。
