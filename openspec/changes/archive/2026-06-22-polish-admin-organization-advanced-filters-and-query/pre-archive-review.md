## 归档准备状态

READY。

## 发现项

- Blocking：共享 toolbar 原先使用 `React.Children.count(advancedFilters) > 0`，空 Fragment 会被当成真实高级筛选内容。已补 `hasRenderableNode()` 和空 Fragment 回归测试。
- Non-blocking：390px 视口下既有 Admin 壳层左侧导航仍会贡献 document 级宽度；本 change 已确认高级筛选工具栏不新增溢出，并禁用组织表格固定列，让宽表保留在 `.ant-table-content` 内部横向滚动。

## 已应用修复

- 组织页高级筛选渲染 `name`、`displayName`、`websiteUrl`、`passwordSalt` 四个字段输入。
- 高级筛选存在非空条件时，复用当前组织 scope 的未分页组织列表请求，在前端按基础条件和所有高级条件执行 AND 过滤，并用过滤后结果回填当前页数据和 total。
- 表格分页、排序和 password type 表格过滤在高级筛选 active 时继续走高级过滤路径；普通表格变更保持原单字段 fetch 路径。
- 重置同时清空基础字段、基础关键词和高级筛选条件。
- 共享 toolbar 不再为空 `advancedFilters` 或空 Fragment 渲染“更多筛选”按钮。
- 窄视口或移动模式下禁用组织表格 fixed left/right 列，避免固定列脱离表格内部滚动容器。

## 验证

- `openspec validate polish-admin-organization-advanced-filters-and-query --strict`：通过。
- `cd web-admin; yarn test OrganizationListPage.test.tsx common/EnterpriseListQueryToolbar.test.tsx --watchAll=false --runInBand`：通过，22 个测试通过；仅有既有 React 18 `ReactDOM.render` warning。
- `cd web-admin; yarn test OrganizationListPage.test.tsx common/EnterpriseListQueryToolbar.test.tsx --watchAll=false --runInBand --coverage --collectCoverageFrom=src/OrganizationListPage.tsx --collectCoverageFrom=src/common/EnterpriseListQueryToolbar.tsx`：通过。
- `cd web-admin; node scripts/check-incremental-typescript-gate.mjs --base origin/hfl-test-base`：通过。
- `cd web-admin; yarn typecheck`：通过。
- `cd web-admin; yarn build`：通过；仅有既有 Browserslist、`fs.F_OK` deprecation 和 bundle size 提示。
- `git diff --check`：通过。

## 单测覆盖率

- 统计对象：`src/OrganizationListPage.tsx`、`src/common/EnterpriseListQueryToolbar.tsx`。
- 结果：All files statements 98.72%、branches 85.82%、functions 100%、lines 98.67%。
- `OrganizationListPage.tsx` statements/lines/functions 100%，branch 82.41%；未覆盖 branch 主要来自既有 legacy 表格渲染和非本 change 的展示分支。新增高级筛选关键路径、普通路径回归、表格分页/排序、错误/拒绝响应、reset、窄屏固定列、空高级筛选判断均有行为断言。

## 注释 Review

- 已检查 `OrganizationListPage.tsx` 新增辅助函数和关键分支。高级筛选复用单字段后端接口、前端 AND 过滤的业务取舍在 `fetchAdvancedFilteredOrganizations()` 前有中文注释；窄屏禁用 fixed columns 的 AntD 布局原因在 `shouldUseFixedOrganizationTableColumns()` 内有中文注释。
- `EnterpriseListQueryToolbar.tsx` 的 `hasRenderableNode()` 是短小纯展示判断，测试覆盖空、空 Fragment 和有内容场景；不需要额外注释。

## OpenSpec 文档语言

- 已检查 `proposal.md`、`design.md`、`tasks.md`、`verification.md`、delta spec。协作文档正文以简体中文说明为主；OpenSpec 固定标题、命令、路径、字段名、API 名和规范关键字保留英文。

## 验证文档语言

- `verification.md` 使用简体中文记录验证步骤、结果、工具限制和剩余风险；命令、字段、路径、`RED/GREEN`、`ReactDOM.render` 等标准术语保留英文。

## 运行态验收口径

- 本 change 没有部署或真实 60/69 环境验收目标；浏览器 smoke 只证明本地前端页面交互和布局层行为。
- 验证记录没有把本地 mock/browser evidence 夸大为后端多字段查询、端到端运行态或生产可用结论。

## 验证记录脱敏

- 验证记录只写本地开发环境、脱敏 mock 组织名和 `.example.test` URL；没有真实 IP、私有 URL、token、Cookie、账号、raw payload 或生产/69 环境细节。

## 主规格同步

- 已同步到 `openspec/specs/admin-enterprise-organization-identity-center/spec.md`：新增组织列表高级筛选真实字段、AND 查询、reset 清空、空高级筛选不展示按钮等场景。

## 交付单元收敛

- 当前分支：`hfl-test/polish-admin-organization-advanced-filters-and-query`。
- 当前仍落后 `origin/hfl-test-base` 1 个提交，且尚未提交；archive 和 rebase/merge 最新 base 后，需要收敛为最新 `origin/hfl-test-base + 1` 个本 change commit。

## 剩余风险

- 前端 AND 过滤基于未分页候选集，不是后端组合查询；超大组织集合后续应由后端 owner 评估组合查询接口。
- `browser-act` 本机安装状态不可用，Playwright MCP 后续 transport closed，完整桌面点击脚本未在最终 CSS 修复后重新跑通；关键交互由同会话已有浏览器 smoke 和自动化 Jest/coverage 共同覆盖。
