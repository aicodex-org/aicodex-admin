## ADDED Requirements

### Requirement: 商业付款 TypeScript 迁移路线收尾
Admin 前端 SHALL 为 Business & Payments 渐进 TypeScript 迁移提供收尾证据，证明菜单所属页面、页面级测试和路由所属共享表格组件已迁移到 `.ts` / `.tsx` / `.test.tsx`，并保留明确的 JS/TS 共存边界。

#### Scenario: 商业付款页面和共享组件无剩余 legacy React 文件
- **WHEN** 商业付款 TypeScript 迁移路线收尾
- **THEN** 收尾证据 SHALL 扫描 `Product`、`Cart`、`Order`、`Payment`、`Plan`、`Pricing`、`Subscription`、`Transaction` 页面、表格和页面级测试路径中剩余的 `.js` 或 `.jsx` React 文件
- **AND** 扫描结果 SHALL 表明没有仍需本路线迁移的 Business & Payments 菜单所属页面或路由所属共享表格组件
- **AND** 收尾证据 SHALL 列出当前覆盖这些页面和组件的 `.ts` / `.tsx` / `.test.tsx` 文件

#### Scenario: 保留 legacy JS 边界
- **WHEN** 收尾证据发现全局壳或 backend client JavaScript
- **THEN** `ManagementPage.js`、`EntryPage.js` 和 `enterpriseNavigation.js` SHALL 被视为本 Business & Payments 迁移路线之外的全局路由/导航壳
- **AND** `ProductBackend.js`、`OrderBackend.js`、`PaymentBackend.js`、`PlanBackend.js`、`PricingBackend.js`、`SubscriptionBackend.js`、`TransactionBackend.js`、`UserBackend.js`、`BaseListPage` 和 `Setting` SHALL 继续作为明确的 legacy 边界保留，除非后续 change 单独限定它们的迁移范围
- **AND** 收尾 SHALL NOT 修改 payment provider 行为、订单创建、支付跳转、回调处理、支付结果确认、订阅状态流转、购物车持久化、交易入账、凭据、生产配置、Gateway、OIDC 或认证行为

#### Scenario: closeout 验证
- **WHEN** the Business & Payments migration closeout is ready
- **THEN** OpenSpec changes/specs validation、`git diff --check`、增量 TypeScript gate、`yarn typecheck`、Business & Payments focused `.test.tsx` tests 和 `yarn build` SHALL 通过，或记录明确 blocker
- **AND** 验证记录 SHALL 不包含 token、secret、Cookie、私有 URL、支付凭据、个人邮箱、手机号或其它敏感字段原值
