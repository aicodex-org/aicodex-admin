## 1. OpenSpec

- [x] 1.1 创建 `migrate-business-payments-plan-pricing-subscription-pages-to-typescript` 的 proposal、design、tasks 和 spec delta。
- [x] 1.2 完成实施前 review，并修复 proposal/design/tasks/spec 中清晰可修的问题。

## 2. 测试先行

- [x] 2.1 新增 `.test.tsx` 聚焦测试，覆盖 `PlanListPage` 的计划加载、新增、删除、编辑/查看入口、权限禁用、价格/角色/商品展示和错误分支。
- [x] 2.2 新增 `.test.tsx` 聚焦测试，覆盖 `PlanEditPage` 的计划加载、404 跳转、组织切换、角色/provider 选项、字段更新、保存、保存并退出和删除。
- [x] 2.3 新增 `.test.tsx` 聚焦测试，覆盖 `PricingListPage` 的定价加载、新增、删除、计划链接、应用链接、编辑/查看入口、权限禁用和错误分支。
- [x] 2.4 新增 `.test.tsx` 聚焦测试，覆盖 `PricingEditPage` 和 `pricing/PricingPage` 的定价加载、组织切换、应用/计划选项、复制预览 URL、预览展示、保存、保存并退出和删除。
- [x] 2.5 新增 `.test.tsx` 聚焦测试，覆盖 `SubscriptionListPage` 的订阅加载、新增、删除、状态渲染、用户/计划/付款链接、编辑/查看入口、权限禁用和错误分支。
- [x] 2.6 新增 `.test.tsx` 聚焦测试，覆盖 `SubscriptionEditPage` 的订阅加载、404 跳转、组织切换、用户/pricing/plan 选项、时间/状态字段更新、保存、保存并退出和删除。

## 3. 页面迁移

- [x] 3.1 将 `/plans` 页面 `PlanListPage` 迁移为 `.tsx`，保留分页筛选排序、新增、删除、编辑/查看、角色/商品链接、价格和启用状态展示。
- [x] 3.2 将 `/plans/:organizationName/:planName` 页面 `PlanEditPage` 迁移为 `.tsx`，保留计划加载、组织/角色/provider 选项、价格/周期/币种/启用/独占字段、保存、保存并退出和删除行为。
- [x] 3.3 将 `/pricings` 页面 `PricingListPage` 迁移为 `.tsx`，保留分页筛选排序、新增、删除、应用链接、计划链接、编辑/查看和启用状态展示。
- [x] 3.4 将 `/pricings/:organizationName/:pricingName` 页面 `PricingEditPage` 迁移为 `.tsx`，保留定价加载、组织/应用/计划选项、试用期、启用开关、预览 URL 复制、保存、保存并退出和删除行为。
- [x] 3.5 将 `pricing/PricingPage` 迁移为 `.tsx`，保留定价预览展示和选择计划入口。
- [x] 3.6 将 `/subscriptions` 页面 `SubscriptionListPage` 迁移为 `.tsx`，保留分页筛选排序、新增、删除、时间、用户/计划/付款链接、状态展示和编辑/查看行为。
- [x] 3.7 将 `/subscriptions/:organizationName/:subscriptionName` 页面 `SubscriptionEditPage` 迁移为 `.tsx`，保留订阅加载、组织/用户/pricing/plan 选项、时间、周期、付款、描述、状态、保存、保存并退出和删除行为。
- [x] 3.8 按需扩展商业付款局部类型，保持 backend client、`BaseListPage` 和 `Setting` legacy JS 边界不变。
- [x] 3.9 确认交易页面和交易表格仍保持 legacy JS，不扩大写集。

## 4. 验证

- [x] 4.1 运行 `openspec validate migrate-business-payments-plan-pricing-subscription-pages-to-typescript --strict`、`openspec validate --changes --strict`、`openspec validate --specs --strict`。
- [x] 4.2 运行 `git diff --check`。
- [x] 4.3 在 `web-admin` 运行增量 TypeScript gate、`yarn typecheck`、focused Jest coverage 和 `yarn build`。
- [x] 4.4 在 `verification.md` 记录命令、覆盖率对象、结果、既有 warning 和剩余风险，验证记录保持脱敏。

## 5. 收口

- [x] 5.1 完成归档前 review，确认文档语言、注释、覆盖率、主规格同步和交付单元边界。
- [x] 5.2 archive change 后收敛为单 change commit，push 工作分支，验证通过后 ff-only 合入 `hfl-test-base` 并删除工作分支。
