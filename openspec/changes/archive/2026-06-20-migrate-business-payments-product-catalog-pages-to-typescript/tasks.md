## 1. OpenSpec

- [x] 1.1 创建 `migrate-business-payments-product-catalog-pages-to-typescript` 的 proposal、design、tasks 和 spec delta。
- [x] 1.2 完成实施前 review，并修复 proposal/design/tasks/spec 中清晰可修的问题。

## 2. 测试先行

- [x] 2.1 新增 `.test.tsx` 聚焦测试，先覆盖 `CartControls` 的数量控件和浮动购物车按钮行为。
- [x] 2.2 新增 `.test.tsx` 聚焦测试，先覆盖商品商店加载、数量选择、加购、重复加购 guard、购物车数量读取和立即购买入口。
- [x] 2.3 新增 `.test.tsx` 聚焦测试，先覆盖商品列表表格、添加、购买、编辑、删除和 fetch 授权失败行为。
- [x] 2.4 新增 `.test.tsx` 聚焦测试，先覆盖商品编辑加载、字段更新、内嵌购买预览、保存成功/失败/异常和删除/取消行为。

## 3. 页面迁移

- [x] 3.1 将 `web-admin/src/common/product/CartControls.js` 迁移为 `CartControls.tsx`，保留 props、disabled/loading、数量更新和点击行为兼容。
- [x] 3.2 将 `/product-store` 页面 `ProductStorePage` 迁移为 `.tsx`，保留商品加载、分页大小、数量状态、加购入口、购物车计数、立即购买和错误提示行为。
- [x] 3.3 将 `/products` 页面 `ProductListPage` 迁移为 `.tsx`，保留商品列表列、添加、删除、购买、编辑/查看、分页筛选排序和权限处理行为。
- [x] 3.4 将 `/products/:organizationName/:productName` 页面 `ProductEditPage` 迁移为 `.tsx`，保留商品加载、字段编辑、provider 选择、充值选项、保存、删除/取消和 `ProductBuyPage` 预览行为。
- [x] 3.5 确认 `ProductBuyPage.js`、`CartListPage.js` 和其它商业付款页面仍通过 legacy 边界正常导入迁移后的 TSX 文件，不扩大写集。

## 4. 验证

- [x] 4.1 运行 `openspec validate migrate-business-payments-product-catalog-pages-to-typescript --strict`、`openspec validate --changes --strict`、`openspec validate --specs --strict`。
- [x] 4.2 运行 `git diff --check`。
- [x] 4.3 在 `web-admin` 运行增量 TypeScript gate、`yarn typecheck`、focused Jest coverage 和 `yarn build`。
- [x] 4.4 在 `verification.md` 记录命令、覆盖率对象、结果、既有 warning 和剩余风险，验证记录保持脱敏。

## 5. 收口

- [x] 5.1 完成归档前 review，确认文档语言、注释、覆盖率、主规格同步和交付单元边界。
- [x] 5.2 archive change 后收敛为单 change commit，push 工作分支，验证通过后 ff-only 合入 `hfl-test-base` 并删除工作分支。
