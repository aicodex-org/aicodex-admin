## Context

组织列表页继承 `BaseListPage.js`，通过 `OrganizationBackend.js` 拉取分页数据，并使用 `OrganizationIdentityCenter` 包裹主表格。页面还包含较大的默认组织模板、新建组织、删除组织、组织选择筛选、密码类型筛选、软删除开关展示，以及跳转到组织群组、用户和编辑页面的行操作。

`OrganizationBackend.js` 被大量 legacy JS 编辑页、选择组件和登录页复用。本 change 只迁移 backend client 文件类型和类型声明，不改变运行时导出和调用契约。

## Goals / Non-Goals

**Goals:**

- 保守迁移 `OrganizationListPage` 到 TSX，保持运行时行为兼容。
- 类型化组织记录、列表 state、默认组织模板、fetch 参数、表格列和 backend 响应。
- 让所有仍为 JS 的调用方继续能从 `.ts` backend client 导入原函数。
- 通过聚焦测试覆盖列表页关键行为和 backend endpoint 契约。

**Non-Goals:**

- 不迁移 `OrganizationEditPage`、`OrganizationTreeOperationsPage`、`OrganizationDirectoryQualityPage`、`UserListPage`、`GroupTreePage` 或其它组织账号页面。
- 不改变组织 API 参数编码、HTTP 方法、响应处理、组织重命名、组织编辑、组织树运营或目录质量逻辑。
- 不重做组织列表视觉设计、表格列、身份中心摘要组件或权限策略。
- 不引入全局 organization account 类型模型或跨页面共享抽象。

## Decisions

### 1. 本 change 只覆盖组织列表入口

组织编辑页包含主题、密码、账号字段、MFA、默认应用等复杂表单；组织树运营和目录质量页是独立业务工具；用户列表也有用户资料和批量操作风险。组织列表本身是更合适的下一步低风险入口。

### 2. 保留 JS 基类兼容层

`BaseListPage.js` 暂不迁移。`OrganizationListPage.tsx` 使用局部兼容类型声明当前页面依赖的 `getColumnSearchProps`、`getTablePaginationProps` 和 `handleTableChange`，避免扩大写集。

### 3. Backend client 迁移为 TS 但保持 runtime 兼容

`OrganizationBackend` 迁移为 `.ts` 后保留 `getOrganizations`、`getOrganization`、`updateOrganization`、`addOrganization`、`deleteOrganization`、`getDefaultApplication`、`getOrganizationNames` 的具名导出、参数顺序、HTTP method、query string 和 JSON 返回行为。新增类型只服务 TS 页面和测试，不改变 JS 调用方。

### 4. 默认组织模板只做类型收口

`newOrganization()` 的默认字段、accountItems、品牌 favicon/icon、密码策略、MFA 记忆时间、余额币种和软删除默认值保持不变。测试覆盖关键默认字段和新增后跳转，不在本 change 中重构模板生成。

## Risks / Trade-offs

- **大量 JS 调用方继续导入 TS backend** → 保持具名导出和运行时函数签名不变，并用 backend 测试覆盖列表、详情、默认应用、组织名和 mutation endpoint。
- **组织默认模板较长** → 只补类型，不抽 helper，避免把迁移 change 变成业务重构。
- **Ant Design 类型收紧** → 历史移动端 fixed 列字符串 `"false"` 收敛为等价布尔 `false`，保持原意并满足类型约束。
- **前序 `InvitationList` / `GroupList` RC 尚未合入** → 本 change 从最新 `origin/hfl-test-base` 独立开始；后续多个 RC 合入同一个主规格时，需要保留各自新增的 TypeScript migration 场景。

## Validation

- `openspec validate migrate-organization-list-to-typescript --strict`
- `openspec validate --changes --strict`
- `openspec validate --specs --strict`
- `git diff --check`
- `cd web-admin; node scripts/check-incremental-typescript-gate.mjs --base origin/hfl-test-base`
- `cd web-admin; yarn typecheck`
- 聚焦 Jest + coverage 覆盖 `OrganizationListPage.tsx` 和 `OrganizationBackend.ts`
- `cd web-admin; yarn build`
