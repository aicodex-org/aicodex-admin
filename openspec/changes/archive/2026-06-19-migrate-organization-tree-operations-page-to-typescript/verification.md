## 验证摘要

本 change 只做组织树运营页保守 TypeScript 迁移，不修改路由、权限、API path、请求参数、后端 Go 行为或真实组织数据。

## 已运行验证

- `openspec validate migrate-organization-tree-operations-page-to-typescript --strict`：通过。
- `openspec validate --changes --strict`：通过，5 个 active changes 全部 valid。
- `openspec validate --specs --strict`：通过，26 个 specs 全部 valid。
- `git diff --check`：通过。
- `web-admin`: `node scripts/check-incremental-typescript-gate.mjs --base origin/hfl-test-base`：通过。
- `web-admin`: `yarn typecheck`：通过。
- `web-admin`: 聚焦 Jest/coverage：
  `CI=true NODE_ENV=test BABEL_ENV=test yarn test --watchAll=false --runInBand --coverage --testMatch "**/src/OrganizationTreeOperationsPage.test.tsx" --testMatch "**/src/backend/OrganizationTreeOperationsBackend.test.ts" --collectCoverageFrom=src/OrganizationTreeOperationsPage.tsx --collectCoverageFrom=src/backend/OrganizationTreeOperationsBackend.ts --coverageReporters=text-summary --coverageReporters=json-summary`
  通过，2 个 suites / 21 个 tests。
- `web-admin`: `yarn build`：通过，产物生成到 `web-admin/build`。
- 收口前已清理验证产物 `web-admin/build` 和 `web-admin/coverage`。

## 覆盖率

聚焦 changed-file coverage：

- `OrganizationTreeOperationsPage.tsx`：statements 87.19%，branches 77.82%，functions 87.64%，lines 87.56%。
- `OrganizationTreeOperationsBackend.ts`：statements 100%，branches 40%，functions 100%，lines 100%。
- 汇总：statements 88.18%，branches 77.04%，functions 88.65%，lines 88.53%。

## 已知 warning

- 聚焦 Jest 仍输出 React 18 legacy `ReactDOM.render` warning，这是当前 Testing Library/CRA 测试环境既有噪声。
- 聚焦 Jest 仍输出 AntD `Tree` / `rc-virtual-list` 的 `scrollWidth` 与 `act(...)` warning，测试断言通过，未发现本次迁移引入行为差异。
- `yarn build` 输出既有 bundle size 提示、`Browserslist` 数据过期提示和 Node `DEP0176` deprecation warning；构建成功。

## 剩余风险

- 本 change 是 release-candidate-only：仅推送工作分支，不合入或 push `hfl-test-base` / `test`。
- 未做浏览器手工验证；迁移保留现有行为，并由 typecheck、Jest/coverage 和 production build 覆盖。
