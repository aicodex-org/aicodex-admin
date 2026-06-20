## 验证记录

本记录只描述本地源码、类型、测试和构建层级验证；本 change 不改后端 API、权限模型、Casbin policy CRUD 或真实环境配置，未执行真实登录态/真实后端 E2E。

### RED

- `cd web-admin; yarn test --watchAll=false --runInBand --runTestsByPath src/EnforcerListPage.test.tsx`
  - 结果：失败，5 个测试中 4 个通过，`migrates Casbin enforcer list page module to TSX` 因 `./EnforcerListPage.tsx` 尚不存在失败。
  - 结论：新增测试先约束 `.js -> .tsx` 迁移目标，失败原因符合预期。

### GREEN

- `openspec validate migrate-authorization-casbin-enforcer-list-page-to-typescript --strict`
  - 结果：通过，change valid。
- `openspec validate --changes --strict`
  - 结果：通过，5 个 active changes passed，0 failed。
- `git diff --check`
  - 结果：通过，无输出。
- `cd web-admin; yarn test --watchAll=false --runInBand --runTestsByPath src/EnforcerListPage.test.tsx`
  - 结果：通过，1 suite passed，5 tests passed。
  - 备注：输出现有 React 18 `ReactDOM.render` warning，未作为本 change 阻断。
- `cd web-admin; yarn typecheck`
  - 结果：通过，`tsc --noEmit`。
- `cd web-admin; node scripts/check-incremental-typescript-gate.mjs --base origin/hfl-test-base`
  - 结果：通过，退出码 0。
- `cd web-admin; yarn test --coverage --coverageDirectory=coverage-enforcer-list --watchAll=false --runInBand --runTestsByPath src/EnforcerListPage.test.tsx --collectCoverageFrom=src/EnforcerListPage.tsx --coverageReporters=text-summary --coverageReporters=json-summary`
  - 结果：通过，1 suite passed，5 tests passed。
  - 覆盖率统计对象：`src/EnforcerListPage.tsx`。
  - Statements: 100% (52/52)
  - Branches: 90.47% (19/21)
  - Functions: 100% (21/21)
  - Lines: 100% (49/49)
  - 备注：`web-admin/coverage-enforcer-list` 已删除。
- `cd web-admin; yarn build`
  - 结果：通过。
  - 备注：保留既有 `fs.F_OK` deprecation、Browserslist outdated 和 bundle size warning；`web-admin/build` 由构建生成并被项目忽略。

### 剩余风险

- 未执行浏览器手工流或真实后端/真实数据库连接测试；本 change 未改后端、认证、权限模型、API endpoint 或真实数据写入语义，验证证据为源码级、单测 coverage 和 build/import 边界。
- `EnforcerEditPage.js` 与 `table/PolicyTable.js` 仍为 JS，需作为后续高风险 change 共同设计和迁移。
- 角色/权限、Casbin 适配器等已有 release candidate 尚未合入 `hfl-test-base`，合入顺序需主控统一审计。
