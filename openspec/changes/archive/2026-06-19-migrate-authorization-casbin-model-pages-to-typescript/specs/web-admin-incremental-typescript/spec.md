## ADDED Requirements

### Requirement: 权限角色 Casbin 模型页渐进迁移
`web-admin` SHALL support migrating the Authorization menu Casbin model pages from legacy JavaScript to TSX while preserving existing model list, model edit, route, permission, API, and Casbin model text behavior.

#### Scenario: Casbin 模型页面路由和导入保持兼容
- **WHEN** `ModelListPage`, `ModelEditPage`, and `CasbinEditor` are migrated to `.tsx`
- **THEN** `ManagementPage.js` SHALL continue importing `./ModelListPage` and `./ModelEditPage` through the existing extensionless paths
- **AND** `/models` SHALL continue rendering the model list for logged-in users
- **AND** `/models/:organizationName/:modelName` SHALL continue rendering the model edit page for logged-in users

#### Scenario: Casbin 模型列表行为保持兼容
- **WHEN** an operator opens the model list, searches, sorts, adds, edits, previews, or deletes a model
- **THEN** the page SHALL continue using the existing `ModelBackend` API boundary and request parameters
- **AND** the page SHALL preserve existing table columns, pagination, built-in object delete protection, success/error messages, and edit route targets
- **AND** the migration SHALL NOT change model create/delete payload shape or permission behavior

#### Scenario: Casbin 模型编辑行为保持兼容
- **WHEN** an operator opens, edits, saves, saves and exits, or cancels a newly added model
- **THEN** the page SHALL preserve current model loading, organization loading, field editing, `modelText` editing, save/delete backend calls, success/error messages, and navigation behavior
- **AND** the migration SHALL NOT change Casbin model save semantics, backend API routes, or built-in model read-only rules

#### Scenario: Casbin editor tab synchronization remains compatible
- **WHEN** an operator switches between Basic Editor and Advanced Editor
- **THEN** `CasbinEditor` SHALL preserve current local `modelText` state, iframe `getModelText` / `updateModelText` synchronization, and `onModelTextChange` callback behavior
- **AND** built-in models SHALL remain read-only in the Basic Editor and SHALL NOT call the model text change callback

#### Scenario: Casbin 模型页迁移验证
- **WHEN** the Casbin model TSX migration is ready for review
- **THEN** the incremental TypeScript gate, `yarn typecheck`, focused `.test.tsx` tests, changed-file or changed-function coverage, and `yarn build` or equivalent import-boundary validation SHALL pass for the touched TSX and JS coexistence paths
- **AND** this migration SHALL NOT require the same change to migrate Role, Permission, Identity Evidence, Adapter, Enforcer, PolicyTable, backend API wrappers, or unrelated Authorization menu pages
