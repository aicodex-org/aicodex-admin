## Context

治理规则迁移评估 change 已确认后续拆分顺序：先迁移 `RuleListPage`，再迁移表达式表格组件、`CompoundRule` 和 `RuleEditPage`。当前规则列表页只依赖 `RuleBackend.getRules/addRule/deleteRule`、`BaseListPage` 和 AntD `Table`/`Popconfirm`，不直接触碰规则表达式编辑器，是治理规则链路里风险最低的实施入口。

本 change 从最新 `origin/hfl-test-base` 独立分支实施，只迁移规则列表页和对应测试，保持 JS/TS 共存，不要求治理规则评估 change 已归档，也不接管 Site Scope RC。

## Goals / Non-Goals

**Goals:**

- 将 `RuleListPage` 迁移为 TSX，并补充局部类型描述 props、state、Rule 记录、Expression 记录、fetch 参数、RuleBackend response 和 AntD 表格列。
- 保持 `/rules` 路由、`ManagementPage` extensionless import、列表加载、新增、删除、分页回退、排序、编辑跳转、Tag 渲染和现有可见文案不变。
- 用 `.test.tsx` 聚焦测试覆盖用户可观察行为和 Rule API 调用边界，并用 changed-file coverage 验证迁移文件。

**Non-Goals:**

- 不迁移 `RuleEditPage.js`、`common/CompoundRule.js`、`WafRuleTable.js`、`IpRuleTable.js`、`UaRuleTable.js` 或 `IpRateRuleTable.js`。
- 不迁移 `RuleBackend.js`，不新增共享 Rule API 类型模型。
- 不修改规则表达式 row shape、Rule API path、payload shape、规则保存/删除语义、Gateway projection publish、权限、后端接口或数据库。
- 不触碰 MCP Store、MCP Server、站点范围、入口配置、应用接入、组织账号或权限角色路线。

## Decisions

1. **保留 legacy class component 和 `BaseListPage` 继承。**
   - 原因：本 change 是行为兼容迁移，不重写页面结构或列表基类。
   - 取舍：通过局部 compat 类型描述 `BaseListPage` 当前调用面，避免扩大到共享基类迁移。

2. **继续保留 `RuleBackend.js`。**
   - 原因：后端 wrapper 迁移会牵出编辑页和表达式组件的共享 API 边界，超出规则列表页迁移范围。
   - 取舍：页面通过本地 `BackendResponse` 和 `RuleBackendCompat` 描述需要的 API 形状。

3. **测试优先覆盖行为而不是只覆盖 mock 调用。**
   - 原因：当前规则列表页没有对应测试，TSX 迁移需要回归保护。
   - 验收重点：列表加载参数、新增默认 rule、删除分页回退、失败提示、表格列 render、Tag 内容和编辑跳转。

## Risks / Trade-offs

- `RuleListPage` 对 `updatedTime`、`statusCode`、`reason` 等字段存在 legacy 空值假设 → 类型迁移保持兼容，不借机更改排序或 fallback 行为。
- 表达式列直接读取 `expression.operator` 和 `expression.value.slice(0, 20)` → 保留显示逻辑，并在测试中覆盖表达式 Tag 渲染。
- `BaseListPage` 仍是 JS → 仅声明当前页面使用的成员，避免迁移共享基类导致无关页面风险。
- 未做真实浏览器 smoke → 本 change 不改 UI 布局和路由注册，主要通过 focused Jest、typecheck、增量 TS gate 和必要 build 验证。

## Migration Plan

1. 完成 OpenSpec artifacts，并通过实施前 review。
2. 先新增 `RuleListPage.test.tsx`，在 `.tsx` 尚不存在时确认迁移断言按预期失败。
3. 将 `RuleListPage.js` 迁移为 `RuleListPage.tsx`，补齐局部类型并保持行为不变。
4. 运行 focused Jest/coverage、增量 TS gate、`yarn typecheck`、OpenSpec 校验和必要 build。
5. 完成归档前 review 后等待 closeout 授权，不自行 push/merge `test`。

## Open Questions

- 无。当前范围可由治理规则评估结论和现有 `RuleListPage` 代码收口。
