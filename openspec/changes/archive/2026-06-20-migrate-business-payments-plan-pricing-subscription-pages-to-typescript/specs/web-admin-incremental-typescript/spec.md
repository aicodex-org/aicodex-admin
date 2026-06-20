## ADDED Requirements

### Requirement: 商业付款计划定价订阅页面渐进迁移
Admin 前端 SHALL 支持将“商业付款”一级菜单下的计划列表/编辑、定价列表/编辑、定价预览和订阅列表/编辑页面按渐进 TypeScript 路线迁移为 `.tsx`，并保持现有路由、菜单、权限、接口、文案、计划/定价/订阅维护入口、敏感信息脱敏和 JS/TS 共存边界兼容。

#### Scenario: 计划定价订阅 React 页面迁移
- **WHEN** 开发者迁移“商业付款”一级菜单下的计划、定价和订阅 React 页面
- **THEN** `/plans` 对应页面 SHALL 使用 `.tsx`
- **AND** `/plans/:organizationName/:planName` 对应页面 SHALL 使用 `.tsx`
- **AND** `/pricings` 对应页面 SHALL 使用 `.tsx`
- **AND** `/pricings/:organizationName/:pricingName` 对应页面 SHALL 使用 `.tsx`
- **AND** `pricing/PricingPage` 定价预览组件 SHALL 使用 `.tsx`
- **AND** `/subscriptions` 对应页面 SHALL 使用 `.tsx`
- **AND** `/subscriptions/:organizationName/:subscriptionName` 对应页面 SHALL 使用 `.tsx`
- **AND** 迁移 SHALL NOT 要求同一 change 迁移 `Transaction*Page`、`TransactionTable*`、`PlanBackend`、`PricingBackend`、`SubscriptionBackend`、`ProductBackend`、`UserBackend`、`BaseListPage`、`Setting`、payment provider、真实订单创建、真实支付跳转、真实支付回调、真实支付结果确认或真实订阅状态流转

#### Scenario: 页面行为和运行边界保持不变
- **WHEN** 计划、定价和订阅页面迁移为 TSX
- **THEN** 迁移 SHALL 保持原有 `ManagementPage` 路由、`enterpriseNavigation` 菜单 key、权限可见性、计划/定价/订阅分页筛选排序、新增、删除、编辑/查看、保存、保存并退出、取消新增、组织切换、关联 role/application/plan/pricing/user/payment 链接、价格/币种/周期/试用期/状态/启用开关展示、定价预览 URL 复制和定价预览展示
- **AND** 迁移 SHALL 保持 `PlanBackend`、`PricingBackend`、`SubscriptionBackend`、`ProductBackend`、`UserBackend`、`BaseListPage`、`PaginateSelect` 和 `Setting` 的既有调用契约
- **AND** 迁移 SHALL NOT 修改认证/OIDC、Gateway、真实密钥、生产配置、订单创建语义、支付 provider、支付回调、支付结果确认、发票行为或订阅状态流转
- **AND** 测试和验证记录 SHALL NOT 写入 token、secret、Cookie、私有 URL、支付凭据、个人邮箱、手机号或其它敏感字段原值

#### Scenario: 迁移测试和验证
- **WHEN** 计划、定价和订阅页面迁移完成
- **THEN** 本次触碰且包含 JSX 的测试 SHALL 使用 `.test.tsx`
- **AND** 迁移 SHALL 运行增量 TypeScript gate、`yarn typecheck`、focused Jest coverage 和 `yarn build`
- **AND** 覆盖率记录 SHALL 以 touched production files 或等价受影响文件集合为统计对象
- **AND** 测试 SHALL 只 mock 计划、定价、订阅维护、预览 URL 复制和跳转入口，不调用真实 payment provider、真实订单支付、真实支付回调、真实订阅状态流转或真实外部租户环境
