## 验证摘要

本轮验证覆盖计划、定价、订阅页面 TSX 迁移后的 OpenSpec、增量 TypeScript gate、类型检查、聚焦 Jest coverage 和生产构建。验证只使用本地 mock fixture，不调用真实 payment provider、真实订单支付、真实回调、真实订阅状态流转或外部租户环境。

## 命令结果

- `openspec validate migrate-business-payments-plan-pricing-subscription-pages-to-typescript --strict`: 通过。
- `openspec validate --changes --strict`: 归档前通过，5 个 active changes 全部通过；归档并 rebase 到最新 `origin/hfl-test-base` 后通过，4 个 active changes 全部通过。
- `openspec validate --specs --strict`: 通过，26 个 specs 全部通过。
- `git diff --check`: 通过。
- `web-admin> node scripts/check-incremental-typescript-gate.mjs --base origin/hfl-test-base`: 通过，无违规输出。
- `web-admin> yarn typecheck --pretty false`: 通过。
- `web-admin> yarn test --watchAll=false --coverage --collectCoverageFrom=src/PlanListPage.tsx --collectCoverageFrom=src/PlanEditPage.tsx --collectCoverageFrom=src/PricingListPage.tsx --collectCoverageFrom=src/PricingEditPage.tsx --collectCoverageFrom=src/pricing/PricingPage.tsx --collectCoverageFrom=src/SubscriptionListPage.tsx --collectCoverageFrom=src/SubscriptionEditPage.tsx PlanPricingSubscriptionPages.test.tsx`: 通过，10 个测试全部通过。
- `web-admin> yarn build`: 通过，生成产物位于 ignored 的 `web-admin/build/`。
- `git log --oneline origin/hfl-test-base..HEAD`: rebase 后仅包含 1 个本 change commit。

## 覆盖率

覆盖率统计对象为本次触碰的生产 TSX 页面文件：

| 文件 | Statements | Lines |
| --- | ---: | ---: |
| `src/PlanEditPage.tsx` | 93.58% | 93.58% |
| `src/PlanListPage.tsx` | 96.15% | 96.00% |
| `src/PricingEditPage.tsx` | 92.77% | 92.77% |
| `src/PricingListPage.tsx` | 87.27% | 86.79% |
| `src/SubscriptionEditPage.tsx` | 91.95% | 91.95% |
| `src/SubscriptionListPage.tsx` | 88.52% | 88.13% |
| `src/pricing/PricingPage.tsx` | 95.45% | 95.16% |

所有 touched production TSX 文件的 statements/lines 均达到 85% 门槛。

## 已知 warning

- 聚焦 Jest 输出 React 18 下 `ReactDOM.render` legacy warning、AntD `dropdownMatchSelectWidth` deprecated warning 和少量 `act(...)` warning；这些来自既有测试依赖/AntD 交互路径，本 change 没有升级测试库或 AntD API。
- `yarn build` 输出 `fs.F_OK` deprecation、Browserslist 数据过期和 bundle size warning；这些是既有工具链 warning，本 change 未调整依赖、构建配置或代码分包。

## 剩余风险

- 本 change 仅验证前端 TSX 迁移和 mock 下的页面行为，不证明真实支付 provider、真实订单支付、真实支付回调或真实订阅状态流转。
- 本 change 已在 closeout 阶段 rebase 到最新 `origin/hfl-test-base` 并重跑关键验证；后续真实支付链路仍不属于本次 TS 迁移验收范围。
