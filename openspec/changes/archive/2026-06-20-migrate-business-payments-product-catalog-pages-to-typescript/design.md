## Context

Admin 前端已经通过多个 change 迁移了身份源、应用接入、组织账号、LLM AI/Gateway 和管理工具等页面。当前“商业付款”一级菜单仍有多组 legacy JavaScript 页面，其中商品目录类页面是相对低风险的一组：

- `/product-store` 由 `ProductStorePage.js` 承载，展示已发布商品、数量选择、加入购物车和立即购买入口。
- `/products` 和 `/products/:organizationName/:productName` 由 `ProductListPage.js`、`ProductEditPage.js` 承载，负责后台商品列表与编辑。
- `CartControls.js` 提供 `QuantityStepper` 和 `FloatingCartButton`，被商品商店、商品购买页和购物车页复用。
- `ProductBuyPage.js` 同时服务后台购买页和公开购买流程，本次不迁移，只保留现有 JS 调用兼容。

本 change 只改变源文件类型和局部类型声明，不改变商业付款的业务语义、支付 provider、订单状态或真实支付流程。

## Goals / Non-Goals

**Goals:**

- 将 `ProductStorePage`、`ProductListPage`、`ProductEditPage` 和 `CartControls` 迁移为 TSX。
- 使用局部 props、state、record、cart item、API response、table column 和 route params 类型描述本次触碰代码。
- 为迁移页面/控件补充 `.test.tsx` 聚焦测试，覆盖商品商店展示、数量选择、加购入口、商品列表操作、商品编辑和购物车控件。
- 保持 `/product-store`、`/products`、`/products/:organizationName/:productName` 路由和 `enterpriseNavigation` 菜单行为不变。
- 保持 `ProductBuyPage.js`、`CartListPage.js` 和其它商业付款页面作为 legacy JS 调用方可继续导入 TSX 控件。
- 通过 OpenSpec、增量 TS gate、`yarn typecheck`、focused Jest coverage 和 `yarn build` 验证。

**Non-Goals:**

- 不迁移 `ProductBuyPage.js`、`CartListPage.js`、订单、付款、计划、定价、订阅、交易或支付结果页面。
- 不迁移或重构 `ProductBackend.js`、`BaseListPage`、`Setting`、payment provider、真实支付链路、真实密钥、生产配置、Gateway/OIDC/认证相关逻辑。
- 不改变商品购买、支付跳转、购物车持久化、订单创建、支付结果展示或公开购买页行为。
- 不做视觉重设计、菜单重命名或商业付款信息架构调整。

## Decisions

### 1. 以商品目录页面作为迁移边界

本 change 只迁移菜单中商品目录相关的展示、列表、编辑和控件。`ProductBuyPage`、购物车和订单/支付链路留到后续独立 change。

替代方案是一次性迁完整个“商业付款”菜单。该方案会同时触碰购物车、订单、付款、订阅、交易和支付结果页，风险过高，也不符合当前渐进迁移路线。

### 2. 使用局部类型和 legacy 边界

迁移页面沿用现有 class component、`BaseListPage`、JS backend client 和 session storage 模式。页面内使用局部接口描述商品、价格、provider、购物车条目、状态和路由参数；仍为 JS 的后端 client、`ProductBuyPage`、`BaseListPage` 和 shared helpers 使用现有 legacy boundary。

这能让本批页面进入 TypeScript 检查，同时避免为了类型严格而重写旧运行时逻辑。

### 3. CartControls 作为共享 TSX 控件迁移

`QuantityStepper` 和 `FloatingCartButton` 是本批页面直接依赖的展示/交互控件，也被未迁移的 `ProductBuyPage` 和 `CartListPage` 使用。本 change 会迁移控件本身，并通过 props 类型保持 JS 调用方兼容。

如果迁移过程中发现控件需要改变调用约定，先回退为兼容包装或停止评估，不扩大到购买/购物车页面。

### 4. 测试以商品目录行为保持为主

新增聚焦测试覆盖用户可见行为和迁移风险点：

- 商品商店加载已发布商品、展示价格和数量控件。
- 商品商店加购、重复加购 guard、购物车数量读取和立即购买入口保持现有行为。
- 商品列表保留表格列、添加、编辑、购买和删除入口。
- 商品编辑保留加载、字段编辑、保存、删除/取消和内嵌购买预览入口。
- `QuantityStepper` 和 `FloatingCartButton` 保留 disabled、loading、数量变更和点击行为。

测试可以 mock 后端 client 和 `ProductBuyPage`，但断言必须落在页面/控件可见行为和调用契约上，不断言 mock 组件本身作为目标。

## Risks / Trade-offs

- [Risk] `ProductEditPage` 内嵌 `ProductBuyPage.js`，过度类型化可能牵出公开购买流程。
  → Mitigation: `ProductBuyPage` 作为 legacy React component 边界处理，本 change 不修改其实现。

- [Risk] `CartControls` 被购物车页和购买页复用，TSX 迁移可能影响 JS 调用方。
  → Mitigation: props 保持 optional/兼容，保留现有默认值和回调语义，并用测试覆盖数量控件和浮动购物车按钮。

- [Risk] 商品商店包含加入购物车和跳转购买入口，容易误触订单/支付链路。
  → Mitigation: 测试只验证入口调用和 cart data 组装，不调用真实订单、付款或 provider。

- [Risk] 商品编辑页较长，changed-file 覆盖率可能受未触碰分支影响。
  → Mitigation: 优先覆盖高价值行为路径；若无法达到 85%，补充有价值分支测试，不用 mock-only 行覆盖制造数字。
