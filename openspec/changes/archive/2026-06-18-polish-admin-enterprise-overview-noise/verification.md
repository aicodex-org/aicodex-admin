## 验证摘要

本 change 仅修改企业认证中心总览、总览聚焦测试、`zh` / `en` locale 和本 change 的 OpenSpec 文档。未触碰组织同步页、组织运营页、认证/授权执行逻辑、Gateway publish/projection/cleanup/receipt、secrets、`test` 分支或 `hfl-test-base` 合入。

## 命令与结果

| 层级 | 命令 | 结果 |
| --- | --- | --- |
| OpenSpec 单 change | `openspec validate polish-admin-enterprise-overview-noise --strict` | 通过，`Change 'polish-admin-enterprise-overview-noise' is valid`。 |
| OpenSpec 全 active changes | `openspec validate --changes --strict` | 通过，6/6 active changes valid。 |
| Diff 空白检查 | `git diff --check` | 通过，无 trailing whitespace 或 conflict marker。 |
| Incremental TypeScript gate | `cd web-admin; node scripts/check-incremental-typescript-gate.mjs --base origin/hfl-test-base` | 通过，无新增不符合渐进 TS 规则的文件。 |
| TypeScript | `cd web-admin; yarn typecheck` | 通过，`tsc --noEmit` exit 0。 |
| 聚焦 Jest / coverage | `cd web-admin; yarn test --watchAll=false --runInBand --coverage --collectCoverageFrom=src/IdentityConsoleOverview.js --testMatch "**/src/IdentityConsoleOverview.test.js"` | 通过，1 suite / 4 tests passed。`IdentityConsoleOverview.js` coverage: statements 89.28%, branches 86.4%, functions 91.66%, lines 89.28%。 |
| Build | `cd web-admin; yarn build` | 通过，production build compiled successfully。输出存在既有 bundle size 提示、`fs.F_OK` deprecation 和 Browserslist 数据过期提示。 |
| Commit diff check | `git diff --check HEAD~1..HEAD` | 通过。 |

聚焦 Jest 输出仍包含仓库既有 React 18 下旧 `@testing-library/react` / `ReactDOM.render` 兼容 warning；断言全部通过，未作为本 change 新增问题处理。

## TDD 记录

1. 先在 `IdentityConsoleOverview.test.js` 新增 RED 测试 `demotes abstract governance centers into status-oriented pending summaries`。
2. 首次执行聚焦 Jest 因当前 worktree 缺少 `web-admin/node_modules/.bin/craco` 未运行到断言；通过本地 ignored junction 复用固定 workspace 依赖后重跑。
3. RED 失败点为找不到新标题 `运行状态与待关注事项`，证明当前实现仍是旧入口文案。
4. 实施后重跑同一聚焦 Jest，4/4 tests passed。

## 浏览器验证

使用本地 production build，只读 mock 以下接口以避免真实登录链路和真实环境数据：

- `GET /api/get-account`
- `GET /api/get-organization-names`
- `GET /api/get-dashboard`

桌面 `1440x900`：

- `console error/warning = 0`，`pageerror = 0`。
- `document.documentElement.scrollWidth = 1425`，`clientWidth = 1425`，无页面级横向溢出。
- 旧显眼入口文案不存在：`对象关系证据链`、独立 `接入预检`、`进入任务中心`。
- 新状态摘要和 deep link 存在：`运行状态与待关注事项`、`查看关联证据 -> /identity-assets`、`核对接入条件 -> /access-wizard`、`查看风险待办 -> /governance-tasks`。

移动 `390x844`，使用移动 UA / mobile context：

- `console error/warning = 0`，`pageerror = 0`。
- `document.documentElement.scrollWidth = 390`，`clientWidth = 390`，无页面级横向溢出。
- 旧显眼入口文案不存在，新状态摘要与三个 deep link 均存在。

## 剩余风险

- 浏览器验证使用本地 production build + 脱敏 mock API，不等同 60 容器、真实登录态、真实后端数据或 nginx 部署验证。
- 本 change 保留现有 `EnterpriseIdentityRiskList` 视觉结构，仅通过排序和文案降噪；如果后续需要进一步改变布局密度，应另开小范围 change。

## 主控归档前复查

2026-06-18 主控按最新 `origin/hfl-test-base` 重新复查本 change，并修正文档语言门槛问题：

- 将 `tasks.md`、delta spec、`proposal.md` 和 `design.md` 中的协作文档正文改为中文说明；保留 `Requirement`、`Scenario`、`SHALL`、路径、命令和代码标识等 OpenSpec / 工具关键字。
- 将工作分支 rebase 到最新 `origin/hfl-test-base`，最终仍保持 `origin/hfl-test-base..HEAD` 1 个逻辑提交。
- `openspec validate polish-admin-enterprise-overview-noise --strict`：通过。
- `openspec validate --changes --strict`：通过，6/6 active changes valid。
- `git diff --check HEAD~1..HEAD`：通过。
- `cd web-admin; node scripts/check-incremental-typescript-gate.mjs --base origin/hfl-test-base`：通过。
- `cd web-admin; yarn typecheck`：通过，`tsc --noEmit` exit 0。
- `cd web-admin; yarn test --watchAll=false --runInBand --coverage --collectCoverageFrom=src/IdentityConsoleOverview.js --testMatch "**/src/IdentityConsoleOverview.test.js"`：通过，`IdentityConsoleOverview.js` coverage 为 statements 89.28%、branches 86.4%、functions 91.66%、lines 89.28%。
- `cd web-admin; yarn build`：通过，`Compiled successfully`；仅保留既有 bundle size 提示。

复查期间仅使用本地 ignored `node_modules` junction 复用固定 workspace 依赖；验证结束后已清理 junction、`build` 和 `coverage` 产物。

## Continue-worker 最新基线收口

2026-06-18 收到主控 `continue-worker` 后，本 worker 重新以最新 `origin/hfl-test-base@e72b3ad1a87126965caed8e969135d099f3a53a2` 收口。`HEAD..origin/hfl-test-base` 当时包含：

- `e72b3ad1 feat(admin): 对齐组织同步配置布局`
- `54926b82 docs(openspec): 更新openspec skill（正文默认中文）`

执行结果：

- `git fetch origin hfl-test-base test`：完成；`origin/test@4fe293e7d009ad7f81c0dd1c7c9daaa8b92cf6c6` 仅只读观察，未 checkout、push 或 touch `test`。
- `git rebase origin/hfl-test-base`：无冲突完成，写集仍限制在总览降噪相关文件。
- `origin/hfl-test-base..HEAD`：仍为 1 个逻辑提交，`feat(admin): 降噪企业认证中心总览入口`。
- `openspec validate polish-admin-enterprise-overview-noise --strict`：通过。
- `openspec validate --changes --strict`：通过，6/6 active changes valid。
- `git diff --check origin/hfl-test-base..HEAD`：通过。
- `cd web-admin; node scripts/check-incremental-typescript-gate.mjs --base origin/hfl-test-base`：通过。
- `cd web-admin; yarn typecheck`：通过，`tsc --noEmit` exit 0。
- `cd web-admin; yarn test --watchAll=false --runInBand --coverage --collectCoverageFrom=src/IdentityConsoleOverview.js --testMatch "**/src/IdentityConsoleOverview.test.js"`：通过，1 suite / 4 tests passed；`IdentityConsoleOverview.js` coverage 为 statements 89.28%、branches 86.4%、functions 91.66%、lines 89.28%。
- `cd web-admin; yarn build`：通过，`Compiled successfully`；仅保留既有 bundle size 提示、`fs.F_OK` deprecation 和 Browserslist 数据过期提示。
- 本地 production build + 脱敏 mock API `/` 复验：
  - desktop `1440x900`：console error/warning 0，pageerror 0，`scrollWidth=1425`、`clientWidth=1425`。
  - mobile `390x844` with mobile UA：console error/warning 0，pageerror 0，`scrollWidth=390`、`clientWidth=390`。
  - 旧显眼入口文案不存在，新状态摘要和 `/identity-assets`、`/access-wizard`、`/governance-tasks` deep link 均存在。

验证结束后已关闭本地静态服务和浏览器，并清理本轮生成的 ignored `web-admin/build/`、`web-admin/coverage/` 和 `web-admin/node_modules` junction。

## 主控最终回收与归档前验证

2026-06-18 主控回收时再次 `fetch origin hfl-test-base test`，确认最终合入前基线为 `origin/hfl-test-base@bc4f9d5250831a669ba9bd2f1a0a65ad82e2d911`，`origin/test@4fe293e7d009ad7f81c0dd1c7c9daaa8b92cf6c6` 仅只读观察，未 checkout、push 或 touch `test`。

`e72b3ad1a87126965caed8e969135d099f3a53a2..bc4f9d5250831a669ba9bd2f1a0a65ad82e2d911` 之间仅包含 `docs(openspec): 统一组织同步规格中文正文` 和 `docs(openspec): 收窄规格语言规则例外`，未改变 `web-admin` 运行时代码；因此本轮不重复记录 60 环境或真实登录态 smoke，只复用 worker 在本地 production build + 脱敏 mock API 下取得的 `/` 桌面/移动 UI 证据。

主控在当前最新基线上重跑的验证结果：

- `openspec validate polish-admin-enterprise-overview-noise --strict`：通过。
- `openspec validate --changes --strict`：通过，6/6 active changes valid。
- `git diff --check origin/hfl-test-base..HEAD`：通过。
- `cd web-admin; node scripts/check-incremental-typescript-gate.mjs --base origin/hfl-test-base`：通过。
- `cd web-admin; yarn typecheck`：通过，`tsc --noEmit` exit 0。
- `cd web-admin; yarn test --watchAll=false --runInBand --coverage --testMatch "**/src/IdentityConsoleOverview.test.js" --collectCoverageFrom=src/IdentityConsoleOverview.js --coverageReporters=text-summary --coverageReporters=json-summary`：通过，1 suite / 4 tests passed；`IdentityConsoleOverview.js` coverage 为 statements 89.28%、branches 86.4%、functions 91.66%、lines 89.28%。
- `cd web-admin; yarn build`：通过，`Compiled successfully`；仅保留既有 bundle size 提示、`fs.F_OK` deprecation 和 Browserslist 数据过期提示。

主控尝试补跑本地 Playwright 脚本时，当前 isolated worktree 只能通过 `npx playwright --version` 看到 CLI 版本，Node 脚本 `require("playwright")` 无法解析模块；未将该工具链限制写成页面失败。浏览器 evidence 仍按上一段 worker 的本地 production build + 脱敏 mock API 口径记录，不能等同 60 容器、真实登录态或 nginx 部署验证。
