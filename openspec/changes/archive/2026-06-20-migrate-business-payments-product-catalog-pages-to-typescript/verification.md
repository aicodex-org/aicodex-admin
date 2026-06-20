## 验证摘要

本 change 只迁移商业付款商品目录类页面和共用控件到 TSX，不调用真实支付 provider，不触发订单、付款、订阅、交易或认证链路。

## OpenSpec

- `openspec validate migrate-business-payments-product-catalog-pages-to-typescript --strict`：通过，目标 change valid。
- `openspec validate --changes --strict`：通过，5 个 active changes 全部 valid。
- `openspec validate --specs --strict`：通过，26 个 specs 全部 valid。

## Diff

- `git diff --check`：通过，无 whitespace error。

## 前端 TypeScript

- `web-admin> node scripts/check-incremental-typescript-gate.mjs --base origin/hfl-test-base`：通过，无输出。
- `web-admin> yarn typecheck --pretty false`：通过，`tsc --noEmit` 成功。

## 聚焦 Jest 和覆盖率

命令：

```powershell
yarn test ProductCatalogPages.test.tsx --watchAll=false --runInBand --coverage --collectCoverageFrom=src/ProductStorePage.tsx --collectCoverageFrom=src/ProductListPage.tsx --collectCoverageFrom=src/ProductEditPage.tsx --collectCoverageFrom=src/common/product/CartControls.tsx
```

结果：通过，12 个测试全部通过。覆盖率统计对象为本次触碰的生产 TSX 文件：

| 文件 | Statements | Lines |
| --- | ---: | ---: |
| `src/ProductStorePage.tsx` | 91.08% | 90.90% |
| `src/ProductListPage.tsx` | 98.38% | 98.33% |
| `src/ProductEditPage.tsx` | 90.90% | 90.90% |
| `src/common/product/CartControls.tsx` | 100.00% | 100.00% |
| touched files 汇总 | 92.91% | 92.88% |

已覆盖的主要行为包括：商品商店加载、数量选择、加入购物车、重复加购 guard、购物车数量读取、立即购买入口、商品列表列渲染、添加、购买、编辑/查看、删除、授权失败、默认组织查询、移动端 action fixed 分支、商品编辑加载、字段更新、provider 过滤、保存校验、保存成功/失败/异常、删除/取消和 `ProductBuyPage.js` legacy 预览边界。

Jest 输出存在既有 warning：

- React 18 下旧版 `@testing-library/react` 仍使用 `ReactDOM.render`。
- AntD `Card.bodyStyle` 已 deprecated。
- AntD `Typography.Text` 的 `ellipsis.rows` warning。

这些 warning 来自既有组件/依赖行为，本 change 为保守 TSX 迁移，没有改视觉和组件 API。

## 前端 Build

- `web-admin> yarn build`：通过，`Compiled successfully`，`mv.js` 成功把 `build-temp` 重命名为 `build`。

Build 输出存在既有 warning：

- Node `fs.F_OK` deprecation warning。
- Browserslist `caniuse-lite is outdated` warning。
- bundle size 超推荐值提示。

这些 warning 不由本 change 引入；本 change 未修改依赖、构建配置或 bundle 拆分策略。

## 运行态口径

本 change 的验收证据为源码级和构建级：OpenSpec 校验、增量 TypeScript gate、typecheck、聚焦 Jest/coverage 和 production build。未进行真实支付、真实订单、真实 provider credential 或生产/类生产运行态验证，因为它们均在本 change 非目标范围内。

## 剩余风险

- `ProductBuyPage.js`、购物车页面、订单/付款/订阅/交易页面仍是 legacy JS，后续商业付款迁移需要按独立 change 继续推进。
- `ProductBackend.js`、`BaseListPage`、`Setting` 仍是 legacy JS 边界，本 change 只通过局部类型和 `LegacyAny` 兼容它们。
