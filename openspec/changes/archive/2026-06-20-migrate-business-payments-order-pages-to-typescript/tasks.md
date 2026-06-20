## 1. OpenSpec

- [x] 1.1 创建 `migrate-business-payments-order-pages-to-typescript` 的 proposal、design、tasks 和 spec delta。
- [x] 1.2 完成实施前 review，并修复 proposal/design/tasks/spec 中清晰可修的问题。

## 2. 测试先行

- [x] 2.1 新增 `.test.tsx` 聚焦测试，覆盖 `OrderListPage` 的订单加载、产品摘要、管理员新增、取消、删除、编辑/查看和支付入口。
- [x] 2.2 新增 `.test.tsx` 聚焦测试，覆盖 `OrderEditPage` 的订单加载、产品/付款列表加载、404 跳转、字段更新、保存、保存并退出和删除。
- [x] 2.3 新增 `.test.tsx` 聚焦测试，覆盖 `OrderPayPage` 的订单加载、商品加载、支付渠道展示、普通支付跳转、WeChat JSAPI 分支、二维码支付跳转和失败提示。

## 3. 页面迁移

- [x] 3.1 将 `/orders` 页面 `OrderListPage` 迁移为 `.tsx`，保留分页筛选排序、产品摘要、价格链接、用户链接、状态提示、管理员操作和后端调用契约。
- [x] 3.2 将 `/orders/:organizationName/:orderName` 页面 `OrderEditPage` 迁移为 `.tsx`，保留 route props fallback、加载、编辑、保存、保存并退出、取消新增和删除行为。
- [x] 3.3 将 `/orders/:organizationName/:orderName/pay` 页面 `OrderPayPage` 迁移为 `.tsx`，保留订单/商品加载、支付环境判断、支付按钮、WeChat JSAPI、二维码跳转和错误提示。
- [x] 3.4 按需补充订单链路局部类型，保持 `OrderBackend`、`ProductBackend`、`UserBackend`、`PaymentBackend`、`BaseListPage`、`PaginateSelect` 和 `Setting` legacy JS 边界不变。
- [x] 3.5 确认付款记录、支付结果、计划、定价、订阅、交易页面仍保持 legacy JS，不扩大写集。

## 4. 验证

- [x] 4.1 运行 `openspec validate migrate-business-payments-order-pages-to-typescript --strict`、`openspec validate --changes --strict`、`openspec validate --specs --strict`。
- [x] 4.2 运行 `git diff --check`。
- [x] 4.3 在 `web-admin` 运行增量 TypeScript gate、`yarn typecheck`、focused Jest coverage 和 `yarn build`。
- [x] 4.4 在 `verification.md` 记录命令、覆盖率对象、结果、既有 warning 和剩余风险，验证记录保持脱敏。

## 5. 收口

- [x] 5.1 完成归档前 review，确认文档语言、注释、覆盖率、主规格同步和交付单元边界。
- [x] 5.2 archive change 后收敛为单 change commit，push 工作分支，验证通过后 ff-only 合入 `hfl-test-base` 并删除工作分支。
