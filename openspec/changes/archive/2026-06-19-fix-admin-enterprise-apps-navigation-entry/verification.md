## 验证摘要

本 change 只修改 Admin 企业认证中心导航配置、导航测试和 zh/en locale，不触碰 `/apps` 路由实现、`IdentityConsoleOverview` 非 local admin fallback、OAuth/OIDC callback、Gateway projection 或 secrets。

## 验证记录

| 层级 | 命令 / 路径 | 结果 |
| --- | --- | --- |
| 基线确认 | `git fetch origin hfl-test-base test`; `git rev-parse origin/hfl-test-base`; `git rev-parse origin/test` | 通过；`origin/hfl-test-base=cd2c712aa831f62fc199019abb3a395713196613`，`origin/test=4fe293e7d009ad7f81c0dd1c7c9daaa8b92cf6c6` |
| Base drift replay | `git rebase origin/hfl-test-base`; `git rev-list --count origin/hfl-test-base..HEAD`; `git log --oneline origin/hfl-test-base..HEAD` | 通过；无冲突，最终保持 1 个逻辑 commit：`fix(web-admin): 修复企业认证中心应用导航入口` |
| OpenSpec change | `openspec validate fix-admin-enterprise-apps-navigation-entry --strict` | 通过；`Change 'fix-admin-enterprise-apps-navigation-entry' is valid` |
| OpenSpec all changes | `openspec validate --changes --strict` | 通过；7 changes passed，0 failed |
| TDD 红灯 | 在非隐藏校验副本执行 `yarn test --watchAll=false --runInBand --runTestsByPath src/ManagementPage.navigation.test.js src/common/NavItemTree.test.js` | 预期失败；断言显示 local admin Overview 仍包含 `/apps`，非 local admin `/apps` 文案仍为“应用列表 / Apps”，配置树仍包含 `/apps` |
| 聚焦 Jest | 在非隐藏校验副本执行 `yarn test --watchAll=false --runInBand --runTestsByPath src/ManagementPage.navigation.test.js src/common/NavItemTree.test.js` | 通过；2 suites / 9 tests passed |
| 覆盖率 | 在非隐藏校验副本执行 `yarn test --watchAll=false --runInBand --coverage --collectCoverageFrom=src/enterpriseNavigation.js --runTestsByPath src/ManagementPage.navigation.test.js src/common/NavItemTree.test.js` | 通过；`enterpriseNavigation.js` statements 100%，branches 85.71%，functions 100%，lines 100% |
| Diff 空白检查 | `git diff --check origin/hfl-test-base..HEAD`; `git diff --cached --check` | 通过 |
| 增量 TypeScript 门禁 | `cd web-admin; node scripts/check-incremental-typescript-gate.mjs --base origin/hfl-test-base` | 通过 |
| TypeScript | `cd web-admin; yarn typecheck` | 通过；`tsc --noEmit` exit 0 |
| Build | `cd web-admin; yarn build` | 通过；`Compiled successfully.`；生成物位于忽略的 `web-admin/build` |

## 浏览器验证

未执行真实浏览器 local admin 侧栏验证。原因：当前 worktree 没有已授权的 Admin 后端与 local admin 登录态；`ManagementPage` 运行时需要账号上下文和后端 API。替代证据为导航生成函数的红绿 Jest 覆盖了：

- local admin 运行时 Overview 不再包含 `/apps`；
- 配置树 Overview 不再包含 `/apps`；
- `/applications` 仍在“应用接入”分组；
- 非 local admin `userNavItems: ["all"]` 仍保留 `/apps`，文案为“应用门户 / Application Portal”；
- `/apps` selection 仍定位到 Overview fallback。

## 覆盖率说明

本次生产代码改动集中在 `web-admin/src/enterpriseNavigation.js`，覆盖率统计对象为该文件，分支覆盖率 85.71%，达到 85% 门槛。locale 和 OpenSpec 文档不适用单测覆盖率。

## 剩余风险

- 未在真实登录态浏览器中点击侧栏验证；需要主控或后续测试环境使用 local admin 账号复验侧栏文案与 `/applications` 入口。
- `web-admin` 当前隐藏 worktree 路径下 Jest 默认 test discovery 异常，因此 Jest 在非隐藏校验副本 `D:\CodeRepo\LeagProject\aicodex-admin-verify-apps-nav-red-5ff1` 执行；源码写集仍保留在当前 Git worktree。
