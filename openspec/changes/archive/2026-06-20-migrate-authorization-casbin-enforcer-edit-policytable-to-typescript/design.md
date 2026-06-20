## Context

`EnforcerEditPage.js` 是 React class component，负责加载执行器、组织、model 和 adapter 列表，并在表单中编辑执行器字段。页面底部渲染 `PolicyTable`，将 `enforcer`、`modelCfg` 和 `mode` 传入策略表。

`PolicyTable.js` 是 React class component，维护：

- `policyLists`：策略表数据。
- `editingIndex` / `oldPolicy`：行内编辑和取消回滚状态。
- `add`：新增行保存时走 `AddPolicy` 还是 `UpdatePolicy`。
- `page` / `pageSize` / `getIndex()`：AntD 表格分页下的可见行索引到真实数据索引映射。

该组件直接调用 `AdapterBackend.getPolicies`、`UpdatePolicy`、`AddPolicy` 和 `RemovePolicy`。因此迁移必须把编辑页和策略表放在同一 change 内测试，不扩大到 backend wrapper 或后端接口。

## Goals / Non-Goals

**Goals:**

- 将 `EnforcerEditPage` 与 `PolicyTable` 保守迁移为 `.tsx`。
- 使用局部类型描述执行器、组织、model、adapter、modelCfg、policy row、backend response 和组件 state。
- 保持执行器加载、组织列表加载、model/adapter 选项加载、字段编辑、保存、保存并退出、保存失败回滚 name、取消新增删除行为不变。
- 保持 `PolicyTable` 的 policy sync、动态列、分页 index 映射、add/edit/cancel/save/delete、duplicate policy、disabled states 和错误提示不变。
- 新增 `.test.tsx` focused tests，覆盖高风险行为和迁移后文件后缀约束。
- 通过 OpenSpec strict、增量 TypeScript gate、`yarn typecheck`、focused Jest coverage 和 build/import 边界验证。

**Non-Goals:**

- 不迁移 `EnforcerListPage`、角色/权限页面、Casbin 模型页面、Casbin 适配器页面或授权关系与证据页面。
- 不迁移 `AdapterBackend.js`、`EnforcerBackend.js`、`ModelBackend.js`、`OrganizationBackend.js` 或共享 backend 类型。
- 不重写 class component 为 hooks，不 redesign UI，不修改文案/i18n key。
- 不新增 API，不改后端，不改 Casbin policy payload、执行器保存 payload、权限模型或内置对象只读规则。

## Decisions

1. **编辑页与策略表同迁移。**
   - `PolicyTable` 是编辑页最重要的行为面，单独迁移编辑页会留下 TS/JS 边界不清和测试盲区。

2. **backend wrapper 保持 legacy JS。**
   - 本 change 只在迁移文件内定义局部 backend API 类型，避免改动共享 wrapper 和其它消费者。

3. **保留 class component、旧生命周期和 AntD 表格结构。**
   - 行为兼容优先。生命周期现代化、hooks 重写、表格交互重构均不属于本 change。

4. **测试覆盖策略 CRUD 的状态机。**
   - 使用 focused Jest 测试实例化组件和渲染关键节点，mock backend/Setting 边界；不调用真实 API，不依赖真实 Casbin 服务。

## Risks / Trade-offs

- **`PolicyTable` 直接修改传入 table 数组。** 本 change 不改变该行为，只补类型和测试，避免引入策略编辑语义变化。
- **分页 index 映射容易回归。** 测试必须覆盖 `getIndex()`、分页下编辑/删除指向真实数据行。
- **duplicate policy 语义非直观。** `AddPolicy` 返回 `status: ok` 但 `data !== "Affected"` 时仍显示错误；迁移时必须保持。
- **真实策略 API 未运行态验证。** 本 change 不改 API 路径或 payload，验证层级为源码/typecheck/Jest/build；真实环境 smoke 可由主控后续统一安排。

## Rollback

无数据库或后端迁移。若需要回滚，恢复 `EnforcerEditPage.tsx` 和 `table/PolicyTable.tsx` 为 `.js`，移除对应 `.test.tsx` 与本 OpenSpec 归档即可；路由、API 和后端无独立迁移状态。
