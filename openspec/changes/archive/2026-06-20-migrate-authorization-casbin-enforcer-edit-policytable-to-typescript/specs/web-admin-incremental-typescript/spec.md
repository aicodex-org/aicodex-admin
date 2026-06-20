## ADDED Requirements

### Requirement: 权限角色 Casbin 执行器编辑页和策略表渐进迁移
`web-admin` SHALL support migrating the Authorization menu Casbin enforcer edit page and embedded policy table from legacy JavaScript to TSX while preserving existing enforcer edit, policy CRUD, route, permission, API, and disabled-state behavior.

#### Scenario: Casbin 执行器编辑页路由和导入保持兼容
- **WHEN** `EnforcerEditPage` and `PolicyTable` are migrated to `.tsx`
- **THEN** `ManagementPage.js` SHALL continue importing `./EnforcerEditPage` through the existing extensionless path
- **AND** `EnforcerEditPage` SHALL continue importing `./table/PolicyTable` through the existing extensionless path
- **AND** `/enforcers/:organizationName/:enforcerName` SHALL continue rendering the enforcer edit page for logged-in users

#### Scenario: Casbin 执行器编辑行为保持兼容
- **WHEN** an operator opens, edits, saves, saves and exits, or cancels a newly added enforcer
- **THEN** the page SHALL preserve current enforcer loading, organization/model/adapter loading, field editing, save/delete backend calls, success/error messages, navigation behavior, and save-failure name rollback
- **AND** the migration SHALL NOT change enforcer save/delete payload shape, backend API routes, permission behavior, or built-in object read-only rules

#### Scenario: PolicyTable policy sync and dynamic columns remain compatible
- **WHEN** an operator syncs policies for an editable enforcer with model and adapter selected
- **THEN** `PolicyTable` SHALL continue using `AdapterBackend.getPolicies(enforcer.owner, enforcer.name)` and assigning stable row keys from the returned policy order
- **AND** policy columns SHALL continue deriving rule columns from `modelCfg["p"].split(",")` while retaining `Ptype` and action columns

#### Scenario: PolicyTable policy edit state remains compatible
- **WHEN** an operator edits, cancels, saves, adds, or deletes a policy row
- **THEN** `PolicyTable` SHALL preserve current pagination index mapping, `oldPolicy` rollback, add-vs-update selection, duplicate policy handling, success/error messages, and local table updates
- **AND** the migration SHALL NOT change `UpdatePolicy`, `AddPolicy`, `RemovePolicy`, or policy payload semantics

#### Scenario: PolicyTable disabled states remain compatible
- **WHEN** an edit is already active, the enforcer is built-in, or model/adapter is empty
- **THEN** `PolicyTable` SHALL continue disabling sync, add, edit, or delete controls according to the existing conditions

#### Scenario: Casbin 执行器编辑页迁移边界
- **WHEN** this migration is implemented
- **THEN** it SHALL NOT migrate `EnforcerListPage`, Role pages, Permission pages, Model pages, Adapter pages, backend API wrappers, backend APIs, or unrelated Authorization menu pages

#### Scenario: Casbin 执行器编辑页和策略表迁移验证
- **WHEN** the Casbin enforcer edit and policy table TSX migration is ready for review
- **THEN** the incremental TypeScript gate, `yarn typecheck`, focused `.test.tsx` tests, changed-file or changed-function coverage, and `yarn build` SHALL pass for the touched TSX and JS coexistence paths
