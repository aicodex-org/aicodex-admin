## Context

`GroupEditPage.js` 是“组织账号”菜单下群组编辑路由 `/groups/:organizationName/:groupName` 的页面。它加载当前群组、群组列表和组织列表，并负责编辑 owner/name/displayName/type/parentId/isEnabled，保存后根据 `groupTreeUrl` session storage marker 返回群组树或群组列表。

`GroupBackend` 和 `OrganizationBackend` 已经迁移为 TS，本 change 只需要在页面边界定义局部类型，不需要改 backend client。群组列表和群组树已经完成 TSX 迁移，当前页面是群组能力剩余的直接编辑入口。

## Goals / Non-Goals

**Goals:**

- 将 `GroupEditPage` 迁移为 `.tsx`，保留当前 class 组件结构。
- 使用明确局部类型描述 props、state、路由参数、群组记录、组织记录和 API response。
- 添加 `.test.tsx` 聚焦测试，覆盖加载、父群组选项、保存/删除成功与失败、返回路由和网络错误。
- 通过 OpenSpec、增量 TS gate、`yarn typecheck`、聚焦 Jest/coverage 和 `yarn build` 验证。

**Non-Goals:**

- 不迁移 `InvitationEditPage.js`、`SyncerEditPage.js`、`ManagementPage.js` 或其它页面。
- 不改变 `GroupBackend` / `OrganizationBackend` 函数签名、API path、请求 payload、返回处理或错误文案。
- 不重写 class 组件为 hooks，不做视觉重设计，不改变 AntD 表单布局。
- 不引入全局组织账号类型模型或跨页面共享 abstraction。

## Decisions

### 1. 保留 class 组件结构

页面当前是短小 class 组件，行为依赖 lifecycle、history 和 session storage 返回逻辑。本 change 只做类型化，不改写 hooks，避免引入行为风险。

### 2. 页面内定义局部类型

`GroupBackend` 已经是 TS，但页面仍需兼容历史 route props、account props 和宽松 backend response。局部类型可以覆盖本页面风险点，同时不扩大到全局组织账号模型。

### 3. 测试验证编辑行为而非重做 UI

测试重点覆盖用户可观察行为和业务不变量：加载成功、父群组选项排除当前群组、保存 payload 标记顶层群组、保存并退出的 `groupTreeUrl` 返回、删除/取消新增、失败提示和网络错误。测试不为普通 JSX 或样式堆行覆盖。

## Risks / Trade-offs

- **历史 route props 宽松**：使用局部 `RouteProps` 和可选字段，保留现有从 `props.organizationName` 覆盖 `match.params.organizationName` 的行为。
- **父群组选项依赖组织列表**：测试覆盖当前群组被排除、组织作为顶层父级候选加入，避免迁移时破坏层级逻辑。
- **保存 payload 的 `isTopGroup` 为运行时派生字段**：保留当前 submit 前写入逻辑，并用测试验证 parentId 等于组织名时为 top group。
- **新增取消使用 deleteGroup**：保留现有行为，不改为纯前端取消。

## Validation

- `openspec validate migrate-organization-group-edit-page-to-typescript --strict`
- `openspec validate --changes --strict`
- `openspec validate --specs --strict`
- `git diff --check`
- `cd web-admin; node scripts/check-incremental-typescript-gate.mjs --base origin/hfl-test-base`
- `cd web-admin; yarn typecheck`
- 聚焦 Jest + coverage 覆盖 `GroupEditPage.tsx`
- `cd web-admin; yarn build`
