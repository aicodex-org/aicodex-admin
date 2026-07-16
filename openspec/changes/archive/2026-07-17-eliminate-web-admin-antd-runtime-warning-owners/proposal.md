## Why

最新 `origin/hfl-test-base@5b66c580` 的固定环境 non-silent focused Jest 已将 React act 与 FakeTimers 污染清零，但 7 个业务 suite 仍稳定输出 47 条 AntD 5.29.3 production/runtime warning。它们已能逐条映射到真实生产 owner，继续保留会降低控制台诊断信噪比并让后续 AntD 维护误判回归来源，因此应在不升级依赖、不改变业务契约的前提下按当前 API 收口。

## What Changes

- 对 7 个 focused suite 建立不静默 console 的 AntD warning guard；RED 必须由现有 47 条目标 warning 触发，GREEN 必须保持原业务断言并将目标 warning 降为 0。
- 在 `ApplicationEditForm.tsx` 移除空的 InputNumber addon，并把 6 个单位 addon 迁移为当前 `suffix`，保持 150px 输入宽度、数值精度、步长、最小值、格式化与更新回调。
- 在 `ProductStorePage.tsx` 使用 `Card.styles.body`，并把产品详情从不支持多行 ellipsis 的 `Typography.Text` 改为支持相同两行省略语义的 `Typography.Paragraph`。
- 在 `OrderPayPage.tsx` 使用 `Descriptions.styles.label`；在 `FeishuOrganizationSyncPage.tsx` 使用 `Collapse.destroyOnHidden`，保持列语义、展开状态与隐藏后销毁行为。
- 在 `CartListPage.tsx` 去除 `rowKey` 的 index 参数，改用 `name + price + pricingName + planName` 稳定业务身份，继续区分不同充值金额；在 `PaymentResultPage.tsx` 将 spinner 与可见处理中说明组成明确结构，保留加载与可访问语义。
- 更新 Admin 技术债基线，记录本轮 warning owner 已收口；不扩大到未被最新 47 条基线触发的其它 deprecated prop。

### 最新 warning 矩阵

| Suite | 实际条数 | Message | Production owner | 当前 API |
| --- | ---: | --- | --- | --- |
| `ApplicationEditPage` | 21 | InputNumber `addonAfter` deprecated | `ApplicationEditForm.tsx` 7 处 | 空 addon删除；单位使用 `suffix` |
| `ApplicationEditPageUiCustomization` | 2 | 同上 | 同一 `ApplicationEditForm.tsx` | 同上 |
| `ProductCatalogPages` | 7 | Card `bodyStyle` deprecated | `ProductStorePage.tsx` | `styles.body` |
| `ProductCatalogPages` | 7 | Typography.Text 不支持 `rows/expandable` | `ProductStorePage.tsx` | `Typography.Paragraph` 两行 ellipsis |
| `OrderPages` | 6 | Descriptions `labelStyle` deprecated | `OrderPayPage.tsx` | `styles.label` |
| `ProductBuyCartPages` | 2 | Table 二参 `rowKey` deprecated | `CartListPage.tsx` | 单参稳定业务组合键 |
| `PaymentPages` | 1 | 非 nested/fullscreen Spin 不支持 `tip` | `PaymentResultPage.tsx` | spinner + 可见说明结构 |
| `FeishuOrganizationSyncPage` | 1 | Collapse `destroyInactivePanel` deprecated | `FeishuOrganizationSyncPage.tsx` | `destroyOnHidden` |

## Capabilities

### New Capabilities

- `web-admin-antd-runtime-warning-owners`: 定义 AntD 5.29.3 runtime warning 的 owner 映射、当前 API 等价迁移、局部 non-silent 防回退与完整前端/浏览器验收契约。

### Modified Capabilities

无。既有 `web-admin-antd5-deprecation-cleanup` 已要求目标 runtime/deprecated warning 为 0，本 change 以独立 capability 固化本轮 production owner 的具体等价语义。

## Impact

- 生产代码：`ApplicationEditForm.tsx`、`ProductStorePage.tsx`、`OrderPayPage.tsx`、`CartListPage.tsx`、`PaymentResultPage.tsx`、`FeishuOrganizationSyncPage.tsx`。
- 测试：上述 7 个直接 suite、必要的局部 warning 分类 helper/contract；不修改 Jest 全局 config/setup。
- 文档：当前 change OpenSpec 与 `docs/admin-technical-debt-baseline-2026-07-14.md`。
- 依赖/API/后端：`package.json`、`yarn.lock`、AntD/React/Router/Jest/Vite/Playwright、后端 API、schema、权限、认证和运行时配置均不变。
- 并行边界：不修改 `ProviderEditPage`、`ApplicationAccessMenuPages`、`RolePermissionListPages` 及其测试/OpenSpec；不接管 Admin-2 的 setState/unique-key owner。
- 回滚：revert 单个最终 change commit 可恢复旧 prop/结构；没有数据、接口、配置或依赖迁移。
