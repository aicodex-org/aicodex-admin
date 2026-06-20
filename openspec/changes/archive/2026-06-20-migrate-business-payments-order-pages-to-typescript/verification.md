## 验证摘要

本 change 只做“商业付款”订单链路页面的渐进 TypeScript 迁移，不调用真实 payment provider、不触发真实订单支付、不验证真实支付回调或订阅状态流转。

## 命令与结果

- `openspec validate migrate-business-payments-order-pages-to-typescript --strict`
  - 结果：通过，`Change 'migrate-business-payments-order-pages-to-typescript' is valid`
- `openspec validate --changes --strict`
  - 结果：通过，5 个 active changes 全部通过
- `openspec validate --specs --strict`
  - 结果：通过，26 个 specs 全部通过
- `git diff --check`
  - 结果：通过，无 whitespace error
- `web-admin> node scripts/check-incremental-typescript-gate.mjs --base origin/hfl-test-base`
  - 结果：通过，无新增不符合增量 TypeScript 约定的 React JS/JSX 或 JSX `.test.js`
- `web-admin> yarn typecheck --pretty false`
  - 结果：通过，`tsc --noEmit --pretty false`
- `web-admin> yarn test --watchAll=false --coverage --collectCoverageFrom=src/OrderListPage.tsx --collectCoverageFrom=src/OrderEditPage.tsx --collectCoverageFrom=src/OrderPayPage.tsx OrderPages.test.tsx`
  - 结果：通过，11 个测试全部通过
  - 覆盖率对象：本 change 触碰的订单链路生产 TSX 文件
  - 覆盖率结果：
    - `OrderListPage.tsx`: statements 98.59%，lines 98.55%
    - `OrderEditPage.tsx`: statements 86.48%，lines 86.48%
    - `OrderPayPage.tsx`: statements 98.82%，lines 98.80%
- `web-admin> yarn build`
  - 结果：通过，`Compiled successfully.`

## 已知 warning

- Jest 输出 React 18 legacy `ReactDOM.render` warning，来自当前测试环境仍按 React 17 兼容模式渲染。
- Jest 输出 AntD `Descriptions labelStyle` deprecation warning，来自订单支付页既有 `Descriptions` 写法；本 change 不做视觉/组件 API 重构。
- `yarn build` 输出 `fs.F_OK` deprecation warning、Browserslist `caniuse-lite` 旧数据提示和 bundle size 提示，均为现有构建环境警告。

## 剩余风险

- 本 change 的支付页验证只覆盖前端 provider 分支、跳转和 WeChat JSAPI 调用入口；不调用真实外部支付 provider，不证明真实支付成功或回调成功。
- 付款记录、支付结果、计划、定价、订阅和交易页面仍是 legacy JS，按路线后续 change 逐步迁移。
