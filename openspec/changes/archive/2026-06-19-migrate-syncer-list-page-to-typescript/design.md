## Context

当前身份源菜单下仍存在 legacy JavaScript 页面。`SyncerListPage` 的现状：

- 继承 `BaseListPage.js`，复用历史分页、筛选、未授权和 Tour 行为。
- 使用 `SyncerBackend.js` 调用 `/api/get-syncers`、`/api/add-syncer`、`/api/delete-syncer` 和 `/api/run-syncer`。
- 通过 `Setting.getRequestOrganization` 和 `Setting.isDefaultOrganizationSelected` 控制组织筛选。
- 页面只负责列表和入口操作，复杂表单留在 `SyncerEditPage.js`。

因此本 change 可以只迁移列表页和请求 client，不需要迁移编辑页或后端同步器实现。

## Goals / Non-Goals

Goals:

- 保守迁移 `SyncerListPage` 到 TSX，保持运行时行为兼容。
- 类型化同步器记录、列表 state、fetch 参数、表格列和 backend 响应。
- 通过聚焦测试覆盖页面可观察行为和关键失败路径。
- 继续证明 JS 基类、TSX 页面和 TS backend client 可以共存。

Non-Goals:

- 不迁移 `SyncerEditPage`，不重构大型同步器配置表单。
- 不改变同步器 API 参数编码、HTTP 方法、响应处理或错误文案。
- 不重做同步器页面视觉设计。
- 不引入全局 Syncer 类型模型或跨页面共享抽象，除非类型化当前列表页必需。

## Decisions

### 1. 直接迁移列表页，不新增 wrapper

`SyncerListPage` 文件体量可控，并且已有 class 组件生命周期依赖 `BaseListPage`。直接迁移为 `.tsx` 能减少 JS/TS 双层 wrapper 的边界，也更符合前几个身份源页面迁移范式。

### 2. 保留 JS 基类兼容层

`BaseListPage.js` 暂不迁移。本页面会采用局部 `LegacyBaseListPageCompat` 类型声明，把 `getColumnSearchProps`、`getTablePaginationProps`、`handleTableChange` 和 `fetch` 这些当前页面依赖的基类边界类型化，避免扩大写集。

### 3. Backend client 迁移为 TS

`SyncerBackend` 同时被列表页和编辑页使用。迁移为 `.ts` 后保持具名导出和函数签名兼容，编辑页可以继续从同一路径导入；新增类型只作为 TS 页面和测试的局部约束，不改变运行时 payload。

### 4. 测试优先覆盖行为兼容

测试重点覆盖：

- 列表请求使用当前组织或默认组织筛选。
- 新建同步器默认值保持兼容并跳转到编辑页。
- 删除最后一条记录时分页回退。
- 运行同步成功/失败、服务端错误和网络错误消息。
- 403/denied 响应进入未授权状态。

## Risks / Mitigations

- **JS 基类类型不完整**：只声明本页面实际使用的兼容边界，避免把 `BaseListPage` 迁移扩大到本 change。
- **编辑页仍依赖 `SyncerBackend`**：保持所有导出函数名、参数顺序和返回 Promise JSON 行为不变。
- **表格 `fixed` 类型差异**：使用 Ant Design `TableProps` 类型约束，必要时将历史 `"false"` 字符串修正为等价 `false`，不改变移动端表现。

## Validation

- `openspec validate migrate-syncer-list-page-to-typescript --strict`
- `openspec validate --changes --strict`
- `openspec validate --specs --strict`
- `git diff --check`
- `cd web-admin; node scripts/check-incremental-typescript-gate.mjs --base origin/hfl-test-base`
- `cd web-admin; yarn typecheck`
- 聚焦 Jest + coverage 覆盖 `SyncerListPage.tsx` 和 `SyncerBackend.ts`
- `cd web-admin; yarn build`
