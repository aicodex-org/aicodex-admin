## ADDED Requirements

### Requirement: 权限角色角色权限列表页渐进迁移
`web-admin` SHALL support migrating the Authorization menu role and permission list pages from legacy JavaScript to TSX while preserving existing list, route, permission, API, upload, and table operation behavior.

#### Scenario: 角色权限列表路由和导入保持兼容
- **WHEN** `RoleListPage` and `PermissionListPage` are migrated to `.tsx`
- **THEN** `ManagementPage.js` SHALL continue importing `./RoleListPage` and `./PermissionListPage` through the existing extensionless paths
- **AND** `/roles` SHALL continue rendering the role list for logged-in users
- **AND** `/permissions` SHALL continue rendering the permission list for logged-in users

#### Scenario: 角色列表行为保持兼容
- **WHEN** an operator opens the role list, searches, sorts, adds, edits, downloads the template, previews upload data, uploads, or deletes a role
- **THEN** the page SHALL continue using the existing `RoleBackend` API boundary and request parameters
- **AND** the page SHALL preserve existing table columns, pagination, organization scope, upload endpoint, success/error messages, delete refresh behavior, and edit route targets
- **AND** the migration SHALL NOT change role create/delete payload shape or permission behavior

#### Scenario: 权限列表行为保持兼容
- **WHEN** an operator opens the permission list, searches, sorts, adds, edits, downloads the template, previews upload data, uploads, or deletes a permission
- **THEN** the page SHALL continue using the existing `PermissionBackend` API boundary and request parameters
- **AND** local admin users SHALL continue using `getPermissions`, while non-local-admin users SHALL continue using `getPermissionsBySubmitter`
- **AND** the page SHALL preserve existing table columns, pagination, organization scope, upload endpoint, state/effect rendering, success/error messages, delete refresh behavior, and edit route targets
- **AND** the migration SHALL NOT change permission create/delete payload shape, approval state semantics, or permission behavior

#### Scenario: 角色权限列表迁移验证
- **WHEN** the role and permission list TSX migration is ready for review
- **THEN** the incremental TypeScript gate, `yarn typecheck`, focused `.test.tsx` tests, changed-file or changed-function coverage, and `yarn build` or equivalent import-boundary validation SHALL pass for the touched TSX and JS coexistence paths
- **AND** this migration SHALL NOT require the same change to migrate Role edit, Permission edit, Identity Evidence, Casbin Model, Adapter, Enforcer, PolicyTable, backend API wrappers, or unrelated Authorization menu pages
