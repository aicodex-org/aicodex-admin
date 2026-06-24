## ADDED Requirements

### Requirement: Provider 列表页渐进迁移
Admin 前端 SHALL 支持将身份源菜单下的 Provider 列表页从 legacy JavaScript 渐进迁移为 TSX，并在不扩大到 Provider backend、真实认证链路或全局路由壳的前提下保持现有列表行为兼容。

#### Scenario: Provider 列表页面迁移
- **WHEN** 后续 change 触碰 `ProviderListPage`
- **THEN** `ProviderListPage` SHOULD 迁移为 `.tsx` 并使用明确局部类型描述 props、state、Provider 记录、搜索状态、分页状态、列表 fetch 参数和 Ant Design 表格列
- **AND** 对应 React 测试 SHOULD 使用 `.test.tsx`
- **AND** 迁移 SHALL 保持 `/providers` 路由、权限可见性、Provider 列表加载、分页、排序、基础搜索、扩展搜索、新增、编辑、删除和删除确认行为不变
- **AND** 迁移 SHALL NOT 要求同一 change 迁移 `ProviderBackend.js`、`BaseListPage.js`、`AuthSourceCenter.tsx`、`ManagementPage.js`、`enterpriseNavigation.js` 或其它身份源页面

#### Scenario: Provider 列表迁移验证
- **WHEN** `ProviderListPage` 被迁移为 TSX 并准备 review
- **THEN** 增量 TypeScript gate、`yarn typecheck`、聚焦 Jest 测试和 `yarn build` SHALL pass for touched TSX and JS coexistence paths
- **AND** 测试 SHALL 覆盖顶部认证源概览不再渲染、扩展搜索入口和扩展搜索映射到既有 Provider 查询契约
- **AND** 验证记录 SHALL NOT 包含 token、secret、Cookie、client secret、私有 URL、个人邮箱、手机号或其它敏感字段原值
