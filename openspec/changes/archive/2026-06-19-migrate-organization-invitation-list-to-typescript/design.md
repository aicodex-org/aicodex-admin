## Context

“组织账号”菜单包含组织、群组、用户、邀请码、组织树运营和组织目录质量。当前页面仍以历史 JS 为主，其中：

- `InvitationListPage.js` 继承 `BaseListPage.js`，复用分页、筛选、未授权和 Tour 行为。
- `InvitationListPage.js` 通过 `InvitationBackend.js` 调用 `/api/get-invitations`、`/api/add-invitation` 和 `/api/delete-invitation`。
- `InvitationEditPage.js` 也依赖同一个 backend client 的 detail、update、verify 和 send 函数。

因此本 change 只迁移列表页和 backend client，不迁移编辑页，保持 JS/TS 共存。

## Goals / Non-Goals

Goals:

- 保守迁移 `InvitationListPage` 到 TSX，保持运行时行为兼容。
- 类型化邀请码记录、列表 state、fetch 参数、表格列和 backend 响应。
- 让 `InvitationEditPage.js` 继续能从 `.ts` backend client 导入原函数。
- 通过聚焦测试覆盖列表页关键行为和 backend endpoint 契约。

Non-Goals:

- 不迁移 `InvitationEditPage` 和发送/验证编辑流程。
- 不改变邀请码 API 参数编码、HTTP 方法、响应处理或错误文案。
- 不重做邀请码页面视觉设计。
- 不引入全局 organization account 类型模型或跨页面共享抽象。

## Decisions

### 1. 从邀请码列表页开始

邀请码列表页体量较小，列表行为清晰，适合作为“组织账号”菜单的第一个低风险迁移点。组织、用户和目录质量页面后续需要独立评估。

### 2. 保留 JS 基类兼容层

`BaseListPage.js` 暂不迁移。页面会使用局部 `LegacyBaseListPageCompat` 类型声明当前依赖的 `getColumnSearchProps`、`getTablePaginationProps` 和 `handleTableChange`，避免扩大写集。

### 3. Backend client 迁移为 TS 但保持 runtime 兼容

`InvitationBackend` 迁移为 `.ts` 后保留所有具名导出、参数顺序、HTTP method 和 JSON 返回行为。新增类型只服务 TS 页面和测试，不改变 JS 编辑页调用方式。

### 4. 测试覆盖行为兼容

测试重点覆盖：

- 列表请求使用当前组织或默认组织筛选。
- 新建邀请码默认字段和跳转路径保持兼容。
- 删除最后一条记录时分页回退。
- 服务端错误、网络错误和 denied 响应处理。
- backend endpoint、headers、payload clone、detail、verify、send 行为。

## Risks / Mitigations

- **JS 编辑页继续导入 TS backend**：保持具名导出和运行时函数签名不变，并用 backend 测试覆盖 detail/update/verify/send。
- **BaseListPage 类型不完整**：只声明本页面实际使用边界，不迁移基类。
- **Ant Design 类型收紧**：将历史移动端 fixed 列字符串 `"false"` 收敛为等价布尔 `false`，保持原意并满足类型约束。

## Validation

- `openspec validate migrate-organization-invitation-list-to-typescript --strict`
- `openspec validate --changes --strict`
- `openspec validate --specs --strict`
- `git diff --check`
- `cd web-admin; node scripts/check-incremental-typescript-gate.mjs --base origin/hfl-test-base`
- `cd web-admin; yarn typecheck`
- 聚焦 Jest + coverage 覆盖 `InvitationListPage.tsx` 和 `InvitationBackend.ts`
- `cd web-admin; yarn build`
