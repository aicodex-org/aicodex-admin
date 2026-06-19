## ADDED Requirements

### Requirement: 组织目录质量页保守迁移
Admin Web 组织账号菜单下的目录质量页迁移 SHALL 使用增量 TSX 方式保留既有目录质量诊断、修复预览和只读审计行为，并把页面和对应 React 测试纳入 TypeScript 验证链路。

#### Scenario: 页面迁移保持目录质量行为
- **WHEN** `OrganizationDirectoryQualityPage` 被迁移为 `.tsx`
- **THEN** 迁移 SHALL 保持 `/organization-directory-quality` 路由入口、组织选择、实体类型筛选、质量状态筛选、原因筛选、生命周期筛选、列表分页、导出、详情 Drawer、错误态和空态行为不变
- **AND** 迁移 SHALL NOT 修改目录质量后端 API、权限、真实组织数据、文案或可见状态分类

#### Scenario: 局部类型覆盖目录质量响应
- **WHEN** 页面调用 `PlatformApiMappingBackend` 中的目录质量和修复预览接口
- **THEN** 页面 SHALL 使用局部 TypeScript 类型描述列表项、摘要、修复计划、action draft、preflight、审批预览、审计、operator note readiness、筛选和分页状态
- **AND** 本迁移 SHALL NOT 要求同一 change 迁移共享 `PlatformApiMappingBackend.js`

#### Scenario: 目录质量迁移验证
- **WHEN** 目录质量页 TSX 迁移准备收口
- **THEN** 对应 React 测试 SHOULD 使用 `.test.tsx`
- **AND** 增量 TypeScript gate、`yarn typecheck`、聚焦 Jest/coverage 和 `yarn build` SHALL pass for touched TSX and JS coexistence paths
