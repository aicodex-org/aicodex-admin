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

#### Scenario: 身份源菜单低风险入口迁移
- **WHEN** 后续 change 触碰身份源菜单下低风险只读 React 区块，例如 `/providers` 中的身份源中心摘要区
- **THEN** 该区块 SHOULD 迁移为 `.tsx` 并使用明确局部类型描述 props、输入数据和派生展示状态
- **AND** 对应 React 测试 SHOULD 使用 `.test.tsx`
- **AND** 迁移 SHALL NOT 要求同一 change 迁移承载它的历史 JS 列表页或无关编辑页

#### Scenario: 组织同步密钥页面迁移
- **WHEN** 后续 change 触碰身份源菜单下的组织同步密钥页面
- **THEN** `OrganizationSyncApiKeyListPage` SHOULD 迁移为 `.tsx` 并使用明确类型描述 props、state、API Key 记录、草稿和操作响应
- **AND** `OrganizationSyncApiKeyBackend` SHOULD 迁移为 `.ts` 并导出页面可复用的请求/响应类型
- **AND** 迁移 SHALL 保持 `/organization-sync-api-keys` 路由、权限、表格列、创建/轮换/禁用/删除操作、一次性明文展示和后端 API 契约
- **AND** 迁移 SHALL NOT 要求归档或重写独立的 `add-organization-sync-api-keys` 功能 change

#### Scenario: 同步器列表页迁移
- **WHEN** 后续 change 触碰身份源菜单下的同步器列表页
- **THEN** `SyncerListPage` SHOULD 迁移为 `.tsx` 并使用明确局部类型描述 props、state、同步器记录、列表 fetch 参数和表格列
- **AND** `SyncerBackend` SHOULD 迁移为 `.ts` 并导出列表页可复用的同步器记录和响应类型
- **AND** 迁移 SHALL 保持 `/syncers` 路由、权限、组织筛选、表格列、分页筛选排序、新增、删除、运行同步和后端 API 契约
- **AND** 迁移 SHALL NOT 要求同一 change 迁移 `SyncerEditPage`、`SyncerTableColumnTable` 或同步器编辑表单

#### Scenario: 组织账号菜单群组列表迁移
- **WHEN** 后续 change 触碰组织账号菜单下的群组列表页
- **THEN** `GroupListPage` SHOULD 迁移为 `.tsx` 并使用明确局部类型描述 props、state、群组记录、上传预览、列表 fetch 参数和表格列
- **AND** `GroupBackend` SHOULD 迁移为 `.ts` 并导出列表页、树页和编辑页可复用的群组记录、mutation 和响应类型
- **AND** 迁移 SHALL 保持 `/groups` 路由、权限、组织筛选、表格列、分页筛选排序、新增、删除、下载模板、上传预览、上传 endpoint 和后端 API 契约
- **AND** 迁移 SHALL NOT 要求同一 change 迁移 `GroupTreePage`、`GroupEditPage`、`UserListPage`、组织列表、用户列表或其它组织账号页面

#### Scenario: TypeScript migration is validated
- **WHEN** identity source menu or organization account menu React components are migrated to TSX
- **THEN** the incremental TypeScript gate, `yarn typecheck`, focused Jest tests, and build or equivalent import-boundary validation SHALL pass for the touched TSX and JS coexistence paths
