## Context

路线台账已明确当前产品范围回到 AICodex 本身：`aicodex-app-spec`、`aicodex-insight`、`aicodex-admin`、`aicodex-api`。`aicodex-admin` 的身份总览应帮助管理员快速判断四个产品域的身份覆盖、接入健康、用量归因、授权映射和审计证据，而不是继续展示泛企业认证中心文案或多中心入口集合。

当前前端是 React 18 + Ant Design 5 + CRACO，并已采用渐进 TypeScript。现有 `IdentityConsoleOverview.js` 使用 `DashboardBackend.getDashboard` 的只读统计数组和 `EnterpriseIdentityConsoleLayout.tsx` 展示摘要、状态卡和风险列表。本 change 保持只读数据边界，优先重排和改写总览信息层级。

## Goals / Non-Goals

**Goals:**

- 首页标题、面包屑、首屏结构与确认稿一致，突出 `身份控制台` 与 `AICodex 身份基础设施总览`。
- 四个产品域使用业务名作为主标签，仓库名只作为 code tag。
- 总览第一屏优先展示状态和证据：覆盖指标、产品域、待核对事项、接入健康、最近审计证据。
- 左侧首个一级菜单使用 `身份总览`；当只剩一个总览子项时在壳层中直接显示为一级项，避免单子项二级结构。
- 设计规则中文固化到 `docs/design/admin-identity-console` 和 `web-admin/AGENTS.md`。

**Non-Goals:**

- 不新增真实后端聚合状态、任务处理状态、写入 workflow 或数据库结构。
- 不删除 `/shortcuts` 路由、不破坏非 local admin `/apps` 兼容 fallback。
- 不引入新 UI 库，不迁移 Carbon、Fluent、Material 或 Apple 的视觉风格。
- 不触碰 OAuth/OIDC 回调执行、Provider 写链路、Gateway projection publish/cleanup/receipt 或生产配置。

## Decisions

### Decision 1: 总览以 AICodex 产品域组织

总览的数据卡和产品域卡围绕应用规格、用量洞察、身份控制台、API 网关组织。业务名负责用户理解，仓库名只作为 code tag 提供证据定位。这样既能让管理员识别当前系统边界，也不会把内部 repo 名当作一级产品文案。

### Decision 2: 只读核对状态，不伪造处理流

当前前端没有真实后端处理状态。本 change 使用 `待核对`、`待关注`、`核对建议`、`核对中`、`正常` 等语义，表示管理员应复查的只读建议或证据信号，不展示 `待处理`、`已处理` 或会让用户误以为存在工单闭环的状态。

### Decision 3: 保留路由兼容，降低显眼入口

`/identity-assets`、`/access-wizard`、`/governance-tasks` 和 `/shortcuts` 等既有路由不删除。总览只把关系、预检、治理任务作为低噪上下文入口或状态操作呈现；侧栏不继续把 `快捷操作` 作为首组显眼入口。当首组只剩 `/` 时，菜单直接渲染为 `身份总览` 一级项，避免 `身份总览` 下只有一个同义二级入口。

### Decision 4: 设计规则分主准则和补充准则

项目主设计准则采用 Ant Design / Ant Design Pro，因为当前 Admin 使用 React + AntD，且 AntD/Pro 面向企业级 Web 应用和中后台场景。Carbon 只用于数据表格、toolbar、搜索/筛选、列设置、批量操作和密度；Fluent 2 只用于可访问性、焦点顺序、对比、内容与工具型产品体验；Material Design 3 / Apple HIG 只用于通用导航、层级、响应式和平台一致性检查；Vercel Web Interface Guidelines 只作为语义 HTML、button/link、aria、focus-visible、长文本、overflow、URL 状态和 i18n checklist。

## Risks / Trade-offs

- 风险：移除侧栏显眼 `快捷操作` 会降低发现性。缓解：保留 `/shortcuts` 路由和内部兼容入口，不作为身份总览主入口展示。
- 风险：总览使用前端只读建议，无法代表真实全局处理状态。缓解：文案明确为核对建议和审计证据，不承诺处理闭环。
- 风险：另一个 worker 可能同时修改 `App.less`、locale、`ManagementPage`。缓解：final 前 fetch/rebase 最新 `origin/hfl-test-base`，冲突时保留对方 workspace tabs 成果。
