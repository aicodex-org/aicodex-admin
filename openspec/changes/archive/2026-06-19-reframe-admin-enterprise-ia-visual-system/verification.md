## 归档前验证记录

日期：2026-06-19

## Scope

本轮仅收口 OpenSpec umbrella change，不新增或修改 `web-admin/src/**`、后端代码、locale、package/lockfile，也不执行 OAuth/OIDC callback、Provider login、sync、Gateway publish/projection/cleanup/receipt 或任何真实写链路。

已完成范围：

- IA 审计和运行态侧栏入口分类。
- 主业务域导航方向：中心总览、组织与账号、应用接入、身份源、权限与角色、审计运维和 LLM AI/Gateway。
- 主控补充 IA/文案门禁：一级菜单和菜单文档命名默认四字中文业务名优先，不使用过长解释性短语；LLM AI/Gateway 等专有技术词允许中英混合。
- 抽象治理能力降级方向：身份资产关系、接入预检、治理任务和快捷操作默认沉到总览、对象详情、行操作、配置流程或结果页。
- 后续 UI 任务门禁：拒绝只新增菜单、中心、卡片或解释性面板的 filler 任务。

从本 umbrella 裁出的未来候选：

- `DEFER`: 紧凑企业页头、专业表格工具栏、状态标签和视觉系统实现。
- `DEFER`: 代表性页面大工作台/卡片堆叠替换。
- `DEFER`: 关系、证据、预检、治理任务和快捷操作迁移到对象详情、行操作或流程内。
- `DEFER`: Playwright/local-dev/60 桌面和移动端截图证据、表格首屏坐标和 console 证据。

## Pre-archive Review

- `proposal.md`、`design.md`、`tasks.md` 和 delta spec 已改为以简体中文说明为主；OpenSpec 固定标题、Requirement/Scenario、MUST/SHALL、API path、字段名和代码标识保留英文。
- `tasks.md` 不再保留未完成 checkbox；未完成视觉系统、对象上下文迁移和浏览器证据以 `DEFER` 清单记录，不作为本 umbrella 的完成任务。
- delta spec 已缩为 IA 降级和后续 UI 任务门禁，不再把未完成视觉系统、表格工具栏、对象上下文或 i18n 实现写入本次主规格同步。
- 运行态验收口径为“已合入 IA/方向门禁 + 本轮 OpenSpec/docs-only 收口”；本轮不声明新的 60、生产、浏览器或端到端验证通过。
- 验证记录不包含真实环境 IP、私有 URL、token、Cookie、client secret、DSN 或原始 payload。

## Commands

- `git fetch origin hfl-test-base test`: 通过，已确认 `origin/hfl-test-base` 和 `origin/test` 最新引用。
- `git status --short --branch`: 通过，当前工作分支为 `hfl-test/close-admin-enterprise-stale-openspec-umbrella-changes`。
- `openspec list --json`: 通过，收口前本 change 显示 `4/16` tasks。
- `openspec status --change reframe-admin-enterprise-ia-visual-system --json`: 通过，planning artifacts 状态为 `done`。
- `openspec validate reframe-admin-enterprise-ia-visual-system --strict`: 通过；裁剪前和裁剪后均 valid。
- `rg -n "^- \\[ \\]" openspec/changes/reframe-admin-enterprise-ia-visual-system`: 无输出，说明 active checklist 已无未完成项。

## Coverage

N/A。本轮没有实施代码改动，仅修改 OpenSpec planning artifacts；覆盖率、`yarn typecheck`、`yarn build`、Jest 和浏览器验证不适用于本轮写集。历史 IA/导航实现的验证证据由对应 worker report/processed 记录承载，本轮不重新执行真实 UI 或运行态验收。

## Remaining Risk

- 视觉系统、表格工具栏、对象上下文迁移和代表性浏览器证据仍未作为本 change 完成；后续必须重新开独立 OpenSpec change。
- 本轮不补 UI，不新增浏览器截图，不执行真实认证或 Gateway 链路。
