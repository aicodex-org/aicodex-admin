## Context

`RuleEditPage.js` 是 LLM AI/Gateway 治理规则编辑路由 `/rules/:organizationName/:ruleName` 的页面组件，通过 `RuleBackend.getRule/updateRule` 读取和保存规则，通过 `OrganizationBackend.getOrganizations` 为管理员加载组织下拉，并按规则 `type` 选择既有规则表格组件或 `CompoundRule`。这些依赖当前仍是 legacy JS 或独立 RC 的 TSX 候选，本 change 只迁移页面本身。

## Goals / Non-Goals

**Goals:**

- 将 `RuleEditPage` 迁移为 TSX，并用局部类型描述 props、route params、state、规则记录、表达式行、组织记录和后端响应。
- 保持现有路由、无后缀 import、字段编辑、类型切换清空 expressions、表达式表格回写、保存成功/失败和重新加载行为不变。
- 用 `.test.tsx` 聚焦覆盖页面行为和 TSX 迁移门禁，并运行增量 TypeScript gate、focused Jest/coverage、`yarn typecheck` 和 `yarn build`。

**Non-Goals:**

- 不迁移 `RuleBackend.js`、`OrganizationBackend.js`、规则表格组件或 `CompoundRule`。
- 不调整治理规则数据模型、Rule API、保存/删除语义、Gateway projection publish 或权限策略。
- 不做视觉重设计、React 生命周期重构、AntD 布局重做或全局 JS/TS 基建调整。

## Decisions

1. **使用局部兼容类型而非迁移 backend wrapper。**
   `RuleBackend.js` 和 `OrganizationBackend.js` 被多处 legacy 页面复用；本 change 只在 `RuleEditPage.tsx` 内声明页面需要的 `BackendResponse`、`RuleRecord` 和 `OrganizationRecord` 类型，避免扩大写集。

2. **保留现有 class component 和 `UNSAFE_componentWillMount`。**
   迁移目标是行为兼容 TSX，不重写为 hooks，降低路由、state 和调用方差异风险。

3. **继续通过无后缀路径导入规则表格和组合规则组件。**
   这允许当前页面同时兼容基线 JS 文件和后续独立 TSX RC 分支，不把其它规则组件迁移强绑定到本 change。

4. **测试优先覆盖页面可观察行为。**
   测试 mock 后端和子表格组件，验证页面对后端响应、字段变更、表达式回写和保存结果的行为，不调用真实后端或真实 Gateway 环境。

## Risks / Trade-offs

- **Risk: JS 子组件缺少静态类型。** → 使用页面局部 props 类型和 React component mock 测试页面边界；不为未迁移子组件伪造全局类型。
- **Risk: 迁移可能改变保存失败后的路由回写。** → 测试覆盖失败分支中的 `history.push` 和 `getRule` 重新加载。
- **Risk: 与已有规则表格/组合规则 RC 后续合入冲突。** → 保持 import 路径和 props 语义不变，只迁移页面文件，后续 rebase 冲突可局部解决。
