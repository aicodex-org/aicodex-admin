## Context

商业付款 TS 迁移已经覆盖主要页面组。当前仍保留 legacy JavaScript 的商业付款展示组件是 `web-admin/src/table/CartTable.js`：

- 组件展示 cart item 的 `displayName`、`image`、`price`、`currency`、`quantity` 和 `detail`。
- 组件通过 `rowKey={(record) => `${record.owner}/${record.name}`}` 保持表格行 key。
- 组件目前只被 `UserEditPage.tsx` 通过 `./table/CartTable` extensionless import 内嵌使用。

本 change 只迁移该展示组件本身，不改变购物车写入、用户保存、订单创建或支付 provider 逻辑。

## Goals / Non-Goals

**Goals:**

- 将 `table/CartTable` 从 legacy JS 迁移为 TSX。
- 使用商业付款共享类型描述 cart item 和表格 props。
- 用 `.test.tsx` 覆盖 `CartTable` 的展示行为、空态和文件迁移状态。
- 保持 `UserEditPage.tsx` 现有 extensionless import、购物车内嵌展示和 JS/TS 共存边界不变。
- 通过 OpenSpec、增量 TS gate、`yarn typecheck`、focused Jest coverage 和 `yarn build` 验证。

**Non-Goals:**

- 不迁移或重构 `CartListPage.tsx`、`ProductBuyPage.tsx`、`UserEditPage.tsx`、`ProductBackend.js`、`OrderBackend.js`、`UserBackend.js`、`BaseListPage`、`Setting`。
- 不改变 cart item 数据结构、购物车写入、用户编辑保存、订单创建、支付跳转、支付回调、支付结果确认、订阅状态流转或真实 payment provider 语义。
- 不做视觉重设计、表格列重排、菜单重命名或商业付款信息架构调整。

## Decisions

### 1. 将 `CartTable` 作为商业付款共享组件收尾

`CartTable` 不直接挂在商业付款菜单路由上，但它展示的是用户购物车数据，属于商品购买/购物车链路的共享展示组件。单独迁移它可以清掉商业付款范围内最后一个明确的 legacy React 表格组件，同时避免把用户编辑页整体纳入本 change。

### 2. 只给组件实际读取字段建类型

`CartTable` 只读取购物车展示字段，不负责后端 cart schema 或订单 payload 真值。类型使用 `BusinessPaymentCartItem` 描述本组件实际依赖字段，并保留索引扩展字段，避免为了类型完整性重构 backend client 或 user model。

### 3. 测试聚焦展示契约

测试覆盖用户可观察的表格输出和关键分支：有图片时展示外链和图片 alt；无图片时返回空内容；价格使用 `Setting.getCurrencySymbol`；row key 保持 `owner/name`；空购物车可渲染空表。测试只 mock 货币符号，不调用真实购物车、订单或支付接口。

## Risks / Trade-offs

- [Risk] `CartTable` 被 `UserEditPage.tsx` 复用，过窄 props 类型可能破坏现有传参。
  → Mitigation: props 只要求可选 `cart` 数组；cart item 保留索引扩展字段；extensionless import 不变。

- [Risk] 购物车真实结构可能比表格展示字段更宽。
  → Mitigation: 类型只声明展示读取字段，不把它写成后端或 user model 的完整 truth schema。

- [Risk] 该 change 很小，容易被误解为完成全部商业付款 TS 收尾。
  → Mitigation: proposal 和 verification 中明确本 change 只迁移 `CartTable`；最终路线完成仍需单独扫描商业付款剩余 legacy JS。
