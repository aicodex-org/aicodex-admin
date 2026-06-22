## 验证记录

日期：2026-06-22

## 自动化验证

- `openspec validate polish-admin-workspace-tabs-scroll-and-close-actions --strict`：通过，目标 change valid。
- `openspec validate --changes --strict`：通过，4 个 active changes 均通过。
- `openspec validate --specs --strict`：通过，28 个主规格均通过。
- `git diff --check`：通过。
- `cd web-admin; node scripts/check-incremental-typescript-gate.mjs --base origin/hfl-test-base`：通过，无新增文件违反渐进 TypeScript 约定。
- `cd web-admin; yarn typecheck`：通过。
- `cd web-admin; yarn test src/common/workspaceTabState.test.ts src/common/WorkspaceTabs.test.tsx --runInBand --watchAll=false --coverage --collectCoverageFrom=src/common/workspaceTabState.ts --collectCoverageFrom=src/common/WorkspaceTabs.tsx`：通过，31 个测试通过。
- `cd web-admin; yarn build`：通过，生成 production bundle；命令输出包含既有 `Browserslist` 数据过期、bundle size 和 Node/webpack dev 依赖类提示，不影响本次构建结果。

## 覆盖率

聚焦 coverage 统计对象为本次实施代码：

- `web-admin/src/common/workspaceTabState.ts`：语句 100%，分支 90.14%，函数 100%，行 100%。
- `web-admin/src/common/WorkspaceTabs.tsx`：语句 94.87%，分支 91.3%，函数 96.15%，行 94.44%。
- 聚焦合计：语句 97.9%，分支 90.59%，函数 98.46%，行 97.71%。

受影响实施代码行覆盖率均达到 85% 门槛。

## 浏览器验证

使用本地 `web-admin` dev server 和 Playwright 桌面视口验证。由于本地没有真实后端登录态，验证通过 Playwright 拦截 `/api/get-account`、`/api/get-application` 和其它只读 `/api/**` 请求，注入脱敏 local admin 账号、`navItems=all` 组织配置和空数据响应；未写入真实凭据、Cookie、token 或私有环境 URL。

验证视口：`900x900` 桌面宽度。为避免业务页数据接口形状影响本次 shell 验证，验证在 `/` 总览路由下通过 sessionStorage 预置 workspace tabs 路径集合：

- 固定标签区只显示 `身份总览`。
- 滚动区按顺序显示 `应用接入中心`、`身份源中心`、`审计记录`、`用户`、`AI Agent 入口`、`MCP Server`、`入口配置`、`治理规则`。
- 常驻 `关闭` 菜单可见，且桌面端不存在旧 `.admin-workspace-tabs-more` overflow 按钮。
- 初始状态 `scrollWidth=1276`、`clientWidth=333`，右滚动箭头可见、左滚动箭头不可见。
- 滚动到最右后，右滚动箭头隐藏、左滚动箭头可见。
- `关闭` 菜单包含 `关闭当前`、`关闭其他`、`关闭所有`。
- 当前页为固定 `身份总览` 时，`关闭当前` 为 disabled。
- 点击 `关闭所有` 后，URL 保持 `/`，滚动区无可关闭标签，仅保留固定 `身份总览` 和常驻关闭菜单。
- 验证结束时当前页面无 webpack overlay；本地完整业务页 E2E 未执行，因为业务页依赖真实接口响应结构，超出本次 shell 标签交互写集。

## 剩余风险

- 浏览器验证覆盖真实壳层与标签栏 DOM/交互，但不声明业务页数据加载链路、真实认证链路或生产环境端到端通过。
- 本次不改移动端标签交互；移动端行为由组件测试覆盖“当前页 + 更多”降级模式保持不变。
