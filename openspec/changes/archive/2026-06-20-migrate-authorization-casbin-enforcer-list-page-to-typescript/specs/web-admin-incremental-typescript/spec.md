## ADDED Requirements

### Requirement: 权限角色 Casbin 执行器列表页渐进迁移
`web-admin` SHALL support migrating the Authorization menu Casbin enforcer list page from legacy JavaScript to TSX while preserving existing enforcer list, route, permission, API, and deletion-protection behavior.

#### Scenario: Casbin 执行器列表页路由和导入保持兼容
- **WHEN** `EnforcerListPage` is migrated to `.tsx`
- **THEN** `ManagementPage.js` SHALL continue importing `./EnforcerListPage` through the existing extensionless path
- **AND** `/enforcers` SHALL continue rendering the enforcer list for logged-in users
- **AND** `/enforcers/:organizationName/:enforcerName` SHALL continue to be owned by `EnforcerEditPage` outside this change

#### Scenario: Casbin 执行器列表行为保持兼容
- **WHEN** an operator opens the enforcer list, searches, sorts, adds, edits, or deletes an enforcer
- **THEN** the page SHALL continue using the existing `EnforcerBackend` API boundary and request parameters
- **AND** the page SHALL preserve existing table columns, pagination, built-in object delete protection, success/error messages, and edit route targets
- **AND** the migration SHALL NOT change enforcer create/delete payload shape or permission behavior

#### Scenario: Casbin 执行器列表 owner filtering remains compatible
- **WHEN** the default organization is selected
- **THEN** the list request SHALL continue sending an empty owner filter to `getEnforcers`
- **AND** when a specific organization is selected, the request SHALL continue sending `Setting.getRequestOrganization(account)` as the owner filter

#### Scenario: Casbin 执行器列表页迁移边界
- **WHEN** this migration is implemented
- **THEN** it SHALL NOT migrate `EnforcerEditPage`, `PolicyTable`, `AdapterBackend`, `EnforcerBackend`, backend APIs, Casbin policy CRUD, Role pages, Permission pages, Model pages, Adapter pages, or unrelated Authorization menu pages

#### Scenario: Casbin 执行器列表页迁移验证
- **WHEN** the Casbin enforcer list TSX migration is ready for review
- **THEN** the incremental TypeScript gate, `yarn typecheck`, focused `.test.tsx` tests, changed-file or changed-function coverage, and `yarn build` or equivalent import-boundary validation SHALL pass for the touched TSX and JS coexistence paths
