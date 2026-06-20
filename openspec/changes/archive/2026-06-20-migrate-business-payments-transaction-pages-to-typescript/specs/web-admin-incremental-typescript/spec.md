## ADDED Requirements

### Requirement: 商业付款交易页面渐进迁移
Admin 前端 SHALL 支持将“商业付款”一级菜单下的交易列表、交易编辑、交易表格和交易表格列定义按渐进 TypeScript 路线迁移为 `.tsx`，并保持现有路由、菜单、权限、接口、文案、交易展示、充值入口、敏感信息脱敏和 JS/TS 共存边界兼容。

#### Scenario: 交易 React 页面和表格迁移
- **WHEN** 开发者迁移“商业付款”一级菜单下的交易页面和交易表格
- **THEN** `/transactions` 对应页面 SHALL 使用 `.tsx`
- **AND** `/transactions/:organizationName/:transactionName` 对应页面 SHALL 使用 `.tsx`
- **AND** `table/TransactionTable` SHALL 使用 `.tsx`
- **AND** `table/TransactionTableColumns` SHALL 使用 `.tsx`
- **AND** 迁移 SHALL NOT 要求同一 change 迁移 `CartTable`、`TransactionBackend`、`OrganizationBackend`、`ApplicationBackend`、`UserBackend`、`BaseListPage`、`Setting`、payment provider、真实订单创建、真实支付跳转、真实支付回调、真实支付结果确认、真实订阅状态流转或真实交易入账语义

#### Scenario: 页面行为和运行边界保持不变
- **WHEN** 交易页面和交易表格迁移为 TSX
- **THEN** 迁移 SHALL 保持原有 `ManagementPage` 路由、`enterpriseNavigation` 菜单 key、权限可见性、交易分页筛选排序、新增、充值新增、删除、编辑/查看、保存、保存并退出、取消新增、组织切换、应用选择、用户选择、tag 切换、金额和币种维护、关联 organization/user/application/domain/type/subtype/provider/payment 链接、价格展示和内嵌交易表格展示
- **AND** 迁移 SHALL 保持 `TransactionBackend`、`OrganizationBackend`、`ApplicationBackend`、`UserBackend`、`BaseListPage`、`PaginateSelect` 和 `Setting` 的既有调用契约
- **AND** 迁移 SHALL NOT 修改认证/OIDC、Gateway、真实密钥、生产配置、订单创建语义、支付 provider、支付回调、支付结果确认、订阅状态流转或交易入账语义
- **AND** 测试和验证记录 SHALL NOT 写入 token、secret、Cookie、私有 URL、支付凭据、个人邮箱、手机号或其它敏感字段原值

#### Scenario: 交易迁移测试和验证
- **WHEN** 交易页面和交易表格迁移完成
- **THEN** 本次触碰且包含 JSX 的测试 SHALL 使用 `.test.tsx`
- **AND** 迁移 SHALL 运行增量 TypeScript gate、`yarn typecheck`、focused Jest coverage 和 `yarn build`
- **AND** 覆盖率记录 SHALL 以 touched production files 或等价受影响文件集合为统计对象
- **AND** 测试 SHALL 只 mock 交易列表、交易编辑、充值入口、交易列渲染和跳转入口，不调用真实 payment provider、真实订单支付、真实支付回调、真实订阅状态流转、真实交易入账或真实外部租户环境
