## 验证记录

### OpenSpec

- `openspec validate migrate-llm-ai-gateway-entry-config-to-typescript --strict`: 通过。
- `openspec validate --changes --strict`: 通过，5 个 active changes 全部通过。
- `openspec validate --specs --strict`: 通过，26 个主规格全部通过。
- 归档后复验：
  - `openspec validate --changes --strict`: 通过，4 个 active changes 全部通过。
  - `openspec validate --specs --strict`: 通过，26 个主规格全部通过。

### Git 与增量 TypeScript 门禁

- `git diff --check`: 通过。
- `git diff --check origin/hfl-test-base...HEAD`: 通过。
- `cd web-admin; node scripts/check-incremental-typescript-gate.mjs --base origin/hfl-test-base`: 通过。
- rebase 到最新 `origin/hfl-test-base` 并归档后复验：
  - `git diff --check`: 通过。
  - `git diff --check origin/hfl-test-base...HEAD`: 通过。
  - `cd web-admin; node scripts/check-incremental-typescript-gate.mjs --base origin/hfl-test-base`: 通过。

### 前端验证

- `cd web-admin; yarn typecheck`: 通过，`tsc --noEmit` 成功。
- `cd web-admin; yarn test --watchAll=false --runInBand --runTestsByPath src/EntryListPage.test.tsx src/EntryEditPage.test.tsx`: 通过，2 个 test suites / 21 个 tests。
- `cd web-admin; yarn test --watchAll=false --runInBand --coverage --collectCoverageFrom=src/EntryListPage.tsx --collectCoverageFrom=src/EntryEditPage.tsx --runTestsByPath src/EntryListPage.test.tsx src/EntryEditPage.test.tsx`: 通过。
- `cd web-admin; yarn build`: 通过；仅有既有 Browserslist 过期提示、bundle size 提示和 `fs.F_OK` deprecation warning。
- rebase 到最新 `origin/hfl-test-base` 并归档后复验：
  - `cd web-admin; yarn typecheck`: 通过，`tsc --noEmit` 成功。
  - `cd web-admin; yarn test --watchAll=false --runInBand --runTestsByPath src/EntryListPage.test.tsx src/EntryEditPage.test.tsx`: 通过，2 个 test suites / 21 个 tests。
  - `cd web-admin; yarn test --watchAll=false --runInBand --coverage --collectCoverageFrom=src/EntryListPage.tsx --collectCoverageFrom=src/EntryEditPage.tsx --runTestsByPath src/EntryListPage.test.tsx src/EntryEditPage.test.tsx`: 通过。
  - `cd web-admin; yarn build`: 通过；仅有既有 Browserslist 过期提示、bundle size 提示和 `fs.F_OK` deprecation warning。

### 覆盖率

- 统计对象：`web-admin/src/EntryListPage.tsx`、`web-admin/src/EntryEditPage.tsx`。
- All files: statements `100%`，branches `94.93%`，functions `100%`，lines `100%`。
- `EntryListPage.tsx`: statements `100%`，branches `95.65%`，functions `100%`，lines `100%`。
- `EntryEditPage.tsx`: statements `100%`，branches `94.64%`，functions `100%`，lines `100%`。

### 运行态口径与剩余风险

- 本 change 是前端 TSX 迁移，验证覆盖源码、类型检查、单测、覆盖率和生产构建层级。
- 未执行真实登录态浏览器流程或远端环境 smoke；本 change 未修改后端 API、认证、权限、Provider、Gateway projection 或真实配置链路。
- `EntryPage.js` 登录入口容器、MCP Server、MCP Store、站点范围、治理规则和规则表格组件不属于本 change。
