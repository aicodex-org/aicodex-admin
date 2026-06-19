## 验证摘要

本 change 只迁移 `web-admin/src/ApplicationAccessCenter` 及其聚焦测试，没有后端、数据库、认证、OIDC、Provider、Gateway 或密钥行为改动。

## 命令记录

- `openspec validate migrate-application-access-center-to-typescript --strict`: 通过。
- `openspec validate --changes --strict`: 通过，5 个 active changes 均通过。
- `openspec validate --specs --strict`: 通过，26 个主规格均通过。
- `git diff --check`: 通过。
- `cd web-admin; node scripts/check-incremental-typescript-gate.mjs --base origin/hfl-test-base`: 通过。
- `cd web-admin; yarn typecheck`: 通过。
- `cd web-admin; yarn build`: 通过，生成产物已作为本地验证产物清理。
- `cd web-admin; yarn test --watchAll=false --runInBand --coverage --collectCoverageFrom=src/ApplicationAccessCenter.tsx --runTestsByPath src/ApplicationAccessCenter.test.tsx`: 在 `.codex\worktrees` 隐藏目录路径下，CRA/Jest 默认绝对 `testMatch` 未匹配测试文件，不能作为有效测试结果。
- `cd web-admin; NODE_ENV=test BABEL_ENV=test node <inline-jest-runner>`：通过。该命令复用 `react-scripts` 的 Jest transform/setup，只将 `testMatch` 收窄到 `<rootDir>/src/ApplicationAccessCenter.test.tsx` 并清空 `testPathIgnorePatterns`，用于规避 `.codex\worktrees` 隐藏目录路径下的测试发现问题；未改项目配置。

## 聚焦测试与覆盖率

- 测试对象：`src/ApplicationAccessCenter.test.tsx`
- 生产代码覆盖率对象：`src/ApplicationAccessCenter.tsx`
- 测试结果：7 passed / 0 failed。
- 覆盖率：statements 100%，branches 91.81%，functions 100%，lines 100%，满足 85% changed-file 覆盖率门槛。

## 剩余风险

- 当前验证证明 TSX 迁移后的源码、测试、构建和摘要行为可用；未进行浏览器手工点击验证，因为本 change 不改变 UI 布局、路由或运行态行为。
- `web-admin/node_modules` 为本 worktree 本地验证依赖，属于 ignored 产物，最终 closeout 前需要清理。
