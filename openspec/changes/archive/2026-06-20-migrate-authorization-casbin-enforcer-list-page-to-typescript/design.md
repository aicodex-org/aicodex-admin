## Context

`EnforcerListPage.js` 当前是 React class component，继承 `BaseListPage` 并实现以下行为：

- `newEnforcer()` 使用 `Setting.getRandomName()` 与当前请求组织生成默认执行器对象。
- `addEnforcer()` 调用 `EnforcerBackend.addEnforcer()`，成功后跳转到 `/enforcers/:owner/:name` 并带 `mode: "add"`。
- `deleteEnforcer(index)` 调用 `EnforcerBackend.deleteEnforcer()`，成功后按当前分页刷新列表。
- `renderTable(enforcers)` 渲染 Name、Organization、Created time、Display name、Model、Adapter 和 Action 列，Action 列保留内置对象删除保护。
- `fetch(params)` 调用 `EnforcerBackend.getEnforcers()`，保持 default organization 与 selected organization 的现有 owner 参数语义，并处理授权拒绝。

既有评估已把执行器页面拆为两个后续候选：列表页可独立低风险迁移；编辑页必须与 `table/PolicyTable.js` 一起设计，因为策略 CRUD 直接经过 `AdapterBackend`。

## Goals / Non-Goals

**Goals:**

- 将 `EnforcerListPage` 保守迁移为 `.tsx`。
- 使用局部类型描述 account、history、执行器记录、分页状态、fetch 参数、backend response 和 AntD 表格列。
- 保持 `ManagementPage.js` 无后缀 import、`/enforcers` 路由、列表列、分页筛选排序、新增、删除、错误提示、授权拒绝和导航行为不变。
- 新增 `.test.tsx` focused tests，覆盖列表页高价值行为和迁移后文件后缀约束。
- 通过 OpenSpec strict、增量 TypeScript gate、`yarn typecheck`、focused Jest coverage 和 build/import 边界验证。

**Non-Goals:**

- 不迁移 `EnforcerEditPage.js` 或 `table/PolicyTable.js`。
- 不迁移 `EnforcerBackend.js`、`AdapterBackend.js`、`BaseListPage.js` 或共享 backend 类型。
- 不迁移角色/权限、Casbin 模型、Casbin 适配器或授权关系与证据页面。
- 不新增 API，不改后端，不改权限模型，不改 Casbin policy 同步、增删改查或保存语义。
- 不重写 class component 为 hooks，不修复旧生命周期，不 redesign UI，不改变文案/i18n key。

## Decisions

1. **只迁移列表页，不触碰编辑页与策略表。**
   - `EnforcerListPage` 的行为集中在列表和执行器对象 CRUD；`EnforcerEditPage` 与 `PolicyTable` 承载 policy CRUD，应作为独立高风险 change。

2. **保留 `BaseListPage` 继承模式。**
   - `BaseListPage.js` 仍是 legacy JS。本 change 只在子类中补局部 props/state/fetch 类型和必要窄断言，避免扩大共享基类写集。

3. **测试围绕用户可观察行为和边界参数。**
   - focused tests mock `EnforcerBackend` 与 `Setting` 边界，验证表格列、链接、toolbar、add/delete/fetch 参数、错误提示和授权拒绝。测试不调用真实 API。

4. **保持 release candidate 交付。**
   - 当前路线已有多个未合入 RC。除非后续任务明确 `self-closeout=true`，本 change 完成后只 push 工作分支，不自行合入 `hfl-test-base` 或删除工作分支。

## Risks / Trade-offs

- **legacy JS 依赖缺少类型。** 通过局部接口和窄范围类型断言隔离，不迁移共享 backend 或 `BaseListPage`。
- **AntD Table columns 与 JS 基类方法类型不完整。** 使用局部列类型和继承方法声明保持 typecheck 通过，不改变列配置。
- **执行器编辑与策略表仍为 JS。** 这是已识别的后续高风险 change，不作为本 change 阻断。

## Rollback

无数据库或后端迁移。若需要回滚，恢复 `EnforcerListPage.tsx` 为 `.js`，移除对应 `.test.tsx` 和本 OpenSpec 归档即可；路由和 API 没有独立迁移状态。
