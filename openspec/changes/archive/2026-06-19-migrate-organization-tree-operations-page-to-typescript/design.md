## Context

`OrganizationTreeOperationsPage.js` 是“组织账号”菜单下的组织树运营页，负责展示组织树诊断、来源连接/生命周期/新鲜度筛选、树/表视图切换、刷新动作、部门成员分页抽屉和技术详情。页面已有 `OrganizationTreeOperationsPage.test.js` 覆盖主要行为，专用 API wrapper 为 `backend/OrganizationTreeOperationsBackend.js`。

当前增量 TypeScript 路线要求：触碰历史 React 页面时，低风险迁移优先落到 `.tsx`；对应 React 测试优先迁移为 `.test.tsx`；新增或触碰的请求/响应结构优先使用 `.ts` 局部类型。该 change 只做类型迁移，不重新设计页面。

## Goals / Non-Goals

**Goals:**

- 保守迁移 `OrganizationTreeOperationsPage` 到 TSX，并补齐 props、state、诊断响应、成员响应和表格/树节点等局部类型。
- 迁移 `OrganizationTreeOperationsBackend` 到 TS，导出页面可复用的请求/响应类型。
- 将 `OrganizationTreeOperationsPage.test.js` 迁移为 `.test.tsx`，保持既有覆盖目标，并在必要处补充类型安全的 mock/harness。
- 通过 OpenSpec、增量 TS gate、`yarn typecheck`、聚焦 Jest/coverage、`yarn build` 验证。

**Non-Goals:**

- 不修改 `/organization-tree-operations` 路由、权限、API path、请求参数或后端 Go 行为。
- 不改组织树运营页的信息架构、视觉设计、文案、状态分类、刷新语义或脱敏策略。
- 不迁移 `OrganizationDirectoryQualityPage`、`OrganizationBackend`、`Setting`、组织/用户/群组编辑页或其它组织账号页面。
- 不读取或写入真实组织数据，不触碰 `test` 分支。
- 不在本 change 内合入或 push `hfl-test-base`；本路线按 release-candidate-only 交付，后续由主控统一重放和合入多个组织账号 TS 迁移 RC。

## Decisions

1. **保持 class component，不重写为 hooks。**
   - 理由：当前页面已有大量实例方法和测试 ref 断言，保守迁移可以最大限度保留行为和测试结构。
   - 替代方案：重写为函数组件和 hooks。该方案会制造无关行为风险，不适合本次 TS 迁移。

2. **在 backend wrapper 中定义请求/响应核心类型，在页面内保留展示派生类型。**
   - 理由：API wrapper 是后端契约入口，诊断/成员响应类型可被页面和测试共享；表格列、树节点、筛选 state 属于页面展示细节，留在页面局部更轻。
   - 替代方案：新增全局 organization tree types 文件。当前只有一个页面消费，额外抽象收益不足。

3. **测试迁移为 `.test.tsx`，优先保留现有断言而非重做测试体系。**
   - 理由：本 change 的可验收结果是行为不变的 TSX 迁移，原测试已经表达主要交互路径。
   - 替代方案：大幅重写测试 mock 或引入新测试工具。会扩大 diff，降低 review 性。

## Risks / Trade-offs

- 历史响应字段较多且存在可选值，类型可能需要局部宽松处理 → 使用显式 optional 字段、`unknown` 收窄和页面局部转换，避免无解释 `any`。
- AntD/React Router 旧类型表面可能与运行时 API 不完全一致 → 仅在边界使用窄范围兼容类型，不改变运行时代码路径。
- 迁移测试可能暴露既有 React 18 / AntD warning → 记录为既有测试环境噪声；只要断言通过，不把 warning 当成本 change 行为变更。
- 多条组织账号 TS 迁移 RC 尚未统一合入 base → 本 change 只 push 工作分支并在报告/台账中说明 base 未合入，避免破坏后续统一重放顺序。
