## Context

商业付款迁移路线已经完成以下页面组：

- 商品目录、商品购买和购物车页面。
- 订单列表、订单编辑和订单支付页面。
- 付款列表、付款编辑和付款结果页面。
- 计划、定价、定价预览和订阅页面。
- 交易列表、交易编辑、交易表格和交易表格列。
- 购物车展示表格 `table/CartTable`。

本 closeout change 用只读扫描和验证证明当前商业付款页面组没有剩余 legacy JS/JSX 页面或共享表格，并把“保留 legacy JS 边界”写入主规格，避免后续误把全局壳或 backend client 当作本路线漏项。

## Goals / Non-Goals

**Goals:**

- 扫描商业付款范围内的页面、共享表格和页面级测试后缀。
- 记录无剩余商业付款 legacy `.js/.jsx` 页面或共享组件的证据。
- 说明全局路由壳、导航壳、backend clients、`BaseListPage` 和 `Setting` 是刻意保留边界。
- 运行 OpenSpec、增量 TS gate、typecheck、商业付款 focused tests 和 build。

**Non-Goals:**

- 不迁移 `ManagementPage.js`、`EntryPage.js`、`enterpriseNavigation.js`、backend clients、`BaseListPage` 或 `Setting`。
- 不删除 `types/legacyPage` 或商业付款页面中仍用于兼容 legacy 基类/JS backend 的局部边界类型。
- 不做视觉重设计、菜单重命名、支付业务语义变更、真实 provider 联调或运行态数据操作。

## Decisions

### 1. closeout change 只记录状态，不做额外代码重构

当前商业付款页面已经全部 TSX。继续为了“纯净”去迁移全局壳、backend clients 或 `BaseListPage` 会明显扩大风险，也违背本路线保留 JS/TS 共存边界的约束。

### 2. 以路径扫描作为完成证据

完成状态用两类扫描共同证明：一类扫描商业付款命名页面/共享表格是否还有 `.js/.jsx`；另一类列出当前 `.ts/.tsx` 文件。该证据比人工记忆更可复查。

### 3. focused tests 覆盖既有业务页面组

closeout 不新增生产代码，也不需要新增低价值测试。验证复用各阶段已经沉淀的商业付款 focused `.test.tsx`，覆盖商品/购物车、订单、付款、计划/定价/订阅、交易和购物车表格。

## Risks / Trade-offs

- [Risk] 路径扫描依赖命名约定。
  → Mitigation: 同时检查 `enterpriseNavigation.js` 和 `ManagementPage.js` 的商业付款路由清单，确认对应页面文件均在 TSX 列表中。

- [Risk] 保留 global JS 壳可能被误解为路线未完成。
  → Mitigation: proposal、design、spec 和 verification 明确列为 out of scope / legacy boundary。

- [Risk] 不删除 legacy 类型边界。
  → Mitigation: 这些边界仍服务于 `BaseListPage`、JS backend client 和 class component 渐进迁移，不属于可安全删除的临时产物。
