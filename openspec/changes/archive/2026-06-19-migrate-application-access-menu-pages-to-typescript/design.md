## Context

Admin 前端已经支持 `.js`、`.ts`、`.tsx` 共存，并已完成多个身份控制台页面的渐进 TS 迁移。当前“应用接入”一级菜单中，`AccessWizardPage` 和 `ApplicationAccessCenter` 已经是 TSX，但其它二级菜单落地页仍是历史 JS：

- `/applications` 仍由 `ApplicationListPage.js` 承载主列表。
- `/resources`、`/certs`、`/keys` 仍是 JS 列表页。
- `/platform-api-mappings` 是较大的 JS 页面，已有 `.test.js`。
- `/webhooks`、`/webhook-events` 仍是 JS 列表页。

本 change 的约束是行为保持型迁移：只让菜单落地页进入 TypeScript 检查和测试路径，不改变业务能力、认证链路、Gateway 运行态、真实密钥或后端 API 契约。

## Goals / Non-Goals

**Goals:**

- 将应用接入一级菜单下仍为 JS 的二级菜单落地页迁移为 `.tsx`。
- 将本次触碰且包含 JSX 的测试迁移为 `.test.tsx`，并为缺少测试的菜单落地页补充聚焦测试。
- 为页面 props、state、表格 record、筛选参数、操作响应、抽屉/详情状态和关键 helper 增加局部类型。
- 保持现有路由、权限、接口、表格列、分页筛选排序、按钮操作、文案和敏感字段处理不变。
- 通过增量 TS gate、`yarn typecheck`、focused Jest coverage 和 `yarn build` 验证。

**Non-Goals:**

- 不迁移 `ApplicationEditPage`、`CertEditPage`、`KeyEditPage`、`WebhookEditPage` 等编辑页。
- 不迁移 `ApplicationBackend`、`ResourceBackend`、`CertBackend`、`TokenBackend`、`WebhookBackend`、`WebhookEventBackend`、`PlatformApiMappingBackend` 等后端 API client。
- 不改变应用接入中心、接入预检、API 网关映射或 Webhook 的视觉结构、信息架构和业务文案。
- 不修改认证/OIDC、Provider、Gateway projection、真实 secret、生产或类生产配置。
- 不触碰 `test` 分支。

## Decisions

### 1. 以“菜单落地页”为迁移边界

本 change 迁移截图中二级菜单直接打开的页面：`/applications`、`/resources`、`/certs`、`/keys`、`/platform-api-mappings`、`/webhooks`、`/webhook-events`。这些页面是用户所说“应用接入下所有二级菜单”的直接对应物。

替代方案是连同编辑页、表格子组件和 backend client 一起迁移。该方案会把一个前端 TS 迁移 change 扩大到写入表单和 API client 层，风险和验证面明显增加，也会偏离“保持行为不变”的目标。因此编辑页和 backend client 保持 JS，后续如果需求触碰再单独迁移。

### 2. 使用局部类型，不引入跨页面大抽象

各页面沿用现有 class component / ListPage 模式，只增加页面内或文件内局部接口和类型别名。API 返回值先按现有 JS 调用保持宽松兼容，必要位置使用 `unknown` 加类型收窄，而不是引入共享 DTO 包或重写 backend client。

这样可以降低全局回归风险，也符合渐进 TypeScript 的当前阶段。

### 3. 测试覆盖以行为保持和 import-boundary 为主

已有测试迁移为 `.test.tsx`；缺少测试的列表页补充轻量聚焦测试，覆盖：

- 页面可以以既有 props 渲染关键按钮、表格或状态标签。
- 关键 link、row key、筛选/操作 helper 不改变。
- 敏感信息不因迁移新增展示。

对依赖完整后端数据或旧 ListPage 基类的复杂路径，不用过度 mock 追求无意义行覆盖；如某个页面只能通过 build/typecheck 和低风险渲染 smoke 覆盖，应在 `verification.md` 说明。

## Risks / Trade-offs

- [Risk] `PlatformApiMappingPage` 文件较大，直接强类型化所有数据结构容易引入行为差异。
  → Mitigation: 先保留运行时逻辑，使用局部宽松类型和最小 JSX/事件类型，重点验证现有测试迁移后继续通过。

- [Risk] 历史列表页依赖 `ListPage` 基类和 JS backend client，TSX 文件会通过 JS 模块边界。
  → Mitigation: 保持 JS/TS 共存，不改 backend client；通过 `allowJs`、typecheck、build 验证 import boundary。

- [Risk] 一次迁移多个页面会增加验证时间。
  → Mitigation: focused Jest 覆盖迁移页面，必要时将覆盖率统计限定到 touched production files，并在 `verification.md` 记录统计对象。

- [Risk] 新增测试可能因为旧 ReactDOM.render / AntD 兼容 warning 产生噪声。
  → Mitigation: 仅过滤项目既有 warning，不吞掉真实 console error。
