## MODIFIED Requirements

### Requirement: 后续新增代码约定
Admin 前端后续新增 React 组件 SHALL 默认使用 `.tsx`；新增共享逻辑、接口模型和类型定义 SHALL 默认使用 `.ts`；既有 JS SHALL 只在被需求触及时渐进迁移。

#### Scenario: 新增 React 组件
- **WHEN** 后续 change 为 `web-admin` 新增 React 组件
- **THEN** 该组件 SHALL 默认使用 `.tsx`
- **AND** 如果继续使用 `.js`，change 文档或代码 review 记录 SHALL 说明原因

#### Scenario: 新增共享逻辑或接口模型
- **WHEN** 后续 change 新增共享工具函数、接口模型、类型定义或前后端数据结构描述
- **THEN** 新文件 SHALL 默认使用 `.ts`
- **AND** 该文件 SHALL 避免无解释 `any`

#### Scenario: 渐进迁移历史 JS
- **WHEN** 后续需求触及既有 JS 文件且迁移成本可控
- **THEN** 开发者 MAY 将该文件渐进迁移为 `.ts` 或 `.tsx`
- **AND** 迁移 SHALL 保持原有运行时行为、路由、权限和接口契约兼容

#### Scenario: 组织账号菜单组织列表迁移
- **WHEN** 后续 change 触碰组织账号菜单下的组织列表页
- **THEN** `OrganizationListPage` SHOULD 迁移为 `.tsx` 并使用明确局部类型描述 props、state、组织记录、默认组织模板、列表 fetch 参数和表格列
- **AND** `OrganizationBackend` SHOULD 迁移为 `.ts` 并导出列表页、编辑页、用户页、选择组件和登录页可复用的组织记录、mutation 和响应类型
- **AND** 迁移 SHALL 保持 `/organizations` 路由、权限、组织筛选、表格列、分页筛选排序、新增、删除、组织身份中心摘要、群组/用户/编辑跳转和后端 API 契约
- **AND** 迁移 SHALL NOT 要求同一 change 迁移 `OrganizationEditPage`、`OrganizationTreeOperationsPage`、`OrganizationDirectoryQualityPage`、`UserListPage`、`GroupTreePage` 或其它组织账号页面

#### Scenario: TypeScript migration is validated
- **WHEN** identity source menu or organization account menu React components are migrated to TSX
- **THEN** the incremental TypeScript gate, `yarn typecheck`, focused Jest tests, and build or equivalent import-boundary validation SHALL pass for the touched TSX and JS coexistence paths
