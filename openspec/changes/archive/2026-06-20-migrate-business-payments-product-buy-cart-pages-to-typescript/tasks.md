## 1. OpenSpec

- [x] 1.1 创建 `migrate-business-payments-product-buy-cart-pages-to-typescript` 的 proposal、design、tasks 和 spec delta。
- [x] 1.2 完成实施前 review，并修复 proposal/design/tasks/spec 中清晰可修的问题。

## 2. 测试先行

- [x] 2.1 新增 `.test.tsx` 聚焦测试，先覆盖 `ProductBuyPage` 的商品加载、充值金额、数量控制、加入购物车和创建订单入口。
- [x] 2.2 新增 `.test.tsx` 聚焦测试，先覆盖 `CartListPage` 的购物车加载、无效项、数量更新、删除/清空和创建订单入口。

## 3. 页面迁移

- [x] 3.1 将 `/products/:organizationName/:productName/buy` 页面 `ProductBuyPage` 迁移为 `.tsx`，保留 props fallback、query 参数、商品/pricing/plan 加载、充值金额、数量控制、加购、购物车计数和下单跳转行为。
- [x] 3.2 将 `/cart` 页面 `CartListPage` 迁移为 `.tsx`，保留用户购物车加载、商品补齐、无效项提示、表格列、数量更新、删除/清空、总价和下单跳转行为。
- [x] 3.3 按需补充 `types/productCatalog.ts` 中的购买/购物车局部类型，保持 `OrderBackend`、`UserBackend`、`ProductBackend` 等 legacy JS 边界不变。
- [x] 3.4 确认订单、付款、计划、定价、订阅、交易和支付结果页面仍保持 legacy JS，不扩大写集。

## 4. 验证

- [x] 4.1 运行 `openspec validate migrate-business-payments-product-buy-cart-pages-to-typescript --strict`、`openspec validate --changes --strict`、`openspec validate --specs --strict`。
- [x] 4.2 运行 `git diff --check`。
- [x] 4.3 在 `web-admin` 运行增量 TypeScript gate、`yarn typecheck`、focused Jest coverage 和 `yarn build`。
- [x] 4.4 在 `verification.md` 记录命令、覆盖率对象、结果、既有 warning 和剩余风险，验证记录保持脱敏。

## 5. 收口

- [x] 5.1 完成归档前 review，确认文档语言、注释、覆盖率、主规格同步和交付单元边界。
- [x] 5.2 archive change 后收敛为单 change commit，push 工作分支，验证通过后 ff-only 合入 `hfl-test-base` 并删除工作分支。
