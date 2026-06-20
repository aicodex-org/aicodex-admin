## Context

`CompoundRule` 是 `RuleEditPage.js` 在规则类型为 `Compound` 时使用的组合规则编辑器。它当前负责：

- 在组件加载前调用 `RuleBackend.getRules(owner)`。
- 将返回的规则转换为 `owner/name` 标识。
- 过滤当前正在编辑的 `owner/ruleName`，避免组合规则引用自身。
- 维护默认两行表达式：`begin rule1` 与 `and rule2`。
- 通过传入的 `table` 数组原地更新表达式行，并调用 `onUpdateTable(table)` 回写给 `RuleEditPage`。

本 change 只迁移 `CompoundRule` 本身。`RuleEditPage.js` 仍保持 legacy JS，通过 `./common/CompoundRule` 无后缀路径解析到 `.tsx` 默认导出。

## Goals / Non-Goals

**Goals:**

- 将 `CompoundRule` 迁移为 TSX，并用局部类型描述 props、state、规则表达式行、Rule API 列表响应和表格列。
- 保持候选规则加载、自引用过滤、默认表达式、添加、删除、上下移动、restore、字段回写和渲染结构兼容。
- 用 `.test.tsx` 聚焦覆盖组合规则关键行为，尤其是候选规则不能包含当前规则。

**Non-Goals:**

- 不迁移 `RuleEditPage.js`、`RuleBackend.js` 或共享 Rule API 类型模型。
- 不迁移 WAF/IP/User-Agent/IP Rate Limiting 表达式表格；它们由独立 change 处理。
- 不修改组合规则表达式 schema、Rule API payload、保存/删除语义、权限、Gateway projection publish 或后端接口。
- 不做 UI redesign，不改变按钮、文案、i18n key、表格列顺序或 `rowKey="index"` 行为。

## Decisions

1. **局部类型优先，不抽取共享 Rule 类型。**
   - 理由：`RuleBackend.js` 和 `RuleEditPage.js` 仍是 legacy JS；在本 change 抽取共享类型会牵出 API wrapper 与编辑页迁移。
   - 替代方案：同时迁移 `RuleBackend.js` 或新增共享 Rule model。该方案写集更大，不适合当前小步迁移。

2. **保留 `UNSAFE_componentWillMount` 和 class component。**
   - 理由：`CompoundRule` 当前由 legacy `RuleEditPage` 调用，迁移目标是类型化和行为兼容，不改变生命周期或渲染模式。
   - 替代方案：重写为 function component + hooks。该方案会改变生命周期触发时机和测试面，留给后续行为重构。

3. **继续原地修改传入的 `table` 数组。**
   - 理由：现有 `RuleEditPage` 和普通表达式表格都依赖原地修改后回调的 legacy 契约；本 change 不改变表达式回写语义。
   - 替代方案：改为不可变更新。该方案更合理但属于行为重构，不适合 TSX 迁移。

4. **测试直接实例化组件并渲染列 render 输出。**
   - 理由：组合规则核心行为集中在 class methods、Rule API promise 和 AntD column render；直接实例化能聚焦验证现有行为并保持测试快速稳定。
   - 替代方案：浏览器级完整编辑页测试。该方案更接近用户流程，但会牵出 `RuleEditPage` 与其它表格组件，不符合本 change 边界。

## Risks / Trade-offs

- `CompoundRule` 保留 legacy 生命周期和原地数组更新；后续若要现代化 React 模式，应另建行为重构 change。
- `addRow(table)` 仍保留现有 `table.length` 先执行的行为；本 change 不新增对 `undefined` 的容错。
- 本 change 只验证组合规则组件层，不声明规则编辑页完整端到端行为已通过。
