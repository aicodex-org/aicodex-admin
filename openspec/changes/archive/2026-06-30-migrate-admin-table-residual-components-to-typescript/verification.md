## 验证摘要

- `openspec validate migrate-admin-table-residual-components-to-typescript --strict`: 通过。
- `git diff --check`: 通过；final closeout 会在 rebase 最新 `origin/hfl-test-base` 并形成最终 commit 后重跑 range diff check。
- `yarn test --watchAll=false --runInBand --testMatch "**/src/table/ProviderTable.test.tsx"`: 通过，1 suite / 6 tests；输出包含 React 18 + 旧 testing-library 的 `ReactDOM.render` warning，不影响结果。
- `yarn typecheck`: 通过。
- `node scripts/check-incremental-typescript-gate.mjs --base origin/hfl-test-base`: 通过。
- `yarn build`: 通过；输出包含既有 Browserslist 提示和 bundle size 提示。

## 测试缺口

- 本批多数 residual table 组件没有现成 Jest suite；未用 `0 tests` 作为验证证据。
- `ProviderTable` 和 `ProviderTable.test` 已纳入迁移并真实运行 focused Jest。
- 其余机械迁移通过 `yarn typecheck`、增量 TypeScript gate 和 `yarn build` 覆盖 TS/TSX 编译、无后缀 import 和构建路径。

## Coverage

- 未运行 coverage。本 change 是机械 TSX 迁移，任务门禁未要求 coverage；当前可用现成测试集中在 `ProviderTable.test`。

## Deferred

- 无。`ProviderTable` / `ProviderTable.test` 已纳入本次迁移。

## 运行态与脱敏

- 未做浏览器 smoke；本批未改变表格交互语义、路由、后端 API 契约或用户可见文案。
- 验证记录未包含 token、secret、Cookie、client secret、私有 URL、个人邮箱、手机号或其它敏感字段原值。
