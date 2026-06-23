## 验证摘要

验证时间：2026-06-22。验证范围限定为群组列表页视觉密度 polish、共享列表查询工具栏高级筛选、OpenSpec 文档、前端类型/构建/聚焦测试和本地 mock 浏览器 smoke。

## 命令验证

| 命令 | 结果 |
| --- | --- |
| `openspec validate polish-admin-group-list-table-visual-density --strict` | 通过 |
| `git diff --check` | 通过，无输出 |
| `cd web-admin; node scripts/check-incremental-typescript-gate.mjs --base origin/hfl-test-base` | 通过，无输出 |
| `cd web-admin; npx tsc --noEmit --pretty false` | 通过，无输出 |
| `cd web-admin; yarn test --watchAll=false --runInBand src/GroupListPage.test.tsx` | 通过，14 tests passed |
| `cd web-admin; yarn test --watchAll=false --runInBand src/GroupListPage.test.tsx --coverage --collectCoverageFrom=src/GroupListPage.tsx --coverageReporters=text-summary` | 通过；`GroupListPage.tsx` statements 93.7%、branches 67.9%、functions 90.9%、lines 93.57% |
| `cd web-admin; yarn test --watchAll=false --runInBand src/common/EnterpriseListQueryToolbar.test.tsx src/GroupListPage.test.tsx src/OrganizationListPage.test.tsx` | 内联高级筛选纠偏后通过，37 tests passed；存在项目既有 React 18 testing-library warning |
| `cd web-admin; yarn test --watchAll=false --runInBand src/common/EnterpriseListQueryToolbar.test.tsx src/GroupListPage.test.tsx src/OrganizationListPage.test.tsx --coverage --collectCoverageFrom=src/common/EnterpriseListQueryToolbar.tsx --collectCoverageFrom=src/GroupListPage.tsx --collectCoverageFrom=src/OrganizationListPage.tsx --coverageReporters=text-summary` | 归档前补跑通过，37 tests passed；受影响实现文件集合 statements 92.75%、branches 72.58%、functions 95.13%、lines 92.5%；存在项目既有 React 18 testing-library warning |
| `cd web-admin; npx tsc --noEmit --pretty false` | 内联高级筛选纠偏后重跑通过，无输出 |
| `cd web-admin; node scripts/check-incremental-typescript-gate.mjs --base origin/hfl-test-base` | 内联高级筛选纠偏后重跑通过，无输出 |
| `openspec validate polish-admin-group-list-table-visual-density --strict` | 内联高级筛选纠偏后重跑通过 |
| `git diff --check` | 内联高级筛选纠偏后重跑通过，无输出 |
| `cd web-admin; yarn build` | 内联高级筛选纠偏后重跑通过，`Compiled successfully`，已更新 `web-admin/build` 供 `7012` 预览 |
| `cd web-admin; yarn build` | 移除长 ID monospace 后重跑通过，`Compiled successfully`，生成 `main.1a8ad680.js` 和 `main.864f039f.css`，已更新 `web-admin/build` 供 `7012` 预览 |

## 浏览器 Mock Smoke

本地预览：`http://localhost:7012/groups`。使用当前 workspace `web-admin/build` 启动只读静态预览，预览脚本内置 `/api/get-account`、`/api/get-application`、`/api/get-groups`、`/api/get-form`、`/api/get-organization-names`、`/api/get-organizations` 等脱敏 mock 响应，不访问真实认证或后端环境。

纠偏记录：最初尝试复用 `http://localhost:7002/groups`，但该端口实际是临时静态服务而非 CRACO dev server，且 mock API 覆盖不完整时 `/api/get-account` / `/api/get-application` 可能回落到前端 HTML 或缺少 shell 初始化字段，导致 `.group-list-table` 不渲染。已停止 `7002` 进程，改用可信 `7012` 预览并补齐 account/application/organization 基础 mock 字段。随后确认普通浏览器直接请求 `/api/get-account` 与 `/api/get-groups` 返回 `application/json`，无需 Playwright route 拦截即可渲染群组表格。

| 场景 | 结果 | 证据 |
| --- | --- | --- |
| desktop `1440x900` | 表格渲染成功；查询、重置、更多筛选、添加、下载模板、上传入口可见；操作列使用 link/text 小按钮；有子群组删除按钮 disabled；长用户字段显示 `+1`；`pageErrors=[]`；`document.scrollWidth === clientWidth` | `C:\Users\Administrator\.codex\vault\agent-reports\AICodex\polish-admin-group-list-table-visual-density-desktop-1440x900-fresh.png` |
| mobile UA `390x844` | 移动侧栏降级未破坏，顶部移动菜单按钮存在；表格渲染成功并在表格容器内横向滚动；操作列和禁用删除语义存在；长用户字段显示 `+1`；`pageErrors=[]`；`document.scrollWidth === clientWidth` | `C:\Users\Administrator\.codex\vault\agent-reports\AICodex\polish-admin-group-list-table-visual-density-mobile-ua-390x844-fresh.png` |
| desktop `1440x900` 群组页更多筛选内联展开 | 点击 `更多筛选` 后 `.enterprise-list-query-toolbar-advanced=true`、`.enterprise-list-query-toolbar-popover=false`、`inputCount=5`，字段为名称/组织/显示名称/上级组/用户；可见字段 label 均以英文冒号 `:` 结尾；长 ID 链接继承系统 UI 字体，不再使用 monospace；页面加载 `main.1a8ad680.js`、`main.864f039f.css`；console warning/error 均为 0 | `C:\Users\Administrator\.codex\vault\agent-reports\AICodex\groups-more-filter-shelf-desktop-1440x900-v2.png` |
| desktop `1440x900` 组织页更多筛选内联展开 | 点击 `更多筛选` 后 `.enterprise-list-query-toolbar-advanced=true`、`.enterprise-list-query-toolbar-popover=false`、`inputCount=4`，字段为名称/显示名称/主页地址/密码Salt值；可见字段 label 均以英文冒号 `:` 结尾；页面加载 `main.1a8ad680.js`、`main.864f039f.css` | `C:\Users\Administrator\.codex\vault\agent-reports\AICodex\organizations-more-filter-shelf-desktop-1440x900.png` |

## 遗留风险

- 本地预览是 build 静态服务 + mock API，不访问真实后端、真实认证或 60/69/test 环境。
- Playwright 早期 smoke 曾捕获 legacy React warning：`Can't perform a React state update on a component that hasn't mounted yet`，堆栈指向 `GroupListPage` / `BaseListPage` 的既有 `UNSAFE_componentWillMount` 异步 fetch 模式。本 change 未引入新的生命周期模式；报告中按既有技术债记录。
- Jest 输出包含 React 18 与当前旧版 `@testing-library/react` 的 `ReactDOM.render is no longer supported` 警告；测试均通过。
- 本地 build 首次 fresh run 在 `Creating an optimized production build...` 后以 Windows 进程崩溃码 `3221226505` 退出；立即重跑同一 `yarn build` 通过，输出 `Compiled successfully` 并完成 `build-temp` 到 `build` 的重命名。按 transient Node/构建进程问题记录，未发现 TypeScript/Jest/源码错误。
- 本地 build 输出项目既有 `Browserslist: caniuse-lite is outdated`、`fs.F_OK` deprecation 和 bundle size 提示；最终重跑构建退出码为 0。
- 用户验收发现群组页 `更多筛选` 不能去掉，且参考系统的“更多搜索”不是遮挡正文的浮层，而是搜索区在页面内向下展开。已将共享工具栏高级筛选调整为内联展开，并为群组页补回真实高级筛选字段；群组页、组织页与共享工具栏聚焦测试及浏览器 smoke 已覆盖。
