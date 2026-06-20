## ADDED Requirements

### Requirement: 权限角色角色权限编辑页渐进迁移
`web-admin` SHALL support migrating the Authorization menu role and permission edit pages from legacy JavaScript to TSX while preserving existing edit, route, permission, API, validation, approval, and navigation behavior.

#### Scenario: 角色权限编辑页路由和导入保持兼容
- **WHEN** `RoleEditPage` and `PermissionEditPage` are migrated to `.tsx`
- **THEN** `ManagementPage.js` SHALL continue importing `./RoleEditPage` and `./PermissionEditPage` through the existing extensionless paths
- **AND** `/roles/:organizationName/:roleName` SHALL continue rendering the role edit page for logged-in users
- **AND** `/permissions/:organizationName/:permissionName` SHALL continue rendering the permission edit page for logged-in users

#### Scenario: 角色编辑行为保持兼容
- **WHEN** an operator opens, edits, saves, saves and exits, cancels a new role, or deletes a role
- **THEN** the page SHALL continue using the existing `RoleBackend` API boundary and request parameters
- **AND** the page SHALL preserve current role loading, organization selection, sub user/group/role/domain editing, enabled toggle, success/error messages, save payload shape, delete behavior, and navigation targets
- **AND** the migration SHALL NOT change role permission behavior or require role list migration in the same change

#### Scenario: 权限编辑行为保持兼容
- **WHEN** an operator opens, edits, saves, saves and exits, cancels a new permission, or deletes a permission
- **THEN** the page SHALL continue using the existing `PermissionBackend`, `ModelBackend`, and `ApplicationBackend` API boundaries and request parameters
- **AND** the page SHALL preserve current permission loading, model loading, Application resource loading, organization selection, model/resource/action/effect/state editing, submitter/approver/approveTime display, success/error messages, save payload shape, delete behavior, and navigation targets
- **AND** local admin users SHALL continue being able to change approval state, while non-local-admin users SHALL keep the existing submitter self-modification restriction
- **AND** the migration SHALL NOT change approval state semantics, permission validation semantics, or permission behavior

#### Scenario: 角色权限编辑页迁移验证
- **WHEN** the role and permission edit TSX migration is ready for review
- **THEN** the incremental TypeScript gate, `yarn typecheck`, focused `.test.tsx` tests, changed-file or changed-function coverage, and `yarn build` or equivalent import-boundary validation SHALL pass for the touched TSX and JS coexistence paths
- **AND** this migration SHALL NOT require the same change to migrate Role list, Permission list, Identity Evidence, Casbin Model, Adapter, Enforcer, PolicyTable, backend API wrappers, or unrelated Authorization menu pages
