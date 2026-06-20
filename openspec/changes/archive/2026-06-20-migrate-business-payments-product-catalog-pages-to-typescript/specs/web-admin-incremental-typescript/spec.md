## ADDED Requirements

### Requirement: 商业付款商品目录页面渐进迁移
Admin 前端 SHALL 支持将“商业付款”一级菜单下的商品商店、商品列表、商品编辑和商品目录共用控件按渐进 TypeScript 路线迁移为 `.tsx`，并保持现有路由、菜单、权限、接口、文案、商品展示、加购入口、编辑保存、敏感信息脱敏和 JS/TS 共存边界兼容。

#### Scenario: 商品目录 React 页面和控件迁移
- **WHEN** 开发者迁移“商业付款”一级菜单下的商品目录类 React 页面和控件
- **THEN** `/product-store`、`/products`、`/products/:organizationName/:productName` 对应页面 SHALL 使用 `.tsx`
- **AND** `common/product/CartControls` SHALL 使用 `.tsx`
- **AND** 迁移 SHALL NOT 要求同一 change 迁移 `ProductBuyPage`、`CartListPage`、订单、付款、计划、定价、订阅、交易、支付结果、公开购买页、`ProductBackend`、payment provider 或真实支付链路

#### Scenario: 页面行为和运行边界保持不变
- **WHEN** 商品目录页面迁移为 TSX
- **THEN** 迁移 SHALL 保持原有 `ManagementPage` 路由、`enterpriseNavigation` 菜单 key、权限可见性、商品列表分页筛选排序、商品商店加载、数量选择、加入购物车入口、立即购买入口、商品编辑保存、删除/取消和后端 API 调用契约
- **AND** 迁移 SHALL 保持 `ProductBuyPage.js`、`CartListPage.js` 等 legacy JS 调用方对 `CartControls` 和商品数据的现有调用兼容
- **AND** 迁移 SHALL NOT 修改认证/OIDC、Gateway、真实密钥、生产配置、订单创建、支付跳转、支付结果或 provider credential 行为
- **AND** 页面 SHALL NOT 新增展示 token、secret、Cookie、私有 URL、支付凭据或其它敏感字段原值

#### Scenario: 迁移测试和验证
- **WHEN** 商品目录页面迁移完成
- **THEN** 本次触碰且包含 JSX 的测试 SHALL 使用 `.test.tsx`
- **AND** 迁移 SHALL 运行增量 TypeScript gate、`yarn typecheck`、focused Jest coverage 和 `yarn build`
- **AND** 覆盖率记录 SHALL 以 touched production files 或等价受影响文件集合为统计对象
