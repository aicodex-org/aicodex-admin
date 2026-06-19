## Context

“组织账号”菜单下群组能力拆成三个入口：`GroupListPage.js` 列表、`GroupTreePage.js` 树形查看与树内增删、`GroupEditPage.js` 编辑页。三者共用 `GroupBackend.js`。

本 change 的迁移目标是群组列表页。列表页继承 `BaseListPage.js`，使用分页、筛选、未授权和 Tour 行为，并额外包含 `.xlsx` 导入模板下载、上传预览和 `/api/upload-groups` 上传流程。群组树还会嵌入 `UserListPage`，交互面更大，因此不纳入本 change。

## Goals / Non-Goals

**Goals:**

- 保守迁移 `GroupListPage` 到 TSX，保持运行时行为兼容。
- 类型化群组记录、列表 state、上传预览、fetch 参数、表格列和 backend 响应。
- 让 `GroupTreePage.js` 和 `GroupEditPage.js` 继续能从 `.ts` backend client 导入原函数。
- 通过聚焦测试覆盖列表页关键行为、上传分支和 backend endpoint 契约。

**Non-Goals:**

- 不迁移 `GroupTreePage`、`GroupEditPage`、`UserListPage` 或组织/用户其它页面。
- 不改变群组 API 参数编码、HTTP 方法、响应处理、上传 endpoint 或错误文案。
- 不重做群组列表视觉设计、表格列、导入模板字段或树形交互。
- 不引入全局 organization account 类型模型或跨页面共享抽象。

## Decisions

### 1. 本 change 只覆盖群组列表

`GroupTreePage` 有组织选择、树节点展开、树内新建/编辑/删除和嵌入用户列表，和 `GroupListPage` 的风险面不同。把二者拆开可以保持一个 change 一个可验证结果，并降低 JS/TS 共存风险。

### 2. 保留 JS 基类兼容层

`BaseListPage.js` 暂不迁移。`GroupListPage.tsx` 使用局部 `LegacyBaseListPageCompat` 类型声明当前页面依赖的 `getColumnSearchProps`、`getTablePaginationProps` 和 `handleTableChange`，避免扩大写集。

### 3. Backend client 迁移为 TS 但保持 runtime 兼容

`GroupBackend` 迁移为 `.ts` 后保留 `getGroups`、`getGroup`、`updateGroup`、`addGroup`、`deleteGroup` 的具名导出、参数顺序、HTTP method、query string 和 JSON 返回行为。新增类型只服务 TS 页面和测试，不改变 JS 编辑页/树页调用方式。

### 4. 上传逻辑只做类型收口

列表页的 `.xlsx` 解析、预览 modal、`FormData` 上传和上传结果处理保持现有行为。测试覆盖成功、失败、文件读取错误和 endpoint contract，不在本 change 中重构上传组件或引入新的上传 abstraction。

## Risks / Trade-offs

- **JS 页面继续导入 TS backend** → 保持具名导出和运行时函数签名不变，并用 backend 测试覆盖 detail/update/delete 等调用。
- **XLSX / FileReader 类型收紧** → 仅做局部类型和安全窄化，不改变解析流程。
- **Ant Design 类型收紧** → 将历史移动端 fixed 列字符串 `"false"` 收敛为等价布尔 `false`，保持原意并满足类型约束。
- **GroupTree 后续仍是 JS** → 本 change 在 proposal/tasks/spec 中明确后续单独评估树页，避免误认为群组能力已全量 TS 化。

## Validation

- `openspec validate migrate-organization-group-list-to-typescript --strict`
- `openspec validate --changes --strict`
- `openspec validate --specs --strict`
- `git diff --check`
- `cd web-admin; node scripts/check-incremental-typescript-gate.mjs --base origin/hfl-test-base`
- `cd web-admin; yarn typecheck`
- 聚焦 Jest + coverage 覆盖 `GroupListPage.tsx` 和 `GroupBackend.ts`
- `cd web-admin; yarn build`
