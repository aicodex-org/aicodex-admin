## ADDED Requirements

### Requirement: 权限角色 Casbin 适配器页渐进迁移
`web-admin` SHALL support migrating the Authorization menu Casbin adapter pages from legacy JavaScript to TSX while preserving existing adapter list, adapter edit, route, permission, API, database connection test, and navigation behavior.

#### Scenario: Casbin 适配器页面路由和导入保持兼容
- **WHEN** `AdapterListPage` and `AdapterEditPage` are migrated to `.tsx`
- **THEN** `ManagementPage.js` SHALL continue importing `./AdapterListPage` and `./AdapterEditPage` through the existing extensionless paths
- **AND** `/adapters` SHALL continue rendering the adapter list for logged-in users
- **AND** `/adapters/:organizationName/:adapterName` SHALL continue rendering the adapter edit page for logged-in users

#### Scenario: Casbin 适配器列表行为保持兼容
- **WHEN** an operator opens the adapter list, searches, filters, sorts, adds, edits, or deletes an adapter
- **THEN** the page SHALL continue using the existing `AdapterBackend` API boundary and request parameters
- **AND** the page SHALL preserve existing table columns, pagination, built-in object delete protection, success/error messages, edit route targets, and delete refresh behavior
- **AND** the migration SHALL NOT change adapter create/delete payload shape or permission behavior

#### Scenario: Casbin 适配器编辑行为保持兼容
- **WHEN** an operator opens, edits, saves, saves and exits, cancels a newly added adapter, or deletes an adapter
- **THEN** the page SHALL preserve current adapter loading, organization loading, field editing, `useSameDb` switch behavior, save/delete backend calls, success/error messages, and navigation behavior
- **AND** the migration SHALL NOT change adapter save semantics, backend API routes, built-in object read-only rules, or visible adapter field labels

#### Scenario: 数据库连接测试行为保持兼容
- **WHEN** an operator runs the adapter database connection test
- **THEN** the page SHALL continue calling the existing `AdapterBackend.getPolicies` database probe boundary with the current adapter id
- **AND** success, backend error, and network error messages SHALL preserve the existing user-visible behavior
- **AND** the database connection test SHALL remain disabled when the route organization does not match the adapter owner

#### Scenario: Casbin 适配器页迁移验证
- **WHEN** the Casbin adapter TSX migration is ready for review
- **THEN** the incremental TypeScript gate, `yarn typecheck`, focused `.test.tsx` tests, changed-file or changed-function coverage, and `yarn build` or equivalent import-boundary validation SHALL pass for the touched TSX and JS coexistence paths
- **AND** this migration SHALL NOT require the same change to migrate Role, Permission, Identity Evidence, Casbin Model, Enforcer, PolicyTable, backend API wrappers, or unrelated Authorization menu pages
