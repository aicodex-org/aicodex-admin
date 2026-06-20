## Context

当前 `origin/hfl-test-base` 中，`EnforcerListPage.js` 是典型 `BaseListPage` 列表页，负责新增、删除、分页、筛选、排序和跳转。`EnforcerEditPage.js` 是 class component，负责加载执行器、组织、模型、适配器，并在编辑表单中嵌入 `table/PolicyTable.js`。

`PolicyTable.js` 不是只读展示组件。它维护 `policyLists`、`editingIndex`、`oldPolicy`、`add`、`page` 等本地状态，通过 `AdapterBackend.getPolicies`、`UpdatePolicy`、`AddPolicy`、`RemovePolicy` 对当前执行器策略做同步、新增、编辑、取消和删除。它的行为依赖 `modelCfg["p"]` 动态生成列，也依赖 `getIndex()` 把当前页表格 index 映射回完整数据源 index。

## Goals / Non-Goals

**Goals:**

- 识别 Casbin 执行器迁移的安全拆分点。
- 明确 `EnforcerListPage` 可以先作为独立低风险 TSX 迁移候选。
- 明确 `EnforcerEditPage` 与 `PolicyTable` 不应在普通页面迁移中被拆散；后续应作为单独高风险 change 设计测试和覆盖率。
- 为后续迁移列出必须保留的路由、API、payload、策略表编辑和内置对象保护行为。

**Non-Goals:**

- 不在本 change 迁移 `EnforcerListPage.js`、`EnforcerEditPage.js`、`PolicyTable.js` 或 backend wrapper。
- 不新增 API、不修改后端、不改变 Casbin model/adapter/policy 语义。
- 不重写 class component 为 hooks，不重构 `PolicyTable` 状态机，不 redesign UI。
- 不依赖尚未合入 `hfl-test-base` 的 Adapter release candidate。

## Decisions

1. **拆分为列表页候选和编辑页/策略表候选。**
   - `EnforcerListPage` 与前序 Role/Permission/Adapter 列表模式一致，主要风险是列表 fetch 参数、表格列、删除后分页回退和新增跳转。
   - `EnforcerEditPage` 的核心风险来自 `PolicyTable`。编辑页迁移如果只给 `PolicyTable` props 随意加 `any`，会掩盖 policy CRUD 和动态列行为，不能提供足够回归保护。

2. **`PolicyTable` 后续迁移必须覆盖完整策略表行为。**
   - 需要覆盖 `modelCfg` 缺失时不渲染表格、`mode=edit` 自动同步、动态列生成、分页 index 映射、新增行、编辑、取消新增、保存更新、保存新增、重复 policy、删除 policy、同步成功/失败/网络错误、内置对象禁用和 model/adapter 为空禁用。

3. **backend wrapper 保持 JS，除非后续 change 明确包含 wrapper 类型迁移。**
   - `AdapterBackend.js` 已被适配器页面、执行器编辑页和 `PolicyTable` 共享。直接迁移 wrapper 会扩大到适配器和 policy API 消费方，不适合在评估 change 中处理。

4. **后续实施建议顺序。**
   - 下一候选 change：`migrate-authorization-casbin-enforcer-list-page-to-typescript`，只迁移列表页和 focused `.test.tsx`。
   - 再下一候选 change：`migrate-authorization-casbin-enforcer-edit-policytable-to-typescript`，共同迁移编辑页和 `PolicyTable`，必要时只补局部类型 facade，不改变 API。

## Risks / Trade-offs

- **风险：先迁移列表页会让执行器菜单仍有部分 JS。** Mitigation：这是增量 TS 路线的预期状态，主规格明确 JS/TS 共存。
- **风险：编辑页和 `PolicyTable` 覆盖面大。** Mitigation：单独 change 设计 focused tests 和 coverage，不与列表页迁移混在一起。
- **风险：policy CRUD 牵涉真实策略数据。** Mitigation：后续测试使用 mock backend 覆盖 payload 和状态变化；真实环境验证如需执行必须另行授权并脱敏记录。
- **风险：`AdapterBackend` 同时服务适配器和策略 API。** Mitigation：后续默认保持 wrapper JS，只在页面内用局部类型约束当前消费字段。
