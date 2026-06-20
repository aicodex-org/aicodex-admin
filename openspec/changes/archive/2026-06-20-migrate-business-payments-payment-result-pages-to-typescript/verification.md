## 验证摘要

本 change 只验证 Admin 前端支付结果与付款记录页面的 TSX 迁移、页面可观察行为和构建兼容性；未调用真实 payment provider、真实支付通知、真实支付回调或真实开票。

## 命令结果

| 命令 | 结果 |
| --- | --- |
| `openspec validate migrate-business-payments-payment-result-pages-to-typescript --strict` | 通过 |
| `openspec validate --changes --strict` | 通过，5 个 active changes 全部通过 |
| `openspec validate --specs --strict` | 通过，26 个 specs 全部通过 |
| `git diff --check` | 通过 |
| `web-admin> node scripts/check-incremental-typescript-gate.mjs --base origin/hfl-test-base` | 通过 |
| `web-admin> yarn typecheck --pretty false` | 通过 |
| `web-admin> yarn test --watchAll=false PaymentPages.test.tsx` | 通过，8 个测试全部通过 |
| `web-admin> yarn test --watchAll=false --coverage --collectCoverageFrom=src/PaymentResultPage.tsx --collectCoverageFrom=src/PaymentListPage.tsx --collectCoverageFrom=src/PaymentEditPage.tsx PaymentPages.test.tsx` | 通过，8 个测试全部通过 |
| `web-admin> yarn build` | 通过 |

## 覆盖率

覆盖率统计对象为本次触碰的生产 TSX 文件。

| 文件 | Statements | Branches | Functions | Lines |
| --- | ---: | ---: | ---: | ---: |
| `src/PaymentEditPage.tsx` | 89.47% | 78.16% | 68.51% | 89.47% |
| `src/PaymentListPage.tsx` | 95.38% | 76.74% | 88.88% | 95.23% |
| `src/PaymentResultPage.tsx` | 95.23% | 89.39% | 88.00% | 95.23% |
| All files | 92.55% | 80.87% | 78.30% | 92.50% |

## 已知 warning

- 聚焦 Jest 输出 React 18 legacy `ReactDOM.render` warning，来自当前测试库/项目测试基座，不是本 change 新增运行时行为。
- `PaymentResultPage` 的 `Created` 状态渲染会触发 AntD `Spin tip` warning，属于既有 JSX 结构。
- fake timers 输出 `clearTimeout was invoked to clear a native timer`，来自测试中覆盖既有 timeout 清理分支。
- `yarn build` 输出 `fs.F_OK` deprecation、Browserslist 过期和 bundle size 提示，构建最终成功。

## 剩余风险

- 本轮未做浏览器手工验收；自动化覆盖了页面渲染、按钮跳转、轮询/notify 入口、列表操作、发票校验和保存/删除错误分支。
- 本轮不验证真实支付 provider、真实支付通知、真实支付回调或真实开票；这些仍由后端/provider contract 与运行态验收负责。
