## ADDED Requirements

### Requirement: 权限角色 Casbin 执行器迁移评估与拆分
`web-admin` SHALL assess the Authorization menu Casbin enforcer pages and `PolicyTable` before migrating them from legacy JavaScript to TSX, and SHALL split subsequent migration work by risk boundary instead of treating all enforcer-related files as one ordinary page migration.

#### Scenario: 执行器列表页可作为独立迁移候选
- **WHEN** a later change migrates `EnforcerListPage` to `.tsx`
- **THEN** the migration SHALL preserve `/enforcers` routing, extensionless `ManagementPage.js` import, list fetch parameters, table columns, pagination, search, sort, add, edit, delete, built-in object protection, success/error messages, and delete refresh behavior
- **AND** the migration SHALL NOT require the same change to migrate `EnforcerEditPage`, `PolicyTable`, `AdapterBackend`, `EnforcerBackend`, model pages, adapter pages, role/permission pages, or unrelated Authorization menu pages

#### Scenario: 执行器编辑页和策略表必须共同设计
- **WHEN** a later change migrates `EnforcerEditPage` or `PolicyTable` to TypeScript
- **THEN** that change SHALL explicitly cover the boundary between `EnforcerEditPage` and `PolicyTable`
- **AND** it SHALL preserve enforcer loading, organization/model/adapter loading, field editing, model and adapter selection, save/delete behavior, `modelCfg` delivery, and built-in object protection
- **AND** it SHALL preserve `PolicyTable` policy sync, dynamic policy columns, page-index mapping, add/edit/cancel/save/delete behavior, duplicate-policy handling, disabled states, and existing `AdapterBackend` policy API payload semantics

#### Scenario: 策略表迁移验证要求
- **WHEN** a later change migrates `PolicyTable` to TypeScript
- **THEN** focused `.test.tsx` tests SHALL cover policy sync success/error/network failure, dynamic columns from `modelCfg`, add row, edit row, cancel added row, update policy, add policy duplicate handling, remove policy, pagination index mapping, and disabled controls
- **AND** changed-file or changed-function coverage SHALL be recorded for the touched enforcer edit and policy table implementation files
- **AND** lower-level mock tests SHALL NOT be reported as real database or end-to-end policy execution verification

#### Scenario: 执行器迁移边界保持只读评估
- **WHEN** this assessment change is completed
- **THEN** it SHALL NOT modify production JavaScript/TypeScript source files, backend APIs, route definitions, authorization behavior, real policy data, credentials, or environment configuration
- **AND** it SHALL produce OpenSpec evidence that guides the next migration candidate without pushing or merging `test`
