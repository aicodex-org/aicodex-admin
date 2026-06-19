## Context

飞书组织同步页面是身份源菜单下目前最大的遗留 JS 页面之一：

- `FeishuOrganizationSyncPage.js` 约 1900 行，包含配置表单、组织选择、连接测试、dry-run preview、dry-run history、user binding conflicts、handoff evidence、同步记录表、运行 ID 复制和自动刷新。
- `FeishuOrganizationSyncPage.test.js` 覆盖大量页面行为，但仍是 `.test.js`。
- `FeishuOrganizationSyncBackend.js` 是页面唯一 backend client，封装配置、dry-run、history、binding conflict、handoff evidence 和 run endpoints。
- 已有 `FeishuOrganizationSyncPageUtils.ts` 和 `organizationSync/FeishuOrganizationSyncTypes.ts` 可作为局部类型复用基础。

本 change 是迁移型 change，不重新设计飞书同步 UI，也不改变任意后端契约。

## Goals / Non-Goals

**Goals:**

- 迁移 `FeishuOrganizationSyncPage` 为 `.tsx`，用明确局部类型覆盖页面 props、state、配置、运行记录、preview/history/evidence 等数据。
- 迁移 `FeishuOrganizationSyncBackend` 为 `.ts`，导出页面和测试可复用的请求/响应类型。
- 迁移主页面测试为 `.test.tsx`，保留现有断言并处理旧 testing-library / Jest 类型边界。
- 保持 `ManagementPage.js` 继续通过同名模块导入页面。
- 运行增量 TypeScript 门禁、`yarn typecheck`、聚焦 Jest、coverage、`yarn build` 和 OpenSpec 校验。

**Non-Goals:**

- 不重构为函数组件，不引入新的状态管理，不抽离大批新组件。
- 不改变页面视觉、文案、按钮位置、表格列、弹窗/抽屉内容、自动刷新间隔、分页或复制行为。
- 不迁移企业微信同步页面、同步器列表页或同步器编辑页。
- 不修改后端飞书组织同步对象、API、权限、调度、dry-run/history/binding/evidence 语义。
- 不读取真实飞书/Lark secret，不触发真实租户同步，不写真实 fixture。

## Decisions

### Decision 1: 直接迁移主页面为 TSX

页面已被当前任务明确触碰，且目标是迁移飞书同步主页面。直接重命名为 `.tsx` 并补类型，可以最大程度保留现有运行时结构，也避免 wrapper 双入口和额外渲染层。

### Decision 2: Backend client 一起迁移为 TS

页面状态类型依赖 backend 响应。将 `FeishuOrganizationSyncBackend.js` 一起迁移为 `.ts`，可以集中定义响应 shape，降低页面内重复接口和隐式对象访问。

### Decision 3: 不在本 change 做 UI polish

用户已多次强调飞书/企业微信页面应简洁一致，但本 change 目标是 TS 迁移。任何 UX 简化或页面一致性调整应作为独立产品 change；本 change 只做必要类型和测试适配。

### Decision 4: 允许局部 legacy 类型边界

页面仍依赖 Ant Design、旧 testing-library、Jest JS mock 和若干历史 JS helper。若必须与旧 JS 边界交互，使用 `unknown`、局部接口或最小 `LooseMock` 类型隔离，不向全局扩散 `any`。

## Risks / Mitigations

- **风险：大页面迁移引入行为回归。** 缓解：保留现有测试断言，迁移为 `.test.tsx` 后运行聚焦 Jest 和 build。
- **风险：TS 类型过宽导致迁移价值下降。** 缓解：backend client 导出核心响应类型；页面状态和主要数据结构使用明确 interface，旧 JS/mock 边界用局部类型隔离并说明。
- **风险：为了通过类型检查顺手改 UI。** 缓解：Non-Goals 明确不做视觉、文案和交互重排；diff review 聚焦后缀、类型和测试适配。
- **风险：真实飞书运行态被误触发。** 缓解：测试全部 mock backend client，不调用真实 Contact v3，不读取 secret。

## Migration Plan

1. 创建 proposal、design、tasks 和 `web-admin-incremental-typescript` spec delta。
2. 完成实施前 review，确认范围只包含飞书同步主页面、backend client 和主测试迁移。
3. 迁移 backend client 到 `.ts` 并导出核心类型。
4. 迁移页面到 `.tsx`，逐步修复 `yarn typecheck` 暴露的 props/state/AntD/Jest 类型边界。
5. 迁移主页面测试到 `.test.tsx`，保留现有覆盖；必要时更新 mock 类型，不改变断言语义。
6. 运行验证、记录 coverage 和 warning，完成归档前 review、archive 和单 commit closeout。
