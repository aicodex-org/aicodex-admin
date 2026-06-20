## 验证摘要

本 change 只迁移 Admin `web-admin` 商业付款购买与购物车前端页面到 TSX；未调用真实支付 provider，未触发真实订单支付，未修改后端订单/支付/订阅语义。

## 命令与结果

### OpenSpec

- `openspec validate migrate-business-payments-product-buy-cart-pages-to-typescript --strict`
  - 结果：通过，`Change 'migrate-business-payments-product-buy-cart-pages-to-typescript' is valid`
- `openspec validate --changes --strict`
  - 结果：通过，5 个 active changes 全部 passed
- `openspec validate --specs --strict`
  - 结果：通过，26 个 specs 全部 passed

### Git Diff

- `git diff --check`
  - 结果：通过，无 whitespace/error 输出

### 前端 TypeScript

- `web-admin> node scripts/check-incremental-typescript-gate.mjs --base origin/hfl-test-base`
  - 结果：通过，无违规输出
- `web-admin> yarn typecheck --pretty false`
  - 结果：通过，`tsc --noEmit --pretty false` completed

### Jest / Coverage

- `web-admin> yarn test --watchAll=false ProductBuyCartPages.test.tsx`
  - 结果：通过，12 个测试 passed
- `web-admin> yarn test --watchAll=false ProductBuyCartPages.test.tsx ProductCatalogPages.test.tsx`
  - 结果：通过，24 个测试 passed
- `web-admin> yarn test --watchAll=false --coverage --collectCoverageFrom=src/ProductBuyPage.tsx --collectCoverageFrom=src/CartListPage.tsx --collectCoverageFrom=src/ProductEditPage.tsx ProductBuyCartPages.test.tsx ProductCatalogPages.test.tsx`
  - 结果：通过，24 个测试 passed
  - touched production TSX coverage：
    - `ProductBuyPage.tsx`: statements 89.79%，lines 91.03%
    - `CartListPage.tsx`: statements 93.82%，lines 93.52%
    - `ProductEditPage.tsx`: statements 90.90%，lines 90.90%
  - 覆盖率口径：本次触碰生产 TSX 文件 statements/lines 均 >= 85%

### Build

- `web-admin> yarn build`
  - 结果：通过，`Compiled successfully`
  - 既有 warning：
    - Node `fs.F_OK` deprecation warning
    - Browserslist `caniuse-lite is outdated`
    - CRA bundle size recommendation

## 已知测试 Warning

- Jest 运行时有 React 18 legacy `ReactDOM.render` warning；该 warning 来自当前 `@testing-library/react`/React 18 组合，已存在于同类测试，不影响本 change 行为断言。
- AntD Table 运行时提示 `rowKey` 的 `index` 参数 deprecated；这是购物车页既有 rowKey 行为，当前 TS 迁移保持不变，未在本 change 改写表格业务逻辑。
- 上一轮商品目录测试仍会输出 AntD `Card bodyStyle` 和 `Typography.Text ellipsis` warning；属于已有 UI API warning，未由本 change 引入新的业务语义。

## 剩余风险

- 本 change 的订单创建和支付跳转只通过 mock `OrderBackend.placeOrder` 与 `Setting.goToLink` 验证入口契约；真实支付 provider、订单支付状态、支付回调和订阅状态流转仍按后续商业付款页面迁移或运行态验收单独覆盖。
- `CartListPage` 保留 legacy `BaseListPage` 和 AntD Table rowKey 行为；如后续要修复 rowKey deprecation，应另开 UI/表格行为 change，避免混入 TS 迁移。
