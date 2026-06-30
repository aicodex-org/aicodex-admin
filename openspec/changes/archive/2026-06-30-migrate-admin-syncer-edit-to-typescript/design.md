## Context

`SyncerEditPage` 是 `/syncers/:syncerName` 的编辑页，当前直接依赖：

- `SyncerBackend.ts` 的 `getSyncer`、`updateSyncer`、`deleteSyncer` 和 `testSyncerDb`。
- `OrganizationBackend` 和 `CertBackend` 的 legacy JS client。
- `SyncerTableColumnTable.js` 维护 `tableColumns` 行内编辑。
- `ManagementPage.js` 的 `./SyncerEditPage` 无后缀 import。

页面字段覆盖数据库、LDAP、Keycloak、SCIM、云厂商和企业通讯录类同步器，存在大量历史动态字段。迁移目标是类型化当前边界，而不是重写表单模型。

## Goals / Non-Goals

Goals:

- 保守迁移 `SyncerEditPage` 到 TSX，保持所有可见行为和 backend payload 兼容。
- 使用页面局部 `SyncerEditState`、同步器记录扩展类型和窄 helper 类型封住历史动态字段。
- 迁移 `SyncerTableColumnTable` 到 TSX，避免编辑页继续依赖 legacy JSX 表格组件。
- 保持 JS/TS 共存边界，不扩大到全局壳、Provider、Application、auth 或后端实现。

Non-Goals:

- 不重构同步器编辑表单布局、字段分组、保存流程或连接测试流程。
- 不迁移 `Setting.js`、`BaseListPage.js`、`ManagementPage.js` 或其它编辑页。
- 不改变同步器 API、权限、同步运行、数据库 schema 或真实外部系统配置。

## Decisions

### 1. 页面局部类型优先

`SyncerEditPage` 字段历史包袱较重，当前 change 使用局部接口描述页面实际读写字段，并允许少量有命名的动态字段索引承接后端透传字段。这样可以让 TSX 迁移收敛在当前页面，而不把全局同步器模型设计提前引入。

### 2. 表格字段组件随页面迁移

`SyncerTableColumnTable` 由编辑页直接渲染并回写 `tableColumns`。若编辑页迁移为 TSX 而表格组件继续是 JS，会让字段行回调和 table record 类型仍停留在隐式边界。本 change 将其一并迁移，但不改变添加、删除、上下移动或字段编辑语义。

### 3. 保持无后缀 import 和 API 契约

文件后缀迁移后，`ManagementPage.js` 继续通过 `./SyncerEditPage` 导入。所有 backend 调用的函数名、参数顺序、payload shape 和成功/错误处理保持不变。

## Risks / Mitigations

- **动态字段类型过宽**：使用有名称的 `SyncerEditRecord` / `LegacySyncerValue` 承接历史字段，并优先为页面实际字段补明确类型。
- **大型页面迁移易引入行为噪声**：优先机械迁移和类型修补，不做 JSX 重排、文案调整或视觉改动。
- **测试覆盖不足**：优先运行同步器现有聚焦 Jest、typecheck、增量 TS gate 和 build；如新增页面测试，使用 `.test.tsx` 覆盖加载、字段回写和保存入口。

## Validation

- `openspec validate migrate-admin-syncer-edit-to-typescript --strict`
- `git diff --check origin/hfl-test-base..HEAD`
- `cd web-admin; yarn test --runTestsByPath src/SyncerListPage.test.tsx src/backend/SyncerBackend.test.ts --watchAll=false`
- `cd web-admin; yarn typecheck`
- `cd web-admin; node scripts/check-incremental-typescript-gate.mjs --base origin/hfl-test-base`
- `cd web-admin; yarn build`
