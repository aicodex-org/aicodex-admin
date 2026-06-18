## Release Candidate Report

| 字段 | 值 |
| --- | --- |
| route | `admin-enterprise-identity-console` |
| change | `fix-admin-enterprise-apps-navigation-entry` |
| workspace / worktree | `C:\Users\Administrator\.codex\worktrees\5ff1\aicodex-admin` |
| branch | `hfl-test/fix-admin-enterprise-apps-navigation-entry` |
| base | `origin/hfl-test-base=cd2c712aa831f62fc199019abb3a395713196613` |
| HEAD | 当前工作分支 HEAD；精确 hash 以最终结构化回传为准 |
| origin/test | `4fe293e7d009ad7f81c0dd1c7c9daaa8b92cf6c6` |
| origin/hfl-test-base..HEAD | 1 commit：`fix(web-admin): 修复企业认证中心应用导航入口` |
| archive | 未执行 |
| push / merge hfl-test-base | 未 push，未 merge |
| touched test branch | 否 |
| active_write_set_touched | `openspec/changes/fix-admin-enterprise-apps-navigation-entry/**`; `web-admin/src/enterpriseNavigation.js`; `web-admin/src/ManagementPage.navigation.test.js`; `web-admin/src/common/NavItemTree.test.js`; `web-admin/src/locales/{zh,en}/data.json` |
| report path | `openspec/changes/fix-admin-enterprise-apps-navigation-entry/report.md` |

## 实现摘要

- local admin 企业认证中心导航和组织导航配置树不再展示旧 `/apps` 应用门户入口。
- `/applications` 保持在“应用接入”分组，继续作为应用接入中心主入口。
- 非 local admin fallback 保留 `/apps`，并将可见导航文案改为“应用门户 / Application Portal”。
- 未修改 `ManagementPage.js` 的 `/apps` 路由，也未修改 `IdentityConsoleOverview` 的非 local admin `history?.push?.("/apps")` fallback。

## 验证摘要

- 已 fetch 后将本 change 单提交 rebase 到 `origin/hfl-test-base@cd2c712a`，无冲突；最终仍为 1 个逻辑提交。
- `openspec validate fix-admin-enterprise-apps-navigation-entry --strict`：通过。
- `openspec validate --changes --strict`：通过，7 changes passed。
- 聚焦 Jest 红绿验证：旧实现失败，修复后 2 suites / 9 tests passed。
- 覆盖率：`enterpriseNavigation.js` statements 100%，branches 85.71%，functions 100%，lines 100%。
- `git diff --check origin/hfl-test-base..HEAD` / `git diff --cached --check`：通过。
- `node scripts/check-incremental-typescript-gate.mjs --base origin/hfl-test-base`：通过。
- `yarn typecheck`：通过。
- `yarn build`：通过，`Compiled successfully.`。

## 剩余风险 / blocker

- 未执行真实登录态浏览器验证，原因是当前 worktree 无已授权 Admin 后端与 local admin 登录态；建议主控在测试环境复验 local admin 侧栏不再出现“应用列表 -> /apps”，且“应用接入 -> /applications”仍可进入。

## 交付状态

- tasks 已完成，当前为 release candidate。
- archive 未执行，等待主控决策。
- 未 push，未合入 `hfl-test-base`，未 checkout/merge/push `test`。
- 当前 worktree 保留，供主控继续 review、archive 或合入决策。
