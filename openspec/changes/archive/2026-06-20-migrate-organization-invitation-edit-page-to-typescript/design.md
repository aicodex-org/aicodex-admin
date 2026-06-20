## Context

`InvitationEditPage.js` 是“组织账号”菜单下的邀请码编辑路由 `/invitations/:organizationName/:invitationName` 的页面。它加载邀请码、组织、应用和群组数据，并负责编辑 owner/name/displayName/code/defaultCode/quota/usedCount/application/signupGroup/username/email/phone/state，支持复制注册链接、输入多行邮箱并发送邀请邮件。

`InvitationBackend` 已经是 TS，`InvitationListPage` 已经完成 TSX 迁移。本 change 只需要在页面边界定义局部类型，不需要改 backend client，也不改变列表页、新建默认邀请码或注册页消费邀请码的行为。

## Goals / Non-Goals

**Goals:**

- 将 `InvitationEditPage` 迁移为 `.tsx`，保留当前 class 组件结构。
- 使用明确局部类型描述 props、state、route params、邀请码记录、组织记录、应用记录、群组记录和发送邮件相关状态。
- 添加 `.test.tsx` 聚焦测试，覆盖加载、404、组织切换、字段更新、复制注册链接、发送邀请、保存/删除成功与失败、返回路由和网络错误。
- 通过 OpenSpec、增量 TS gate、`yarn typecheck`、聚焦 Jest/coverage 和 `yarn build` 验证。

**Non-Goals:**

- 不迁移 `InvitationBackend.ts`、`InvitationListPage.tsx`、`SignupPage.js`、`ManagementPage.js` 或其它页面。
- 不改变 `InvitationBackend` / `OrganizationBackend` / `ApplicationBackend` / `GroupBackend` 函数签名、API path、请求 payload、返回处理或错误文案。
- 不重写 class 组件为 hooks，不做视觉重设计，不改变 AntD 表单布局。
- 不引入全局邀请码类型模型或跨页面共享 abstraction。

## Decisions

### 1. 保留 class 组件结构

页面当前是 class 组件，行为依赖 lifecycle、history、window origin、clipboard 和发送邀请 Modal 状态。本 change 只做类型化，不改写 hooks，避免引入行为风险。

### 2. 页面内定义局部类型

`InvitationBackend` 已经导出 `InvitationRecord` 和 mutation 类型，但页面还需要兼容历史 route props、account props、组织默认应用、应用列表和群组选项。局部类型能覆盖本页面风险点，同时不扩大到全局组织账号模型。

### 3. 测试验证编辑行为而非重做 UI

测试重点覆盖用户可观察行为和业务不变量：加载成功、404 跳转、组织切换联动应用/群组加载、复制注册链接 fallback、发送邀请邮箱过滤、保存失败回滚名称、保存并退出、删除/取消新增和网络错误。测试不为普通 JSX 或样式堆行覆盖。

## Risks / Trade-offs

- **邮件发送 Modal 状态较宽松**：保留历史 `emails` / `showSendModal` / `sendLoading` 状态字段，局部 state 类型显式覆盖，测试验证有效邮箱过滤和错误处理。
- **复制注册链接依赖组织默认应用**：保留 built-in 使用 `Conf.DefaultApplication`、非 built-in 使用组织 `defaultApplication` 的逻辑，测试覆盖缺失默认应用时的错误提示。
- **历史 route props 宽松**：使用局部 route props 和可选 `organizationName`，保留现有从 `props.organizationName` 覆盖 `match.params.organizationName` 的行为。
- **新增取消使用 deleteInvitation**：保留现有行为，不改为纯前端取消。
