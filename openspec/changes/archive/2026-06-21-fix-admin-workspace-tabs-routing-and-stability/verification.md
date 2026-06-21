# Verification

## 自动化验证

- `openspec validate fix-admin-workspace-tabs-routing-and-stability --strict`：通过，目标 change 有效。
- `openspec validate --changes --strict`：通过，4 个 active changes 全部通过；历史 active changes 未接管。
- `openspec validate --specs --strict`：通过，28 个主规格全部通过。
- `git diff --check`：通过，无 whitespace error。
- `cd web-admin; node scripts/check-incremental-typescript-gate.mjs --base origin/hfl-test-base`：通过，退出码 0；本 change 未新增违规 `.js/.jsx` 或 JSX `.test.js`。
- `cd web-admin; yarn typecheck`：通过，`tsc --noEmit` 退出码 0。
- `cd web-admin; yarn test src/common/workspaceTabState.test.ts --watchAll=false --runInBand`：RED 阶段先失败，失败点为 `getVisibleWorkspaceTabs` 将 active tab 插到固定页后，证明测试覆盖浏览器发现的顺序跳动；修复后通过，19/19 tests passed。
- `cd web-admin; yarn test src/common/workspaceTabState.test.ts src/common/WorkspaceTabs.test.tsx --watchAll=false --runInBand`：通过，22/22 tests passed。
- `cd web-admin; yarn test src/common/workspaceTabState.test.ts src/common/WorkspaceTabs.test.tsx --watchAll=false --runInBand --coverage --collectCoverageFrom=src/common/workspaceTabState.ts --collectCoverageFrom=src/common/WorkspaceTabs.tsx`：通过，22/22 tests passed。
- `cd web-admin; yarn build`：通过，production build 成功；保留既有工具警告：`fs.F_OK` deprecation、Browserslist database outdated、bundle size warning。

## 覆盖率

受影响生产文件为 `web-admin/src/common/workspaceTabState.ts`、`web-admin/src/common/WorkspaceTabs.tsx` 和 `web-admin/src/App.less`。样式文件不进入 Jest coverage；两个行为文件覆盖率如下：

| 文件 | Statements | Branch | Functions | Lines |
| --- | ---: | ---: | ---: | ---: |
| `src/common/WorkspaceTabs.tsx` | 100% | 95% | 100% | 100% |
| `src/common/workspaceTabState.ts` | 100% | 90.62% | 100% | 100% |

## 浏览器验证

验证方式：本地 production build + `npx serve -s build -l 7002` + Playwright。浏览器层 mock 仅返回脱敏最小账户对象和空列表响应，用于进入前端 Shell；不验证真实后端、认证、OIDC、Gateway、Provider 或 DB 链路。

桌面 `1440x900`：

- 注入历史 sessionStorage：`/`、`/404`、`/shortcuts`、`/legacy-route`、`/organizations`、`/providers`。
- 刷新后标签为 `Identity Overview`、`Organizations`、`Identity Source Center`；sessionStorage 写回为 `/`、`/organizations`、`/providers`；未出现 `/404`、`/shortcuts`、`/legacy-route`。
- 依次访问 `/groups`、`/users`、`/entries` 后，标签顺序为 `Identity Overview`、`Organizations`、`Identity Source Center`、`Groups`、`Users`、`Entry Configurations`。
- 点击已有 `Organizations`、`Groups` 后，标签顺序保持不变，只切换 active。
- 关闭当前 `Groups` 后，跳转到右侧相邻 `Users`，标签顺序为 `Identity Overview`、`Organizations`、`Identity Source Center`、`Users`、`Entry Configurations`。
- 直接访问 `/unknown-workspace-route` 时页面显示 404，标签和 sessionStorage 不包含未知路径。
- desktop console warning/error=0，pageerror=0，document/body `scrollWidth == clientWidth`。

移动 `390x844`：

- 使用 mobile user-agent / touch context 触发 `react-device-detect` 移动分支。
- 渲染 `.admin-workspace-tabs-mobile`，未渲染 `.admin-workspace-tabs-desktop`。
- 注入历史坏标签后，mobile tabs 文本不包含 `/404`、`/shortcuts`、`/legacy-route`。
- document/body `scrollWidth == clientWidth == 390`，标签栏降级不造成页面级横向溢出。
- mobile console warning/error=0，pageerror=0。

## 运行态验收口径

本 change 仅验证 Admin 前端 Shell workspace tabs 的路由恢复、顺序稳定、关闭相邻规则和标签栏轻量样式/可访问性。不声明后端、认证/OIDC、Gateway、Provider、真实账号或测试环境链路成功。

## 剩余风险

- 桌面 UA + 390px 人为窄视口会继续暴露既有总览/表格宽度问题；真实 mobile UA 下标签栏分支无页面级溢出。表格字段技术化、行操作按钮视觉重量、业务表格移动端横向滚动策略均不在本 change 范围内，作为 `next_candidate_task` 回传。
- 浏览器验证使用本地 build 和脱敏 mock API，不覆盖真实数据权限、真实登录 Cookie 或后端接口可用性。
