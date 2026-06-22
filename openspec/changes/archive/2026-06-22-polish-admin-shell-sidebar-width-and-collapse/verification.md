# 验证记录

## 静态门禁

- `openspec validate polish-admin-shell-sidebar-width-and-collapse --strict`：通过。
- `openspec validate --changes --strict`：通过，4 个 active change 全部有效。
- `openspec validate --specs --strict`：通过，28 个主规格全部有效。
- `git diff --check`：通过。
- `cd web-admin; node scripts/check-incremental-typescript-gate.mjs --base origin/hfl-test-base`：通过，无错误输出。
- `cd web-admin; yarn typecheck`：通过。

## Jest 与覆盖率

- `cd web-admin; yarn test --runInBand --watchAll=false src/ManagementPage.shell.test.tsx src/common/workspaceTabState.test.ts src/common/WorkspaceTabs.test.tsx`：通过，3 个 test suite / 39 个测试。
- `cd web-admin; yarn test --runInBand --watchAll=false --coverage --collectCoverageFrom=src/ManagementPage.js --collectCoverageFrom=src/common/WorkspaceTabs.tsx --collectCoverageFrom=src/common/workspaceTabState.ts src/ManagementPage.shell.test.tsx src/common/workspaceTabState.test.ts src/common/WorkspaceTabs.test.tsx`：通过，3 个 test suite / 39 个测试。
- 覆盖率摘要：
  - `WorkspaceTabs.tsx`：statements 96.2%，branches 87.5%，functions 100%，lines 95.94%。
  - `workspaceTabState.ts`：statements 97.16%，branches 84.52%，functions 100%，lines 96.77%。
  - `ManagementPage.js`：statements 37.95%，branches 55.79%，functions 18.65%，lines 37.86%。该文件是大型 legacy shell 文件，本 change 通过 `ManagementPage.shell.test.tsx` 聚焦覆盖 sidebar 宽度、收起持久化、品牌区、移动端降级和 workspace tabs 接线行为。
- 已知测试输出：`ManagementPage.shell.test.tsx` 会打印既有 React 18 `ReactDOM.render` 与 `rc-menu` act warning；断言全部通过，未出现失败。

## 构建

- `cd web-admin; yarn build`：通过。
- 已知构建输出：打印既有 Node/Browserslist/development dependency deprecation notice 和 bundle size warning；最终 `Compiled successfully`，并完成 `build-temp` 到 `build` 的移动。

## 浏览器 mock smoke

环境：
- 当前 worktree 使用 `cd web-admin; npx cross-env PORT=7003 craco start` 启动本地 dev server。
- `7002` 已被另一个 node 进程占用，本次没有修改或停止该进程。
- Playwright 通过 route mock 拦截 `/api/get-account`、`/api/get-application` 和其它 `/api/*` 只读请求，返回本地脱敏 fixture。
- smoke 完成后已停止 `7003` dev server；`netstat` 未显示 `7003` 的 `LISTENING` 记录。

桌面展开态证据：
- 访问 `http://localhost:7003/records`，桌面 viewport，mock 管理员账号。
- 展开侧边栏：`data-sidebar-state="expanded"`，computed width 为 `224px`。
- 品牌区文本为 `AICodex Admin·认证中心`；旧 `.admin-shell-entry` 胶囊不存在。
- workspace tabs：`身份总览`、`应用接入中心`、`身份源中心`、`审计记录` 均渲染在 `.admin-workspace-tabs-scroll-strip`；`.admin-workspace-tabs-fixed-area` 不存在。
- 滚动条控制：`.admin-workspace-tabs-scroll-shell` 内有 2 个 `.admin-workspace-tabs-scroll-button`。
- 页面级 overflow：桌面展开和收起态均满足 `documentElement.scrollWidth == documentElement.clientWidth`。

收起与持久化证据：
- 点击 `收起侧边栏` 后，`data-sidebar-state` 变为 `collapsed`，`localStorage.adminShellSidebarCollapsed` 写入 `"true"`，品牌文字隐藏，操作按钮变为 `展开侧边栏`。
- 等待宽度过渡结束后，收起侧边栏 computed width 为 `72px`。
- 带 `adminShellSidebarCollapsed = "true"` 刷新后恢复收起态，computed width 为 `72px`。

workspace tabs 证据：
- 桌面右键 `身份源中心` 标签打开上下文菜单，包含 `关闭当前`、`关闭左侧`、`关闭右侧`、`关闭其他`、`关闭所有`。
- 4 个已渲染标签均保留可见关闭按钮。
- 点击 `关闭所有` 后导航到 `/`，只保留一个普通 `身份总览` fallback 标签，且该标签仍有可见关闭按钮。

移动端证据：
- 移动端 smoke 使用 `390x844` viewport 和 iPhone user agent，因为 `Setting.isMobile()` 依赖 UA 判断。
- 在 `localStorage.adminShellSidebarCollapsed = "true"` 的情况下访问 `/records`，页面不渲染桌面 `.admin-shell-sider`，也不渲染桌面 tabs。
- 页面渲染 `.admin-workspace-tabs-mobile`，当前标题为 `审计记录`，`更多工作页面` 按钮可见。
- 移动端页面级 overflow：`documentElement.scrollWidth == documentElement.clientWidth`。

## 剩余风险

- 浏览器 smoke 使用本地 mock 启动接口和只读数据接口，没有连接真实后端数据页。
- 聚焦 shell 测试仍会输出既有 React 18 / AntD `rc-menu` 测试警告，但本次断言、typecheck、coverage 和 build 均已通过。
