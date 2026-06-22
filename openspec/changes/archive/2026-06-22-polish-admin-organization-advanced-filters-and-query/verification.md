## 验证概览

本 change 只修改 Admin 前端组织页、共享查询工具栏和 OpenSpec 文档；未触碰后端查询接口、认证、组织同步、Gateway、Insight、生产/69 环境或 `test` 分支。验证记录只使用本地开发环境和脱敏 mock 组织数据，不包含 secrets、真实账号、token、Cookie、完整私有 URL、raw payload 或生产/69 环境细节。

## TDD

- RED：先补共享 `EnterpriseListQueryToolbar` 空 `advancedFilters` 不渲染“更多筛选”按钮的失败用例。
- RED：先补组织页高级筛选必须渲染真实字段输入的失败用例，覆盖 `name`、`displayName`、`websiteUrl`、`passwordSalt`。
- RED：先补组织页高级筛选多字段 AND、基础查询与高级条件叠加、过滤后 total、重置清空基础与高级条件的失败用例。
- GREEN：实现后聚焦 Jest 通过，且补充表格分页/排序不丢高级筛选、普通表格变更保持单字段 fetch 路径、窄屏禁用固定列的回归用例。

## 自动化验证

- `cd web-admin; yarn test OrganizationListPage.test.tsx common/EnterpriseListQueryToolbar.test.tsx --watchAll=false --runInBand`：通过，22 个测试通过；仅出现既有 React 18 `ReactDOM.render` warning。
- `cd web-admin; yarn test OrganizationListPage.test.tsx common/EnterpriseListQueryToolbar.test.tsx --watchAll=false --runInBand --coverage --collectCoverageFrom=src/OrganizationListPage.tsx --collectCoverageFrom=src/common/EnterpriseListQueryToolbar.tsx`：通过。统计对象为本 change 触碰的两个实施文件；All files statements 98.72%、lines 98.67%、functions 100%、branches 85.82%；`OrganizationListPage.tsx` statements/lines/functions 100%，branch 82.41% 主要受既有 legacy 组织表格渲染分支影响；新增高级筛选关键路径均有行为断言。
- `cd web-admin; node scripts/check-incremental-typescript-gate.mjs --base origin/hfl-test-base`：通过。
- `cd web-admin; yarn typecheck`：通过。
- `cd web-admin; yarn build`：通过；仅出现既有 Browserslist 过期提示、`fs.F_OK` deprecation 和 bundle size 提示。
- `git diff --check`：通过。
- `openspec validate polish-admin-organization-advanced-filters-and-query --strict`：通过。

## 浏览器 smoke

- 本地 dev server：`cd web-admin; BROWSER=none yarn start`，页面 `/organizations` 可加载并展示组织工作台和组织列表。
- 桌面 mock smoke：同一工作会话中使用 Playwright MCP 和脱敏三条组织数据验证基础查询 `engineering` 只展示 `engineering` / `engineering-cn`，高级筛选 `Name=engineering` + `Display name=platform` 只展示 `engineering / Platform Engineering`，重置恢复 3 条 mock 组织；高级筛选请求使用未分页组织列表路径，未新增后端 API。
- 窄屏 smoke：390px 视口下确认组织表格 fixed left/right 单元格数量为 0；高级筛选工具栏自身 `scrollWidth == clientWidth`，未因高级筛选控件新增溢出；宽组织表格保留 `.ant-table-content` 内部横向滚动。
- 工具限制：Playwright MCP 在后续尝试完整重跑桌面点击脚本时 transport closed；`browser-act` 当前本机安装状态报 `uv trampoline failed to canonicalize script path`，临时 `playwright` 包也不能被 Node stdin/eval 正确解析。因此最终浏览器证据由已完成的 MCP smoke、dev server 编译无错误和自动化 Jest/coverage 共同支撑，没有把工具失败伪造成完整 E2E 证据。

## 剩余风险

- 高级筛选的 AND 语义在前端基于当前组织 scope 未分页候选集执行；本 change 未新增后端多字段查询 API。若后续组织集合规模显著增大，应由后端 owner 评估组合查询接口和索引。
- 390px 视口下既有 Admin 壳层左侧导航不会完全折叠，document 级宽度仍受壳层影响；本 change 只保证高级筛选工具栏不新增溢出，并禁用组织表格固定列让宽表留在内部横向滚动中。
