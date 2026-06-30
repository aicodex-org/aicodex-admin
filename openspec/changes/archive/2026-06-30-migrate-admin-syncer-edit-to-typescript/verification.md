## 验证摘要

本 change 只迁移同步器编辑页和字段映射表格到 TSX，不连接真实数据库、不测试真实同步器、不修改后端 API 契约。

| 验证项 | 命令 | 结果 |
| --- | --- | --- |
| OpenSpec target | `openspec validate migrate-admin-syncer-edit-to-typescript --strict` | 通过。 |
| TypeScript | `cd web-admin; yarn typecheck` | 通过，`tsc --noEmit` 成功。 |
| 增量 TS gate | `cd web-admin; node scripts/check-incremental-typescript-gate.mjs --base origin/hfl-test-base` | 通过，无输出。 |
| Build | `cd web-admin; yarn build` | 通过，CRACO production build 成功；仅有既有 Browserslist/deprecation 警告和 bundle size 提示。 |
| Diff check | `git diff --check origin/hfl-test-base...HEAD` | 通过。 |
| 聚焦 Jest / coverage | `cd web-admin; yarn test --watchAll=false --runInBand --coverage --collectCoverageFrom=src/SyncerListPage.tsx --collectCoverageFrom=src/backend/SyncerBackend.ts --testMatch "**/src/SyncerListPage.test.tsx" "**/src/backend/SyncerBackend.test.ts" --coverageReporters=text-summary --coverageReporters=json-summary` | 通过，2 suites / 13 tests passed。Statements 98.82%、Branches 63.79%、Functions 97.67%、Lines 98.79%。输出存在项目既有 React 18 `ReactDOM.render` warning，不影响断言结果。 |

## Jest 记录

在 `.codex` 隐藏 worktree 下，CRA/Jest 默认 discovery 和 `--runTestsByPath` 可能无法匹配测试文件。本 change 使用项目既有验证记录中的等价方式，显式传入 `--testMatch` 锁定同步器测试文件，并真实运行到 2 个 test suite / 13 个 test。

失败定位记录：

- `cd web-admin; yarn test --runTestsByPath src/SyncerListPage.test.tsx src/backend/SyncerBackend.test.ts --watchAll=false` 在隐藏 worktree 下发现 0 tests，未作为通过证据。
- 直接使用外部完整依赖环境运行 CRACO 会从当前 worktree 的 `node_modules` 查找 `typescript`，因此最终采用临时来源依赖 junction + 显式 `--testMatch`。运行完成后清理 `coverage/`、`build/` 和依赖 junction，不提交运行产物。

## Deferred / 剩余风险

- 未新增 `SyncerEditPage.test.tsx`。本次迁移为机械 TSX 迁移，编辑页行为证据主要来自 typecheck、增量 TS gate、production build 和同步器列表/backend 现有聚焦测试。
- 本地测试使用临时来源依赖 junction 解决新 worktree 缺失 `node_modules` 的问题；该 junction 已在收尾前清理。
