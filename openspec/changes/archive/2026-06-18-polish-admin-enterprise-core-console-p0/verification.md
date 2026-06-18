## 验证记录

验证时间：2026-06-18（本地 worker worktree）。

## 基线与分支

- `git fetch origin hfl-test-base test`：通过。
- `origin/hfl-test-base`：`0d76e12bac52ade65da945df5d0e3a0665a3652f`。
- `origin/test`：`4fe293e7d009ad7f81c0dd1c7c9daaa8b92cf6c6`，仅只读记录，未切换、未合入、未推送。
- `git rev-list --left-right --count HEAD...origin/hfl-test-base`：`1 0`，当前 worker 分支 ahead 1、behind 0。

## OpenSpec 与源码门禁

- `openspec validate polish-admin-enterprise-core-console-p0 --strict`：通过。
- `openspec validate --changes --strict`：通过，6 个 active changes 全部 valid。
- `git diff --check`：通过。
- `cd web-admin; node scripts/check-incremental-typescript-gate.mjs --base origin/hfl-test-base`：通过。
- `cd web-admin; yarn typecheck`：通过。
- `cd web-admin; yarn build`：通过。构建输出提示 bundle size 较大、Browserslist 数据过期、`fs.F_OK` deprecation，均为既有构建噪声；未出现编译错误。

## 聚焦 Jest / Coverage

命令：

```powershell
cd web-admin
yarn test --watchAll=false --runInBand --coverage --testMatch "**/src/IdentityConsoleOverview.test.js" --testMatch "**/src/ApplicationAccessCenter.test.js" --testMatch "**/src/ApplicationListPage.test.tsx" --testMatch "**/src/AccessWizardPage.test.tsx" --testMatch "**/src/OrganizationTreeOperationsPage.test.js" --testMatch "**/src/OrganizationDirectoryQualityPage.test.js" --testMatch "**/src/RecordListPage.test.js" --testMatch "**/src/recordAuditPresentation.test.ts" --testMatch "**/src/WecomOrganizationSyncPage.test.js" --testMatch "**/src/FeishuOrganizationSyncPage.test.js" --collectCoverageFrom=src/IdentityConsoleOverview.js --collectCoverageFrom=src/ApplicationAccessCenter.js --collectCoverageFrom=src/ApplicationListPage.js --collectCoverageFrom=src/AccessWizardPage.tsx --collectCoverageFrom=src/OrganizationTreeOperationsPage.js --collectCoverageFrom=src/OrganizationDirectoryQualityPage.js --collectCoverageFrom=src/RecordListPage.js --collectCoverageFrom=src/recordAuditPresentation.ts --collectCoverageFrom=src/WecomOrganizationSyncPage.js --collectCoverageFrom=src/FeishuOrganizationSyncPage.js
```

结果：10 suites passed，79 tests passed。

覆盖率摘要：All files lines `73.54%`，statements `73.69%`，branches `66.1%`，functions `74.51%`。`OrganizationDirectoryQualityPage.js` lines `85.3%`，`OrganizationTreeOperationsPage.js` lines `78.78%`，`AccessWizardPage.tsx` lines `91.66%`。`ApplicationListPage.js` 与 `RecordListPage.js` 仍是 legacy 大 JS 页，聚焦测试覆盖了本次行为但未把整页覆盖率拉到 85%。测试输出存在既有 React 18 `ReactDOM.render`、AntD `bodyStyle` deprecated、jsdom `act` warning 噪声，测试结论为通过。

## 浏览器本地验证

验证方式：本地生产构建 `web-admin/build`，静态服务 `http://127.0.0.1:7102`，Playwright + 脱敏 mock `/api/*`。未使用 60 环境，未真实登录，未执行同步、OAuth/OIDC callback、Gateway publish/projection/cleanup/receipt 或任何破坏性动作。

检查项：desktop `1440x900` 与 mobile `390x844`，覆盖 `/`、`/applications`、`/access-wizard`、`/records`、`/wecom-org-sync`、`/feishu-org-sync`、`/organization-tree-operations`、`/organization-directory-quality`。所有路由均无 webpack overlay、无 page error、无 console error/warning，且 `document.documentElement.scrollWidth <= clientWidth + 1`。

关键移动端指标：

| Route | scrollWidth | clientWidth | 结论 |
| --- | ---: | ---: | --- |
| `/` | 390 | 390 | 通过 |
| `/applications` | 390 | 390 | 通过 |
| `/access-wizard` | 390 | 390 | 通过 |
| `/records` | 390 | 390 | 通过，主表未出现 mock 中 raw `accessToken`、`trace`、`reason` 文本 |
| `/wecom-org-sync` | 390 | 390 | 通过，宽表滚动限制在表格 wrapper 内 |
| `/feishu-org-sync` | 390 | 390 | 通过，宽表滚动限制在表格 wrapper 内 |
| `/organization-tree-operations` | 390 | 390 | 通过，诊断表滚动限制在表格 wrapper 内 |
| `/organization-directory-quality` | 390 | 390 | 通过，质量表滚动限制在表格 wrapper 内 |

首屏密度观察：desktop `/applications` table wrapper top `505px`；desktop `/records` table wrapper top `543px`；desktop `/organization-directory-quality` table wrapper top `352px`。移动端同步页表格更靠后但页面级横向溢出已消除，且主操作按钮在表格前可见。

## 运行态边界

- 未触碰、未切换、未推送 `test`。
- 未 force-push，未自动合入或推送 `hfl-test-base`。
- 未做真实 60 登录态 smoke；本次 browser 证据为本地生产构建 + 脱敏 API mock。
- 未触发真实同步、真实连接测试、OAuth/OIDC callback、Gateway 或生产/类生产配置写入。
