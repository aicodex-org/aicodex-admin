## ADDED Requirements

### Requirement: Provider 配置页渐进迁移
Admin 前端 SHALL 支持将身份源菜单下的 Provider 配置页和 Provider 字段组件从 legacy JavaScript 渐进迁移为 TypeScript/TSX，并保持现有配置、校验、路由和 JS/TS 共存边界兼容。

#### Scenario: Provider 配置页面和字段组件迁移
- **WHEN** 开发者迁移 Provider 配置页和字段组件
- **THEN** `ProviderEditPage` SHALL 使用 `.tsx`
- **AND** `web-admin/src/provider/*ProviderFields` 和 `LarkProviderGuide` SHALL 使用 `.tsx`
- **AND** `LarkProviderUtils` 和 `WeComProviderUtils` SHALL 使用 `.ts`
- **AND** 本次触碰且包含 JSX 的测试 SHALL 使用 `.test.tsx`，纯逻辑 helper 测试 SHALL 使用 `.test.ts`
- **AND** `ManagementPage.js` 和其它调用方 SHALL continue importing Provider 配置页和字段模块 through existing extensionless paths

#### Scenario: Provider 配置行为保持兼容
- **WHEN** Provider 配置页和字段组件迁移为 TS/TSX
- **THEN** 迁移 SHALL 保持 `/providers/:organizationName/:providerName` 配置页加载、保存、保存并退出、取消、删除、字段编辑、mapping 输入、Lark endpoint mode guide、WeCom/Lark 字段校验和已有错误提示语义不变
- **AND** 迁移 SHALL NOT 修改 OAuth/OIDC/WeCom/Lark 授权 URL、回调参数、登录行为、Provider 可见性、Provider backend API payload、字段持久化语义或生产/类生产配置
- **AND** 迁移 SHALL NOT 要求同一 change 迁移 `LoginPage.js`、`auth/*`、`ProviderBackend.js`、`ManagementPage.js`、`ApplicationEditPage.js`、`SyncerEditPage.js`、`App.js`、`Setting.js` 或 `BaseListPage.js`

#### Scenario: Provider 配置迁移验证
- **WHEN** Provider 配置页和字段组件迁移准备 review
- **THEN** OpenSpec strict validation、增量 TypeScript gate、`yarn typecheck`、聚焦 Jest 测试和 `yarn build` SHALL pass for touched TS/TSX and JS coexistence paths
- **AND** 验证记录 SHALL NOT 包含 token、secret、Cookie、client secret、私有 URL、个人邮箱、手机号或其它敏感字段原值
