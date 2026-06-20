## ADDED Requirements

### Requirement: 商业付款购买与购物车页面渐进迁移
Admin 前端 SHALL 支持将“商业付款”一级菜单下的商品购买页和购物车页按渐进 TypeScript 路线迁移为 `.tsx`，并保持现有路由、菜单、权限、接口、文案、购物车持久化、订单创建入口、支付跳转入口、敏感信息脱敏和 JS/TS 共存边界兼容。

#### Scenario: 购买与购物车 React 页面迁移
- **WHEN** 开发者迁移“商业付款”一级菜单下的商品购买和购物车 React 页面
- **THEN** `/products/:organizationName/:productName/buy` 对应页面 SHALL 使用 `.tsx`
- **AND** `/cart` 对应页面 SHALL 使用 `.tsx`
- **AND** 迁移 SHALL NOT 要求同一 change 迁移 `Order*Page`、`Payment*Page`、`Plan*Page`、`Pricing*Page`、`Subscription*Page`、`Transaction*Page`、`ProductBackend`、`OrderBackend`、`PaymentBackend`、payment provider 或真实支付链路

#### Scenario: 页面行为和运行边界保持不变
- **WHEN** 商品购买页和购物车页迁移为 TSX
- **THEN** 迁移 SHALL 保持原有 `ManagementPage` 路由、`enterpriseNavigation` 菜单 key、权限可见性、商品/pricing/plan 加载、充值金额选择、数量控制、加入购物车、购物车计数、购物车商品补齐、无效项提示、删除/清空、数量更新、总价展示、创建订单入口和支付跳转入口
- **AND** 迁移 SHALL 保持 `ProductBackend`、`PlanBackend`、`PricingBackend`、`OrderBackend`、`UserBackend`、`BaseListPage` 和 `Setting` 的既有调用契约
- **AND** 迁移 SHALL NOT 修改认证/OIDC、Gateway、真实密钥、生产配置、订单创建语义、支付 provider、支付回调、支付结果确认或订阅状态流转
- **AND** 页面 SHALL NOT 新增展示 token、secret、Cookie、私有 URL、支付凭据或其它敏感字段原值

#### Scenario: 迁移测试和验证
- **WHEN** 购买与购物车页面迁移完成
- **THEN** 本次触碰且包含 JSX 的测试 SHALL 使用 `.test.tsx`
- **AND** 迁移 SHALL 运行增量 TypeScript gate、`yarn typecheck`、focused Jest coverage 和 `yarn build`
- **AND** 覆盖率记录 SHALL 以 touched production files 或等价受影响文件集合为统计对象
- **AND** 测试 SHALL 只 mock 订单创建和支付跳转入口，不调用真实 payment provider、真实订单支付或真实外部租户环境
