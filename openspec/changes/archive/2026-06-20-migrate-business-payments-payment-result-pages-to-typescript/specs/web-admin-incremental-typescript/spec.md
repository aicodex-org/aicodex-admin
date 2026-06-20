## ADDED Requirements

### Requirement: 商业付款支付结果与付款记录页面渐进迁移
Admin 前端 SHALL 支持将“商业付款”一级菜单下的支付结果页、付款记录列表页和付款记录编辑页按渐进 TypeScript 路线迁移为 `.tsx`，并保持现有路由、菜单、权限、接口、文案、支付状态展示、付款维护入口、发票动作入口、敏感信息脱敏和 JS/TS 共存边界兼容。

#### Scenario: 付款 React 页面迁移
- **WHEN** 开发者迁移“商业付款”一级菜单下的支付结果与付款记录 React 页面
- **THEN** `/payments/:organizationName/:paymentName/result` 对应页面 SHALL 使用 `.tsx`
- **AND** `/payments` 对应页面 SHALL 使用 `.tsx`
- **AND** `/payments/:organizationName/:paymentName` 对应页面 SHALL 使用 `.tsx`
- **AND** 迁移 SHALL NOT 要求同一 change 迁移 `Plan*Page`、`Pricing*Page`、`Subscription*Page`、`Transaction*Page`、`PaymentBackend`、`PricingBackend`、`SubscriptionBackend`、`UserBackend`、`BaseListPage`、`Provider`、payment provider、真实支付通知、真实支付结果确认、真实支付回调或真实开票

#### Scenario: 页面行为和运行边界保持不变
- **WHEN** 支付结果页、付款记录列表页和付款记录编辑页迁移为 TSX
- **THEN** 迁移 SHALL 保持原有 `ManagementPage` 路由、`enterpriseNavigation` 菜单 key、权限可见性、付款分页筛选排序、产品摘要、provider 链接、用户链接、价格展示、状态提示、结果页入口、新增付款、删除付款、编辑/查看付款、保存、保存并退出、发票字段校验、开票确认弹窗、开票接口入口、发票下载入口、支付结果状态渲染、结果页轮询入口、`notifyPayment` 调用条件、订阅 pricing/subscription 加载、订单跳转和错误提示
- **AND** 迁移 SHALL 保持 `PaymentBackend`、`PricingBackend`、`SubscriptionBackend`、`UserBackend`、`BaseListPage`、`Provider` 和 `Setting` 的既有调用契约
- **AND** 迁移 SHALL NOT 修改认证/OIDC、Gateway、真实密钥、生产配置、支付 provider、支付通知、支付回调、支付结果确认、真实开票、发票校验语义或订阅状态流转
- **AND** 迁移 SHALL 保持既有发票字段展示行为不变
- **AND** 测试和验证记录 SHALL NOT 写入 token、secret、Cookie、私有 URL、支付凭据、个人证件、个人邮箱、手机号或其它敏感字段原值

#### Scenario: 迁移测试和验证
- **WHEN** 支付结果与付款记录页面迁移完成
- **THEN** 本次触碰且包含 JSX 的测试 SHALL 使用 `.test.tsx`
- **AND** 迁移 SHALL 运行增量 TypeScript gate、`yarn typecheck`、focused Jest coverage 和 `yarn build`
- **AND** 覆盖率记录 SHALL 以 touched production files 或等价受影响文件集合为统计对象
- **AND** 测试 SHALL 只 mock 支付结果查询、支付通知入口、付款维护、发票动作和跳转入口，不调用真实 payment provider、真实订单支付、真实支付通知、真实支付回调、真实开票或真实外部租户环境
