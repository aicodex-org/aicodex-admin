## Context

`GroupTreePage.js` 目前是 React class component，服务 `/trees/:organizationName` 和 `/trees/:organizationName/:groupName` 两个入口。页面左侧读取群组树，右侧内嵌 `UserListPage` 展示全部用户或选中群组下的用户，并提供新增根群组、新增子群组、编辑和删除叶子群组等操作。

当前仓库允许 `.js`、`.ts`、`.tsx` 共存。多个组织账号 TS 迁移 release candidate 可能尚未合入，所以本 change 必须从最新 `origin/hfl-test-base` 独立推进，不能依赖未合入的 `InvitationListPage`、`GroupListPage`、`OrganizationListPage` 或 `UserListPage` 迁移结果。

## Goals / Non-Goals

**Goals:**

- 将 `GroupTreePage.js` 保守迁移为 `GroupTreePage.tsx`。
- 使用局部类型描述账户、路由 props、群组树节点、页面 state、新建群组对象和 Group backend 响应。
- 保持 `ManagementPage.js` 无后缀导入、路由、权限、组织筛选、树选择、群组新增/编辑/删除和内嵌用户列表行为不变。
- 新增 `.test.tsx` 聚焦测试，覆盖群组树主要交互和错误分支。
- 按增量 TypeScript 门禁验证 JS/TSX 共存路径。

**Non-Goals:**

- 不迁移 `GroupBackend.js`、`GroupListPage.js`、`GroupEditPage.js`、`UserListPage.js`、`UserEditPage.js`、`OrganizationListPage.js` 或其它组织账号页面。
- 不重写为函数组件，不改变生命周期调用顺序，不引入新的状态管理。
- 不改变后端 API、权限模型、群组字段、组织筛选规则、路由路径、菜单信息架构或可见文案。
- 不触碰身份来源、企业微信/飞书组织同步、OIDC、Gateway、Insight 或真实环境配置。

## Decisions

1. **保守 class component 迁移。**
   继续保留 class component 和现有方法名，只补 `Props` / `State` / 节点类型。这样能把 diff 限制在后缀和类型层，避免同时引入 hook 重写、生命周期修正或 UI 行为变化。

2. **用局部兼容类型包住 legacy JS 依赖。**
   `GroupBackend.js`、`Setting.js`、`OrganizationSelect` 和 `UserListPage` 暂不迁移。`GroupTreePage.tsx` 通过本地接口描述实际用到的字段和响应，必要时用窄范围类型断言处理 legacy JS 模块边界，不扩散 `any`。

3. **测试以页面行为为边界。**
   聚焦测试 mock `GroupBackend`、`Setting`、`OrganizationSelect` 和 `UserListPage`，验证树加载、导航、操作调用和消息反馈。测试不连接真实 API，不依赖真实组织/用户/群组数据。

4. **不吸收未合入 RC。**
   当前 change 独立基于 `origin/hfl-test-base`。如果后续统一合入多条组织账号 TS 迁移 RC，再按合入顺序处理无后缀导入和主规格 delta 冲突。

## Risks / Trade-offs

- **React class lifecycle 仍保留 `UNSAFE_componentWillMount`。** → 本 change 只迁移类型，不修旧生命周期，避免改变加载时机；测试覆盖首次加载行为。
- **legacy JS 模块缺少完整类型。** → 使用页面内局部类型限制边界，避免为了类型完整性迁移过多文件。
- **`UserListPage` 在基线仍是 JS。** → 页面继续按无后缀导入，TSX 只验证能嵌入调用，不要求同一 change 迁移用户列表。
- **多个独立 RC 后续合入可能产生主规格冲突。** → 本 change 使用独立 `ADDED Requirement`，后续合入时保留各迁移场景即可。
