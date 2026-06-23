## 验证记录

### 已完成

- `yarn test --watchAll=false src/common/WorkspaceTabs.test.tsx src/ManagementPage.shell.test.tsx`
  - 结果：通过，2 个 test suites、14 个 tests。
  - 备注：输出包含项目既有 React 18 测试环境警告 `ReactDOM.render is no longer supported`，本 change 未新增该警告。
- `node scripts/check-incremental-typescript-gate.mjs --base origin/hfl-test-base`
  - 结果：通过。
- `yarn typecheck`
  - 结果：通过。
- `git diff --check`
  - 结果：通过。
- `yarn build`
  - 结果：通过，生成 `web-admin/build`。
  - 备注：输出包含项目既有 Browserslist/caniuse-lite 过期提示和 bundle size 提示。
- `openspec validate "polish-admin-shell-collapse-and-tabs-close-affordance" --strict`
  - 结果：通过。
- `openspec validate --changes --strict`
  - 结果：通过，4 个 active changes 全部通过。
- `openspec validate --specs --strict`
  - 结果：通过，28 个主规格全部通过。
- 浏览器 smoke：`http://localhost:7102`
  - 结果：通过 shell 相关检查。
  - desktop expanded：`/organizations` 下父级菜单为轻量蓝字、透明背景、无左条；当前子项保持浅蓝底主选中态；标签栏级关闭入口固定在右侧。
  - desktop close menu：标签栏级入口可打开 `关闭当前`、`关闭其他`、`关闭所有`。
  - desktop collapsed：侧栏宽度约 `72px`，收起/展开按钮仍在侧栏内，header 不承载桌面侧栏切换，文档宽度未超过视口。
  - mobile 390x844 + iPhone UA：不渲染桌面 `Sider`，保留 header Drawer 菜单按钮，workspace tabs 使用移动降级视图，Drawer 可打开且二级入口可达。
  - 截图目录：`C:\Users\Administrator\AppData\Local\Temp\aicodex-admin-polish-shell-smoke\`。
  - 备注：访问 `/organizations` 时浏览器 console 出现既有 `OrganizationListPage` React state update warning；本 change 未修改组织列表页，按范围纠偏不在当前 change 处理。
- 用户补充反馈 smoke：`http://localhost:7102/certs`
  - 结果：通过登录后 Shell 检查。
  - 全局关闭入口：右侧固定为 `30px` icon-only 按钮，`textContent=""`，保留 `aria-label/title=关闭工作页面`，标签栏右侧预留缩小为 `52px`。
  - 登录后 footer：`#footer` 不存在，`CasdoorApplicationName` 和 `CasdoorAccessToken` 隐藏桥接字段仍存在。
  - 多标签滚动：14 个 session tabs 下，右箭头真实点击 `scrollLeft 0 -> 320`，左箭头真实点击 `scrollLeft 320 -> 0`，不再一次跳到最左/最右。
  - 侧栏切换：header 内无 `.admin-shell-sidebar-toggle`，Sider 内有收起按钮；父级选中为透明背景/无阴影，当前子项为浅蓝底/无粗左条。
  - 页面宽度：`documentElement.scrollWidth=1440`、`clientWidth=1440`，未产生页面级横向溢出。
  - 截图：`C:\Users\Administrator\AppData\Local\Temp\aicodex-admin-polish-shell-smoke\polish-admin-shell-rc-20260622-latest.png`。
- 用户侧栏高度与色带反馈 smoke：`http://localhost:7102/organizations`
  - 结果：通过登录后 Shell 布局检查。
  - 视口 `1440x520`：header `64px`，Shell body/Sider/Content 均为 `456px`，文档 `scrollHeight=520`，右侧内容不再把左侧 Sider 拉长。
  - 视口 `1440x360`：Sider 高度 `296px`，菜单 `clientHeight=245`、`scrollHeight=402`、`overflow-y=auto`，底部收起/展开行仍贴近 Sider 底部。
  - collapsed 状态：Sider 宽度 `72px`，展开按钮居中且贴侧栏底部，文档 `scrollHeight=360`。
  - 色带层级：workspace tabs 下方 divider 为透明背景 `1px` 细线，不再有明显高度的蓝灰色分隔带。
  - 截图：`C:\Users\Administrator\AppData\Local\Temp\aicodex-admin-polish-shell-smoke\polish-admin-shell-rc-20260622-layer-height.png`。
- 用户标签栏视觉建议 smoke：`http://localhost:7102/organizations`
  - 结果：通过标签栏降噪检查。
  - 全局关闭入口：继续使用 `X` 图标，`textContent=""`，`aria-label/title=关闭工作页面`，常态颜色降为 `rgb(100, 116, 139)`。
  - 非 active 标签：浅底 `rgb(247, 250, 254)`、轻边框、文字字重 `500`、状态点 `5px` 且颜色降权。
  - active 标签：白底、蓝色顶边 `rgb(37, 99, 235)`、文字字重 `600`，保持主要焦点。
  - 滚动按钮：常态低于 active 标签视觉权重，hover/focus 仍有反馈。
  - 截图：`C:\Users\Administrator\AppData\Local\Temp\aicodex-admin-polish-shell-smoke\polish-admin-shell-rc-20260622-tabs-refined.png`。
- 用户侧栏切换闪烁反馈 smoke：`http://localhost:7102/organizations`
  - 结果：通过侧栏切换稳定性检查。
  - 修复前采样：AntD runtime 注入 `Sider transition=0.2s, background`、`Menu transition=width 0.3s`、submenu title `padding 0.1s`，collapsed 类与 Sider 宽度分阶段变化。
  - 修复后采样：`Sider transition=none`、`Menu transition=none`、title-content `transition=none`。
  - 收起点击后首个 animation frame：Sider `224px -> 72px`、Content left `224px -> 72px`、Menu `ant-menu-inline-collapsed=true`、title opacity `0` 同步完成。
  - hover 颜色反馈仍通过菜单 item/title 的 color/background transition 保留。
- 用户验收预览修正：`http://localhost:7102` 初次直接打开时出现空 Shell，原因是前端 `/api/get-account` 代理到 `localhost:8000` 时后端未监听并返回 504。已按 `local-dev` 运行配置启动本地后端缓存 exe，`curl http://localhost:7102/api/get-account` 已恢复 200 JSON 响应；无登录上下文返回 `Please login first` 属正常认证语义。
  - 当前后端：`local-dev/cache/admin-server-local-dev.exe`，PID `38612`，监听 `8000`；启动壳 PID `32092`。
  - 当前前端：手动 RC dev server PID `30312`，监听 `7102`。
  - 备注：`local-dev/start-windows-local-dev.ps1 restart` 的 Go build 步骤在本机返回 exit code `-1`，`backend-build.log` 无 Go 编译错误，仅有 build header；由于本 change 未改后端代码，临时采用已有缓存 exe 恢复验收预览，并将 Go build 异常作为 local-dev 环境观察记录。

### Release-candidate report

- `C:\Users\Administrator\.codex\vault\agent-reports\AICodex\019eeda1-polish-admin-shell-collapse-and-tabs-close-affordance-rc-20260622-201317.md`

### 覆盖率说明

本次是小范围 Shell UI polish，项目未提供针对单个 Jest 文件的 changed-file coverage 门禁；本 change 使用 focused Jest 行为测试、typecheck、build 和浏览器 smoke 作为主要验证证据。若 closeout 前需要覆盖率阈值，可补跑项目可用 coverage 命令并记录受影响文件统计限制。
