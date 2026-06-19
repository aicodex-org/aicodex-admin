## ADDED Requirements

### Requirement: 组织树运营页保守迁移
Admin Web 组织账号菜单下的组织树运营页迁移 SHALL 使用增量 TSX/TS 方式保留既有运行时行为，并把页面、专用 API wrapper 和对应 React 测试纳入 TypeScript 验证链路。

#### Scenario: 页面迁移保持组织树运营行为
- **WHEN** `OrganizationTreeOperationsPage` 被迁移为 `.tsx`
- **THEN** 迁移 SHALL 保持 `/organization-tree-operations` 路由入口、组织选择、诊断加载、筛选、树/表视图、刷新动作、部门成员分页抽屉、错误态和空态行为不变
- **AND** 迁移 SHALL NOT 修改组织树运营后端 API、权限、真实组织数据、文案或可见状态分类

#### Scenario: API wrapper 迁移为 TS
- **WHEN** `OrganizationTreeOperationsBackend` 被迁移为 `.ts`
- **THEN** 该 wrapper SHALL 保持原有 API path、HTTP method、query/body 参数、credential 和 `Accept-Language` header 行为不变
- **AND** 该 wrapper SHALL 导出页面或测试可复用的诊断和成员响应类型

#### Scenario: 组织树运营迁移验证
- **WHEN** 组织树运营页 TSX 迁移准备收口
- **THEN** 对应 React 测试 SHOULD 使用 `.test.tsx`
- **AND** 增量 TypeScript gate、`yarn typecheck`、聚焦 Jest/coverage 和 `yarn build` SHALL pass for touched TS/TSX and coexistence paths
