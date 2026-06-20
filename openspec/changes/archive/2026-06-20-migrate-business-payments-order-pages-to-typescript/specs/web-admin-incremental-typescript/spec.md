## ADDED Requirements

### Requirement: 商业付款订单链路页面渐进迁移
Admin 前端 SHALL 支持将“商业付款”一级菜单下的订单列表页、订单编辑页和订单支付页按渐进 TypeScript 路线迁移为 `.tsx`，并保持现有路由、菜单、权限、接口、文案、订单状态展示、订单维护入口、支付发起入口、敏感信息脱敏和 JS/TS 共存边界兼容。

#### Scenario: 订单 React 页面迁移
- **WHEN** 开发者迁移“商业付款”一级菜单下的订单链路 React 页面
- **THEN** `/orders` 对应页面 SHALL 使用 `.tsx`
- **AND** `/orders/:organizationName/:orderName` 对应页面 SHALL 使用 `.tsx`
- **AND** `/orders/:organizationName/:orderName/pay` 对应页面 SHALL 使用 `.tsx`
- **AND** 迁移 SHALL NOT 要求同一 change 迁移 `Payment*Page`、`Plan*Page`、`Pricing*Page`、`Subscription*Page`、`Transaction*Page`、`OrderBackend`、`PaymentBackend`、payment provider、真实支付结果确认或真实支付回调

#### Scenario: 页面行为和运行边界保持不变
- **WHEN** 订单列表、编辑和支付页面迁移为 TSX
- **THEN** 迁移 SHALL 保持原有 `ManagementPage` 路由、`enterpriseNavigation` 菜单 key、权限可见性、订单分页筛选排序、产品摘要、价格链接、用户链接、状态提示、新增订单、取消订单、删除订单、编辑/查看订单、保存、保存并退出、取消新增、订单和商品加载、支付环境判断、支付渠道展示、支付按钮、二维码支付跳转、WeChat JSAPI 调用入口和错误提示
- **AND** 迁移 SHALL 保持 `OrderBackend`、`ProductBackend`、`UserBackend`、`PaymentBackend`、`BaseListPage`、`PaginateSelect` 和 `Setting` 的既有调用契约
- **AND** 迁移 SHALL NOT 修改认证/OIDC、Gateway、真实密钥、生产配置、订单创建语义、支付 provider、支付回调、支付结果确认或订阅状态流转
- **AND** 页面 SHALL NOT 新增展示 token、secret、Cookie、私有 URL、支付凭据或其它敏感字段原值

#### Scenario: 迁移测试和验证
- **WHEN** 订单链路页面迁移完成
- **THEN** 本次触碰且包含 JSX 的测试 SHALL 使用 `.test.tsx`
- **AND** 迁移 SHALL 运行增量 TypeScript gate、`yarn typecheck`、focused Jest coverage 和 `yarn build`
- **AND** 覆盖率记录 SHALL 以 touched production files 或等价受影响文件集合为统计对象
- **AND** 测试 SHALL 只 mock 订单维护、支付发起和支付跳转入口，不调用真实 payment provider、真实订单支付、真实支付回调或真实外部租户环境
