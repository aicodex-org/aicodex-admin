## 验证摘要

本 change 只迁移 `web-admin/src/GroupTreePage` 及其聚焦测试，没有后端、数据库、权限、认证/OIDC、Provider、企业微信/飞书组织同步、Gateway、Insight 或真实环境配置改动。

## 命令记录

- `openspec validate migrate-organization-group-tree-to-typescript --strict`：通过。
- `openspec validate --changes --strict`：通过，5 个 active changes 均通过。
- `git diff --check`：通过。
- `cd web-admin; node scripts/check-incremental-typescript-gate.mjs --base origin/hfl-test-base`：通过。
- `cd web-admin; yarn typecheck`：通过。
- `cd web-admin; yarn build`：通过；输出存在既有 bundle size、Browserslist outdated 和 `fs.F_OK` deprecation warning。
- `cd web-admin; yarn test --watchAll=false --runTestsByPath src/GroupTreePage.test.tsx --coverage --collectCoverageFrom=src/GroupTreePage.tsx`：在 `.codex\worktrees` 隐藏目录路径下，CRA/Jest 默认 test discovery 未匹配测试文件，不能作为有效测试结果。
- `cd web-admin; NODE_ENV=test BABEL_ENV=test node <inline-jest-runner>`：通过。该 runner 复用 `react-scripts` Jest transform/setup，仅将 `testMatch` 收窄为 `<rootDir>/src/GroupTreePage.test.tsx`，清空 `testPathIgnorePatterns`，用于规避当前隐藏 worktree 路径下的测试发现问题；未改项目配置。

## 聚焦测试与覆盖率

- 测试对象：`src/GroupTreePage.test.tsx`。
- 生产代码覆盖率对象：`src/GroupTreePage.tsx`。
- 测试结果：11 passed / 0 failed。
- 覆盖率：statements 100%，branches 94.87%，functions 100%，lines 100%，满足 85% changed-file 覆盖率门槛。
- 测试输出存在项目既有 React 18 + Testing Library 旧 `ReactDOM.render` warning，以及 AntD/rc-tree 在测试环境中的 `scrollWidth` / `act(...)` warning；断言均通过，本 change 未更改测试框架或 React render API。

## 剩余风险

- 当前验证证明 TSX 迁移后的源码、测试、构建和群组树行为边界可用；未进行浏览器手工点击验证，因为本 change 不改变 UI 布局、路由入口或真实运行态行为。
- `GroupTreePage` 仍保留旧 `UNSAFE_componentWillMount` 加载模式；这是既有行为，本 change 只做类型迁移，不调整生命周期。
- 多条组织账号 TS 迁移 RC 后续统一合入时，可能需要处理 `web-admin-incremental-typescript` 主规格 delta 的顺序或冲突。
