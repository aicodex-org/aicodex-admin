## 验证记录

本 change 只迁移商业付款购物车展示表格 `CartTable`，不调用真实 payment provider、真实购物车写入、真实订单支付、真实支付回调、真实订阅状态流转或外部环境。

## RED

- `web-admin> yarn test --watchAll=false CartTable.test.tsx`: 预期失败。`CartTable.test.tsx` 断言 `CartTable.tsx` 存在且 `CartTable.js` 不存在；迁移前收到 `Expected: true, Received: false`。

## GREEN

- `openspec validate migrate-business-payments-cart-table-to-typescript --strict`: 通过。
- `openspec validate --changes --strict`: 通过，5 个 active changes 全部通过。
- `openspec validate --specs --strict`: 通过，26 个 specs 全部通过。
- `git diff --check`: 通过。
- `web-admin> node scripts/check-incremental-typescript-gate.mjs --base origin/hfl-test-base`: 通过。
- `web-admin> yarn typecheck --pretty false`: 通过。
- `web-admin> yarn test --watchAll=false CartTable.test.tsx`: 通过，3 个测试全部通过。
- `web-admin> yarn test --watchAll=false --coverage --collectCoverageFrom=src/table/CartTable.tsx CartTable.test.tsx`: 通过。
- `web-admin> yarn build`: 通过。

## 覆盖率

覆盖率统计对象为本 change 触碰的生产组件 `src/table/CartTable.tsx`：

| File | Statements | Branch | Functions | Lines |
| --- | ---: | ---: | ---: | ---: |
| `CartTable.tsx` | 100% | 75% | 100% | 100% |

Statements 和 lines 均超过 85% 门槛。Branch 低于 85% 但本路线覆盖率门槛按 touched production statements/lines 口径执行；未覆盖分支为表格内部渲染细节，不影响本 change 的展示契约判断。

## 既有提示

- Jest 输出 React 18 `ReactDOM.render is no longer supported` 警告，来自当前测试栈/AntD 组合，非本 change 新增运行时错误。
- `yarn build` 输出 `fs.F_OK` deprecation、Browserslist 数据过期和 bundle size 提示，均为既有构建提示。

## 剩余风险

- 本 change 只验证前端组件和构建层级，不声明真实购物车写入、订单创建、支付 provider、支付回调或订阅状态端到端通过。
- 商业付款路线最终完成前仍需继续扫描是否还有属于商业付款范围的 legacy JS/JSX 页面或共享组件。
