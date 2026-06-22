## 验证记录

### OpenSpec

- `openspec validate polish-admin-workspace-tabs-action-boundary --strict`：通过，目标 change valid。
- `git diff --check`：通过。

### TDD

- RED：新增 `WorkspaceTabs.test.tsx` 用例 `groups desktop scroll controls and close management in a labeled action cluster` 后先运行 `cd web-admin; yarn test src/common/WorkspaceTabs.test.tsx --watchAll=false --runInBand`，失败原因为找不到 `工作标签操作` label，证明测试覆盖的是本次 action cluster 边界语义。
- GREEN：为桌面 `.admin-workspace-tabs-actions` 增加本地化 `aria-label`/`role=group`，并补充稳定滚动按钮槽位和样式边界后，同一命令通过，9/9 tests passed。
- 过程修正：首次 `yarn typecheck` 发现测试使用了当前类型环境未声明的 `toHaveClass` matcher，已改为项目现有兼容的 `className` 字符串断言后重新验证通过。

### 单测覆盖率

- 命令：`cd web-admin; yarn test src/common/WorkspaceTabs.test.tsx --watchAll=false --runInBand --coverage --collectCoverageFrom=src/common/WorkspaceTabs.tsx`
- 结果：通过，9/9 tests passed。
- 覆盖率对象：`web-admin/src/common/WorkspaceTabs.tsx`。
- 覆盖率结果：statements 96.29%、branches 91.07%、functions 100%、lines 96%。达到 85% 门槛。
- 说明：`web-admin/src/App.less` 和 locale JSON 不进入 Jest coverage；其效果由组件测试、build 和浏览器 smoke 覆盖。

### TypeScript / Build

- `cd web-admin; node scripts/check-incremental-typescript-gate.mjs --base origin/hfl-test-base`：通过。
- `cd web-admin; yarn typecheck`：通过。
- `cd web-admin; yarn build`：通过。仅保留既有 Browserslist、bundle size 和 Node deprecation warnings。

### 浏览器 smoke

本地 dev server `http://localhost:7002`，使用脱敏 mock API 与 sessionStorage 预置多 workspace tabs；未连接真实后端或 60 环境。

- 桌面 `900x900`，路径 `/tokens`：
  - `.admin-workspace-tabs-desktop` 可见，移动 tabs 不渲染。
  - `.admin-workspace-tabs-actions` 具有 `aria-label=工作标签操作`、`role=group`、`border-left=1px`、渐变浅背景、`min-width=116px`。
  - active tab 与 action cluster 有边界分隔，右滚动按钮点击后 scrollLeft 从初始值增加到 1197。
  - 可见 `关闭` 菜单仍在同级工具区，点击后出现 `关闭当前`、`关闭其他`、`关闭所有`。
  - 未出现桌面 `.admin-workspace-tabs-more` overflow 入口。
  - `documentElement.scrollWidth=900`、`clientWidth=900`，无页面级横向溢出。
  - `pageErrors=0`。
- 移动 `390x844` mobile UA，路径 `/tokens`：
  - `.admin-workspace-tabs-mobile` 可见，桌面 tabs 和 `.admin-workspace-tabs-actions` 不渲染。
  - “更多”入口可见。
  - `documentElement.scrollWidth=390`、`clientWidth=390`，无页面级横向溢出。
  - `pageErrors=0`。

浏览器 console 仍出现 legacy React `setState before mount` warning，来源于既有 `TokenListPage`/`BaseListPage` 生命周期路径；本 change 未改该路径，作为剩余风险记录。

### 运行态口径与脱敏

- 本次验证证明 Admin 前端 Shell workspace tabs 的本地 UI/DOM/布局行为，不声明真实后端、认证/OIDC、Gateway、Provider、API 或生产环境链路通过。
- 验证记录未写入真实 token、Cookie、账号密码、私有 URL 或敏感环境细节。

### 归档前 Review

- OpenSpec artifacts、delta spec、实现 diff、测试与覆盖率证据已复查，范围只包含 workspace tabs 右侧工具区边界和对应文案/测试。
- 注释 review：新增 `renderScrollButton` 辅助函数包含隐藏槽位的布局约定说明；未新增公共 API、后端契约或复杂业务字段。
- i18n review：新增 `Workspace tab actions` 同步写入 `zh` / `en` locale，未新增硬编码中英文 UI 文案。
- 主规格同步：由 `openspec archive polish-admin-workspace-tabs-action-boundary -y` 更新 `admin-enterprise-identity-console-shell` 主规格。
