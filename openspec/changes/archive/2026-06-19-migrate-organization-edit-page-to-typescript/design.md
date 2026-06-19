## Context

`OrganizationEditPage.js` 是组织账号菜单里的核心编辑页，当前仍是 JavaScript class component。页面依赖多个历史 JS backend 模块和表格组件，负责组织基础字段、主题、LDAP、MFA、导航配置、交易记录和保存/删除流程。

本 change 处在 `web-admin` 渐进 TypeScript 路线中，目标是让被触碰的 React 页面逐步迁移到 `.tsx`，但不把一次页面迁移扩大成全量组织账号重构。

## Goals / Non-Goals

**Goals:**

- 将 `OrganizationEditPage` 本身迁移为 `.tsx`，保留 class component 结构。
- 用局部 interface/type 描述页面 props、state、组织记录和本页直接消费的 backend 响应。
- 补充 React `.test.tsx` 聚焦测试，覆盖页面核心可观察行为。
- 通过增量 TS gate、`yarn typecheck`、聚焦 Jest/coverage 和 `yarn build` 验证 JS/TSX 共存。

**Non-Goals:**

- 不重写为 hooks，不重做页面 UI，不改变表单布局、文案或交互。
- 不迁移 `OrganizationBackend.js`、`ApplicationBackend.js`、`LdapBackend.js`、`TransactionBackend.js` 或组织账号其它页面。
- 不修改后端 API、权限、认证、OAuth/OIDC、Provider、Gateway projection 或真实环境配置。
- 不把已有工具测试强行改名，除非该测试直接渲染迁移后的 TSX 页面。

## Decisions

- **保留 class component。** 该页面状态和副作用较多，直接迁移 class component 可以把风险集中在类型边界，避免 hooks 重写引入行为差异。
- **使用局部兼容类型。** 历史 backend 和表格组件仍是 JS，本 change 在页面内定义最小可用类型，必要处用 `unknown` 或索引签名承接历史字段，不抽取全局模型。
- **新增 `.test.tsx` 而不是扩写 `.test.ts`。** 现有 `OrganizationEditPage.test.ts` 只覆盖纯工具函数；页面渲染和交互测试包含 JSX，应使用 `.test.tsx`。
- **覆盖关键行为而非每个字段。** 页面字段很多，测试聚焦加载成功/失败、保存、删除、取消、主题回调、事件派发和交易记录条件展示，避免低价值快照或逐项 mock 调用断言。

## Risks / Trade-offs

- **历史 JS 依赖类型不完整** → 使用局部类型和少量兼容边界，避免在本 change 中迁移整个 backend/table 依赖链。
- **页面体量较大，测试环境可能暴露 React/AntD 旧用法警告** → 聚焦可观察行为并记录非阻塞既有警告，不把无关 UI 重构混入本 change。
- **多个组织账号 TS 迁移 RC 尚未合入** → 本分支从最新 `origin/hfl-test-base` 独立创建，spec delta 使用新增 requirement，后续合并 RC 时需要保留各迁移场景。
