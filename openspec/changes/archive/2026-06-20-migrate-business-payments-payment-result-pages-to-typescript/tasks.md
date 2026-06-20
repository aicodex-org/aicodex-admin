## 1. OpenSpec

- [x] 1.1 创建 `migrate-business-payments-payment-result-pages-to-typescript` 的 proposal、design、tasks 和 spec delta。
- [x] 1.2 完成实施前 review，并修复 proposal/design/tasks/spec 中清晰可修的问题。

## 2. 测试先行

- [x] 2.1 新增 `.test.tsx` 聚焦测试，覆盖 `PaymentResultPage` 的付款加载、订阅 pricing/subscription 加载、结果状态渲染、轮询/notify 入口、订单跳转、用户加载和错误提示。
- [x] 2.2 新增 `.test.tsx` 聚焦测试，覆盖 `PaymentListPage` 的付款加载、类型筛选、产品摘要、provider/user/organization 链接、管理员新增、结果入口、编辑/查看和删除。
- [x] 2.3 新增 `.test.tsx` 聚焦测试，覆盖 `PaymentEditPage` 的付款加载、404 跳转、字段更新、个人/组织发票校验、开票/下载入口、保存、保存并退出和删除。

## 3. 页面迁移

- [x] 3.1 将 `/payments/:organizationName/:paymentName/result` 页面 `PaymentResultPage` 迁移为 `.tsx`，保留付款加载、订阅关联加载、状态渲染、轮询/notify、用户余额刷新和订单跳转行为。
- [x] 3.2 将 `/payments` 页面 `PaymentListPage` 迁移为 `.tsx`，保留分页筛选排序、产品摘要、provider/user/organization 链接、价格展示、状态列、结果入口、管理员新增、编辑/查看和删除行为。
- [x] 3.3 将 `/payments/:organizationName/:paymentName` 页面 `PaymentEditPage` 迁移为 `.tsx`，保留付款加载、发票字段、校验顺序、弹窗、开票、下载、保存、保存并退出和删除行为。
- [x] 3.4 按需扩展商业付款局部类型，保持 `PaymentBackend`、`PricingBackend`、`SubscriptionBackend`、`UserBackend`、`BaseListPage`、`Provider` 和 `Setting` legacy JS 边界不变。
- [x] 3.5 确认计划、定价、订阅、交易页面仍保持 legacy JS，不扩大写集。

## 4. 验证

- [x] 4.1 运行 `openspec validate migrate-business-payments-payment-result-pages-to-typescript --strict`、`openspec validate --changes --strict`、`openspec validate --specs --strict`。
- [x] 4.2 运行 `git diff --check`。
- [x] 4.3 在 `web-admin` 运行增量 TypeScript gate、`yarn typecheck`、focused Jest coverage 和 `yarn build`。
- [x] 4.4 在 `verification.md` 记录命令、覆盖率对象、结果、既有 warning 和剩余风险，验证记录保持脱敏。

## 5. 收口

- [x] 5.1 完成归档前 review，确认文档语言、注释、覆盖率、主规格同步和交付单元边界。
- [x] 5.2 archive change 后收敛为单 change commit，push 工作分支，验证通过后 ff-only 合入 `hfl-test-base` 并删除工作分支。
