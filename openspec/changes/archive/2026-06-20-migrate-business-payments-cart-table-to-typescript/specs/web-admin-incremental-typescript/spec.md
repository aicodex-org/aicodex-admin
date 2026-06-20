## ADDED Requirements

### Requirement: 商业付款购物车表格渐进迁移
Admin 前端 SHALL 支持将商业付款购物车展示表格 `table/CartTable` 按渐进 TypeScript 路线迁移为 `.tsx`，并保持现有用户购物车展示、extensionless import、接口、文案、敏感信息脱敏和 JS/TS 共存边界兼容。

#### Scenario: 购物车表格组件迁移
- **WHEN** 开发者迁移商业付款购物车展示表格
- **THEN** `table/CartTable` SHALL 使用 `.tsx`
- **AND** `table/CartTable.js` SHALL NOT remain as the active React component
- **AND** `UserEditPage.tsx` SHALL continue importing `./table/CartTable` through the existing extensionless path
- **AND** 迁移 SHALL NOT 要求同一 change 迁移 `CartListPage`、`ProductBuyPage`、`UserEditPage`、`ProductBackend`、`OrderBackend`、`UserBackend`、`BaseListPage`、`Setting`、payment provider、真实购物车写入、真实订单创建、真实支付跳转、真实支付回调、真实支付结果确认或真实订阅状态流转

#### Scenario: 购物车表格展示行为保持不变
- **WHEN** `CartTable` 接收购物车条目
- **THEN** 迁移 SHALL 保持名称、图片链接、图片 alt、价格、币种符号、数量、详情和 row key 展示行为
- **AND** 当条目没有 `image` 时 SHALL continue rendering an empty image cell instead of a broken link or image
- **AND** 空购物车 SHALL continue rendering a valid AntD table with empty data
- **AND** 迁移 SHALL 保持 `Setting.getCurrencySymbol` 的既有调用契约

#### Scenario: 购物车表格迁移测试和验证
- **WHEN** 购物车表格迁移完成
- **THEN** 本次触碰且包含 JSX 的测试 SHALL 使用 `.test.tsx`
- **AND** 迁移 SHALL 运行增量 TypeScript gate、`yarn typecheck`、focused Jest coverage 和 `yarn build`
- **AND** 覆盖率记录 SHALL 以 touched production files 或等价受影响文件集合为统计对象
- **AND** 测试 SHALL 只 mock 购物车表格展示和货币符号，不调用真实 payment provider、真实订单支付、真实支付回调、真实订阅状态流转、真实购物车写入或真实外部环境
