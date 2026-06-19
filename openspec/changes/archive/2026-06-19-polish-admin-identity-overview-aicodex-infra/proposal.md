## Why

当前身份总览仍保留“企业认证中心 / 身份治理总览”的泛企业表达，并把风险、对象关系、接入预检和治理任务等能力按入口思路展示。主控已确认新的桌面预览稿：总览应成为 `身份控制台` 下的 `AICodex 身份基础设施总览`，围绕 AICodex 四个产品域呈现身份运行状态、接入覆盖、待核对事项和审计证据。

本 change 将总览从入口堆叠页收敛为 AICodex 产品域运行视图，同时把适合本项目的 Admin 前端 UI 设计守则固化到仓库文档，避免后续继续把 AntD 管理台做成泛企业说明页或多中心入口页。

## What Changes

- 重构 `/` 身份总览首屏：标题为 `AICodex 身份基础设施总览`，面包屑为 `身份控制台 / 身份总览`，主体验覆盖应用规格、用量洞察、身份控制台和 API 网关四个 AICodex 产品域。
- 将 `aicodex-app-spec`、`aicodex-insight`、`aicodex-admin`、`aicodex-api` 作为产品域二级 code tag 展示，用户可见主标签使用业务名。
- 把待办口径改成 `待核对`、`待关注`、`核对建议`、`核对中`、`正常` 等只读核对状态，不承诺后端处理工作流。
- 降噪左侧 `快捷操作` 显眼入口，保留既有路由兼容但不作为身份总览首屏或侧栏主入口展示。
- 更新 Admin 身份控制台设计文档和前端规则：主准则为 Ant Design / Ant Design Pro，Carbon、Fluent 2、Material Design 3、Apple HIG、Vercel Web Interface Guidelines 只按明确边界作为补充或 checklist。

## Capabilities

### New Capabilities

无。

### Modified Capabilities

- `admin-enterprise-identity-console-shell`: 细化身份总览作为 AICodex 身份基础设施总览的产品域、状态、证据、导航和 UI 规则要求。

## Impact

- 预计影响：`web-admin/src/IdentityConsoleOverview*`、`web-admin/src/enterpriseNavigation*`、`web-admin/src/ManagementPage*`、`web-admin/src/common/NavItemTree.test*`、`web-admin/src/locales/zh/data.json`、`web-admin/src/locales/en/data.json`、`web-admin/src/App.less`、`web-admin/AGENTS.md`、`docs/design/admin-identity-console/**`、本 change OpenSpec artifacts。
- 不新增后端 API、DB/schema、真实同步 workflow、OAuth/OIDC callback、Gateway projection publish/cleanup/receipt、生产/69 环境动作或破坏性数据操作。
- 不 touch/checkout/merge/push `test`；`origin/test` 只读观察。
