## Why

“商业付款”一级菜单下的商品购买、购物车页面、订单、付款、计划、定价、订阅和交易页面已经按渐进 TypeScript 路线迁移到 TSX。当前仍属于商业付款前端展示边界的 legacy React 组件主要剩余 `table/CartTable.js`，它用于展示用户购物车内容，并被 `UserEditPage.tsx` 内嵌复用。

本 change 将 `CartTable` 迁移为 TSX，并补充 `.test.tsx` 覆盖表格渲染、空图片、价格、row key 和空购物车行为，同时保持真实购物车、用户编辑、订单创建、支付和订阅业务语义不变。

## What Changes

- 将 `web-admin/src/table/CartTable.js` 迁移为 `web-admin/src/table/CartTable.tsx`。
- 扩展商业付款共享类型，补充购物车表格实际读取的 cart item 字段。
- 新增或扩展 `.test.tsx` 聚焦测试，覆盖：
  - `CartTable` 使用 TSX 文件并删除同名 JS 文件。
  - 名称、图片链接、价格、数量、详情、row key 和空购物车渲染。
  - 缺失图片时不渲染图片链接。
- 保持 `UserEditPage.tsx` 对 `./table/CartTable` 的 extensionless import 兼容。
- 保持 `CartListPage.tsx`、`ProductBuyPage.tsx`、`UserEditPage.tsx`、`ProductBackend.js`、`OrderBackend.js`、`UserBackend.js`、`BaseListPage` 和 `Setting` 不变。
- 不调用真实 payment provider；不改变真实订单创建、支付跳转、支付回调、支付结果确认、订阅状态流转、购物车写入或用户编辑保存语义。

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `web-admin-incremental-typescript`: 增加“商业付款”购物车表格共享组件的渐进 TypeScript 迁移要求、JS/TS 共存边界和验证要求。

## Impact

- Affected frontend component:
  - `web-admin/src/table/CartTable.js` → `web-admin/src/table/CartTable.tsx`
- Affected shared types:
  - `web-admin/src/types/businessPayment.ts`
- Affected tests:
  - 新增或扩展商业付款购物车 `.test.tsx`
- Explicitly out of scope:
  - `CartListPage.tsx`
  - `ProductBuyPage.tsx`
  - `UserEditPage.tsx`
  - `ProductBackend.js`
  - `OrderBackend.js`
  - `UserBackend.js`
  - `BaseListPage`
  - `Setting`
  - payment provider backend logic、真实购物车写入、真实订单创建、真实支付跳转、真实支付回调、真实支付结果确认、真实订阅状态流转和真实用户编辑保存语义
- Validation:
  - OpenSpec target/changes/specs strict validation
  - `git diff --check`
  - `web-admin` incremental TypeScript gate
  - `yarn typecheck`
  - focused Jest coverage for `CartTable.tsx`
  - `yarn build`
