## 1. OpenSpec

- [x] 1.1 创建 `migrate-business-payments-transaction-pages-to-typescript` 的 proposal、design、tasks 和 spec delta。
- [x] 1.2 完成实施前 review，并修复 proposal/design/tasks/spec 中清晰可修的问题。

## 2. 测试先行

- [x] 2.1 新增 `.test.tsx` 聚焦测试，覆盖 `TransactionListPage` 的交易加载、新增、充值新增、删除、编辑/查看入口、权限禁用、链接展示和错误分支。
- [x] 2.2 新增 `.test.tsx` 聚焦测试，覆盖 `TransactionEditPage` 的交易加载、404 跳转、充值模式组织/应用/用户/tag/金额/币种字段、保存、保存并退出、取消新增和删除。
- [x] 2.3 新增 `.test.tsx` 聚焦测试，覆盖 `TransactionTable` 和 `TransactionTableColumns` 的内嵌表格、搜索渲染、组织/用户/应用/domain/type/subtype/provider/payment/amount 链接和 action 分支。

## 3. 页面迁移

- [x] 3.1 将 `/transactions` 页面 `TransactionListPage` 迁移为 `.tsx`，保留分页筛选排序、新增、充值新增、删除、编辑/查看、金额和关联对象展示。
- [x] 3.2 将 `/transactions/:organizationName/:transactionName` 页面 `TransactionEditPage` 迁移为 `.tsx`，保留交易加载、充值模式组织/应用/用户/tag/金额/币种字段、保存、保存并退出和删除行为。
- [x] 3.3 将 `table/TransactionTable` 迁移为 `.tsx`，保留组织编辑页和用户编辑页内嵌交易表格行为。
- [x] 3.4 将 `table/TransactionTableColumns` 迁移为 `.tsx`，保留列定义、链接、排序、筛选和 action render 行为。
- [x] 3.5 按需扩展商业付款局部类型，保持 backend client、`BaseListPage` 和 `Setting` legacy JS 边界不变。
- [x] 3.6 确认 `CartTable.js` 仍保持 legacy JS，不扩大写集。

## 4. 验证

- [x] 4.1 运行 `openspec validate migrate-business-payments-transaction-pages-to-typescript --strict`、`openspec validate --changes --strict`、`openspec validate --specs --strict`。
- [x] 4.2 运行 `git diff --check`。
- [x] 4.3 在 `web-admin` 运行增量 TypeScript gate、`yarn typecheck`、focused Jest coverage 和 `yarn build`。
- [x] 4.4 在 `verification.md` 记录命令、覆盖率对象、结果、既有 warning 和剩余风险，验证记录保持脱敏。

## 5. 收口

- [x] 5.1 完成归档前 review，确认文档语言、注释、覆盖率、主规格同步和交付单元边界。
- [x] 5.2 archive change 后收敛为单 change commit，push 工作分支，验证通过后 ff-only 合入 `hfl-test-base` 并删除工作分支。
