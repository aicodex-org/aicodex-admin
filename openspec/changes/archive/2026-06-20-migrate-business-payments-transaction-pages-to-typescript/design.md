## Context

上一轮 `migrate-business-payments-plan-pricing-subscription-pages-to-typescript` 已将计划、定价、订阅页面迁移到 TSX。当前商业付款菜单下仍保留 legacy JavaScript 的核心页面主要集中在交易区域和 `CartTable.js`。

当前交易前端边界如下：

- `/transactions` 迁移前由 `TransactionListPage.js` 承载，本 change 后由 `TransactionListPage.tsx` 承载，负责交易分页、筛选、排序、新增测试交易、充值交易、编辑/查看、删除、金额和关联对象展示。
- `/transactions/:organizationName/:transactionName` 迁移前由 `TransactionEditPage.js` 承载，本 change 后由 `TransactionEditPage.tsx` 承载，负责交易加载、充值模式组织/应用/用户/金额/币种维护、保存、保存并退出和取消新增。
- `table/TransactionTable` 迁移前由 `TransactionTable.js` 承载，本 change 后由 `TransactionTable.tsx` 承载，继续被 `OrganizationEditPage.tsx` 和 `UserEditPage.tsx` 内嵌展示。
- `table/TransactionTableColumns` 迁移前由 `TransactionTableColumns.js` 承载，本 change 后由 `TransactionTableColumns.tsx` 承载，继续集中管理交易列、链接、排序、筛选和 action render。

本 change 只改变源文件类型、局部类型声明和测试覆盖，不改变交易 backend API、真实支付、真实订单、真实订阅状态或交易入账规则。

## Goals / Non-Goals

**Goals:**

- 将 `TransactionListPage`、`TransactionEditPage`、`table/TransactionTable` 和 `table/TransactionTableColumns` 迁移为 TSX。
- 使用局部 props、route params、state、transaction、organization、application、user、pagination、select option、table column 和 action option 类型描述本次触碰代码。
- 新增 `.test.tsx` 聚焦测试，覆盖交易列表、交易编辑、充值模式和交易表格列的主要行为与失败分支。
- 保持 `/transactions` 和 `/transactions/:organizationName/:transactionName` 路由、商业付款菜单、权限、接口调用、文案、充值入口、交易表格内嵌行为和可见页面行为不变。
- 保持 `TransactionBackend`、`OrganizationBackend`、`ApplicationBackend`、`UserBackend`、`BaseListPage`、`PaginateSelect` 和 `Setting` 作为 legacy JS 边界。
- 通过 OpenSpec、增量 TS gate、`yarn typecheck`、focused Jest coverage 和 `yarn build` 验证。

**Non-Goals:**

- 不迁移 `CartTable.js`，购物车表格留给后续商业付款 TS 迁移收尾 change。
- 不迁移或重构 `TransactionBackend.js`、`OrganizationBackend.js`、`ApplicationBackend.js`、`UserBackend.js`、`BaseListPage`、`Setting`、payment provider、真实订单创建、真实支付跳转、真实支付通知、真实支付回调、真实支付结果确认、真实密钥、生产配置、Gateway/OIDC/认证相关逻辑。
- 不改变交易新增、充值、保存、删除接口参数、交易状态、金额/币种展示、用户/组织归属、支付记录链接、provider 链接或任何交易入账语义。
- 不做视觉重设计、菜单重命名或商业付款信息架构调整。

## Decisions

### 1. 以交易页面和交易表格作为一个业务页面组

交易列表和交易编辑页共享 `TransactionRecord` 字段，组织编辑页和用户编辑页也通过 `TransactionTable` 展示同一交易列。把页面和表格列放在同一个 change，能避免 TSX 页面继续依赖 legacy JSX 表格列，同时不把购物车表格拉入本轮。

### 2. 使用局部类型和 legacy 后端边界

页面继续沿用 class component、`BaseListPage`、JS backend client、`PaginateSelect` 和 `Setting` 模式。类型只描述本页实际读取和写入的字段，避免为了类型完整性重构 backend client、充值入账或支付 provider。

### 3. 保留交易表格列集中定义

`TransactionTableColumns` 同时服务列表页和内嵌表格。迁移时保留单一列工厂，只给 options、record、column 和回调补类型，避免复制列定义造成交易链接、排序和权限逻辑分叉。

### 4. 测试覆盖用户可观察行为和边界保护

新增测试应覆盖：

- 交易列表页的新增、充值新增、删除、fetch 参数、权限禁用和 action 分支。
- 交易编辑页的交易加载、404 跳转、充值模式组织切换、应用选择、用户选择、tag 切换、金额/币种解析、保存、保存并退出和删除。
- 交易表格列对组织、名称、用户、应用、domain、type/subtype、provider、payment、amount 和删除 action 的渲染分支。

测试可以 mock backend client、`PopconfirmModal`、`PaginateSelect` 和 `Setting`，但断言必须落在可见 UI、调用参数、状态变化和导航契约上，不添加只为覆盖率执行行号的低价值测试。

## Risks / Trade-offs

- [Risk] 列表页继承 `BaseListPage`，表格 column/search/pagination 类型较宽。
  → Mitigation: 用局部兼容类型描述本页依赖的基类能力，不重构 `BaseListPage`。

- [Risk] `TransactionTable` 被组织编辑页和用户编辑页复用，类型过窄可能破坏内嵌展示。
  → Mitigation: `TransactionRecord` 保留索引扩展字段，表格 props 支持现有 `includeUser`、`hideTag` 和 `title` 可选输入。

- [Risk] 充值模式字段会影响管理员手工充值体验。
  → Mitigation: 保留组织切换联动、tag 为 Organization 时清空 user、金额 NaN fallback、币种选项和保存 payload 形状，测试覆盖这些分支。

- [Risk] 覆盖率目标可能诱导测试触碰真实支付或交易入账链路。
  → Mitigation: 覆盖率只统计 touched TSX 页面/组件，交易新增/充值/保存/删除用 backend mock response 验证，不调用真实 payment provider 或真实外部环境。
