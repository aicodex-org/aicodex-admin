## Why

“商业付款”商品购买、购物车、订单、付款、计划、定价和订阅链路已经按渐进 TypeScript 路线迁移到 TSX。交易列表、交易编辑和交易表格仍是 legacy JavaScript，并且会被组织编辑页、用户编辑页和商业付款交易菜单复用，是商业付款迁移收尾前的最后核心页面组。

本 change 将交易页面和交易表格迁移到 TSX，并用 `.test.tsx` 覆盖前端可观察行为，同时保持真实交易写入、充值、支付记录、订单、订阅状态和后端业务语义不变。

## What Changes

- 将交易链路 React 页面和共享表格迁移为 TSX：
  - `/transactions` 的 `TransactionListPage`
  - `/transactions/:organizationName/:transactionName` 的 `TransactionEditPage`
  - 组织编辑页和用户编辑页复用的 `table/TransactionTable`
  - 交易表格列定义 `table/TransactionTableColumns`
- 新增交易链路 `.test.tsx` 聚焦测试，覆盖：
  - 交易列表页的新增、充值新增、删除、分页筛选排序 fetch 参数、权限禁用、链接和错误分支。
  - 交易编辑页的加载、404 跳转、充值模式组织/应用/用户/金额/币种字段、保存、保存并退出、取消新增和删除。
  - 交易表格列在组织、用户、应用、domain、type/subtype、provider、payment、amount 和 action 分支上的渲染行为。
- 复用现有 `TransactionBackend`、`OrganizationBackend`、`ApplicationBackend`、`UserBackend`、`BaseListPage`、`PaginateSelect`、`Setting` 和 AntD 组件模式，只补充页面局部类型和商业付款共享类型。
- 保持现有 `ManagementPage` 路由、商业付款菜单、权限可见性、接口调用、文案、充值入口、交易列表/编辑行为和 JS/TS 共存边界不变。
- 不迁移 `CartTable.js`；不重构 backend client；不调用真实 payment provider；不改变真实订单创建、支付跳转、支付回调、支付结果确认、订阅状态流转或交易入账语义。

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `web-admin-incremental-typescript`: 增加“商业付款”交易页面和交易表格的渐进 TypeScript 迁移要求、交易真实业务非目标边界和验证要求。

## Impact

- Affected frontend pages/components:
  - `web-admin/src/TransactionListPage.js` → `web-admin/src/TransactionListPage.tsx`
  - `web-admin/src/TransactionEditPage.js` → `web-admin/src/TransactionEditPage.tsx`
  - `web-admin/src/table/TransactionTable.js` → `web-admin/src/table/TransactionTable.tsx`
  - `web-admin/src/table/TransactionTableColumns.js` → `web-admin/src/table/TransactionTableColumns.tsx`
- Affected shared types:
  - 扩展 `web-admin/src/types/businessPayment.ts`，补充交易记录、组织、应用和用户局部类型。
- Affected tests:
  - 新增交易链路 `.test.tsx`
- Explicitly out of scope:
  - `web-admin/src/table/CartTable.js`
  - `TransactionBackend.js`
  - `OrganizationBackend.js`
  - `ApplicationBackend.js`
  - `UserBackend.js`
  - `BaseListPage`
  - `Setting`
  - payment provider backend logic、真实订单创建、真实支付跳转、真实支付回调、真实支付结果确认、真实订阅状态流转和真实交易入账语义
- Validation:
  - OpenSpec target/changes/specs strict validation
  - `git diff --check`
  - `web-admin` incremental TypeScript gate
  - `yarn typecheck`
  - focused Jest coverage for migrated transaction files
  - `yarn build`
