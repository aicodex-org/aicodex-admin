## Context

当前 `origin/hfl-test-base` 中，`AdapterListPage.js` 继承 `BaseListPage`，通过 `AdapterBackend.getAdapters` 读取列表，并提供新增、删除、分页、筛选、排序、表格操作和内置对象删除保护。`AdapterEditPage.js` 是 class component，通过 `AdapterBackend.getAdapter/updateAdapter/deleteAdapter/getPolicies` 和 `OrganizationBackend.getOrganizations` 处理加载、编辑、保存删除和数据库连接测试。

本 change 从最新 `origin/hfl-test-base` 独立启动，不依赖尚未合入 base 的角色/权限列表或编辑页 release candidate。执行器页面、`PolicyTable` 和 backend wrapper 仍保持 legacy JS。

## Goals / Non-Goals

**Goals:**

- 将 `AdapterListPage` 和 `AdapterEditPage` 保守迁移为 `.tsx`。
- 使用局部类型描述 props、route params、state、adapter record、organization record、pagination/fetch params、table columns 和 API response。
- 保持 `ManagementPage.js` 无后缀 import、`/adapters` 和 `/adapters/:organizationName/:adapterName` 路由、权限、文案、API 请求、保存删除 payload、数据库连接测试和导航行为不变。
- 新增 `.test.tsx` focused tests，覆盖列表页新增/删除/fetch/table render 和编辑页加载/字段更新/save/delete/useSameDb/DB test 关键路径。
- 通过增量 TypeScript gate、`yarn typecheck`、focused Jest/coverage 和 build/import 边界验证。

**Non-Goals:**

- 不迁移 `EnforcerListPage`、`EnforcerEditPage`、`PolicyTable`、`Role*`、`Permission*`、`Model*` 或其它权限角色页面。
- 不迁移 `AdapterBackend.js`、`BaseListPage.js`、`Setting.js`、`PopconfirmModal`、`ManagementPage.js` 或共享组件。
- 不改变适配器数据结构、数据库连接测试语义、内置对象保护、保存删除 payload、用户可见文案或路由语义。
- 不重写 class component 为 hooks，不 redesign UI，不升级 AntD API，不新增 UI 库。

## Decisions

1. **页面与测试同 change 迁移，backend wrapper 保持 JS。**
   - `AdapterBackend.js` 还承载 policy API，被执行器和 `PolicyTable` 路线复用。迁移 backend wrapper 会牵出高风险执行器/策略表格范围，因此本 change 在页面内使用局部类型描述当前消费字段和 response shape。

2. **保留 `BaseListPage` 继承和 class component 模式。**
   - 列表页继续继承当前分页、搜索、表格状态和授权空态逻辑；编辑页继续使用现有 `updateAdapterField`、`submitAdapterEdit` 和 `deleteAdapter` 流程，只补类型和必要的窄断言。

3. **`useSameDb` 切换和 DB test 是重点回归保护。**
   - 适配器编辑页的风险集中在 `useSameDb` 切换时清空/填充数据库字段，以及 DB test 使用 `getPolicies("", "", "<owner>/<name>")` 的适配器探测路径。测试应覆盖这些用户可观察行为和 API 边界。

4. **测试以用户可观察行为和 API 边界为准。**
   - focused tests mock legacy backend、BaseListPage 必要状态和 AntD/Modal 交互，验证新增、删除、列表 fetch、字段更新、保存 payload、错误提示、数据库连接测试和导航。测试不调用真实后端，不依赖真实数据库。

## Risks / Trade-offs

- **列表页继承 `BaseListPage`。** Mitigation：只迁移页面自身，保留继承关系和现有 fetch 参数；不修改 shared list 基类。
- **编辑页暴露数据库连接字段。** Mitigation：只保留现有字段和行为，不新增敏感字段展示；测试使用 mock 数据，不写入真实连接串。
- **执行器和 `PolicyTable` 也依赖 adapter/policy API。** Mitigation：不迁移 backend wrapper，不修改 policy API 调用方；如实施必须实质修改执行器或 `PolicyTable`，停止并请求主控决策。

## Rollback

无数据库或后端迁移。若需要回滚，恢复两个适配器页面为 `.js` 并移除对应 `.test.tsx` 与 OpenSpec 归档即可；路由、API 和数据无独立迁移状态。
