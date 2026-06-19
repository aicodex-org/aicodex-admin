## Context

`OrganizationDirectoryQualityPage.js` 是“组织账号”菜单下较大的目录质量诊断页面，负责展示组织目录质量列表、聚合摘要、原因 alias、修复计划、action draft、preflight、审批预览、审计和 operator note readiness 等只读信息。页面当前是函数组件并已使用 hooks，配套测试 `OrganizationDirectoryQualityPage.test.js` 已覆盖主要加载、筛选、导出、错误和详情场景。

当前增量 TypeScript 路线已经把多个组织账号页面和部分 backend wrapper 合入 `hfl-test-base`。本 change 继续迁移目录质量页面，但不迁移共享 `PlatformApiMappingBackend.js`，因为该 wrapper 同时承载 API 映射、目录质量、修复预览等多组接口，迁移它会扩大到非本页面写集。

## Goals / Non-Goals

**Goals:**

- 将 `OrganizationDirectoryQualityPage` 迁移为 `.tsx`，保留当前函数组件和 hooks 结构。
- 将 `OrganizationDirectoryQualityPage.test.js` 迁移为 `.test.tsx`，保留现有测试意图，并修复 TS/Jest mock 类型。
- 在页面内定义局部响应和展示类型，覆盖列表项、摘要、计划、draft、preflight、审批预览、审计、operator note readiness、分页和筛选状态。
- 通过 OpenSpec、增量 TS gate、`yarn typecheck`、聚焦 Jest/coverage 和 `yarn build` 验证。

**Non-Goals:**

- 不迁移 `PlatformApiMappingBackend.js`、`Setting.js`、`ManagementPage.js` 或其它组织账号页面。
- 不改变 `/organization-directory-quality` 路由、权限、API path、请求参数、导出行为、分页筛选、详情 Drawer、错误态、空态或用户可见文案。
- 不修改后端 Go、数据库、真实目录质量数据、API/Gateway/Insight 边界、认证/OAuth/OIDC 或生产配置。
- 不做视觉重设计、hooks 重构、数据模型抽象或全局类型体系抽取。

## Decisions

1. **保留函数组件和 hooks，不重写页面结构。**
   - 理由：页面已经是 hooks 函数组件，本次迁移只需要加类型和测试适配；重构状态管理会扩大行为风险。
   - 替代方案：拆分为多个子组件或自定义 hooks。当前 change 目标是保守迁移，拆分收益不足。

2. **页面内定义局部类型，`PlatformApiMappingBackend.js` 暂不迁移。**
   - 理由：共享 wrapper 较大且跨多个能力；本页面只需要对调用结果做局部收窄即可获得 typecheck 保护。
   - 替代方案：迁移整个 `PlatformApiMappingBackend.js` 到 TS。该方案会触碰 API 映射和其它目录修复能力，超出本 change。

3. **测试迁移为 `.test.tsx`，保持原断言和 mock 结构。**
   - 理由：现有测试已经覆盖主要行为；迁移目标是让 JSX 测试进入 TS 路线，而不是重写测试体系。
   - 替代方案：用新的测试 harness 重写。会增加 diff，且不能直接证明行为兼容。

## Risks / Trade-offs

- 历史接口响应字段宽且部分字段可选 → 使用 explicit optional interface、`unknown` 边界和小型 helper 类型，避免无解释 `any`。
- JS backend wrapper 返回值没有导出 TS 类型 → 在页面调用处用局部 response 类型收窄，不把共享 wrapper 迁移风险带入本 change。
- Jest 迁移可能暴露 React 18 legacy render 或 AntD warning → 记录为既有测试环境噪声；以断言通过和 typecheck/build 为准。
- 页面较大，changed-file coverage 可能受无法触发的展示分支影响 → 优先保留高价值行为测试；若未达 85%，在 `verification.md` 记录缺口和补救路径。
