## Verification

- `openspec validate migrate-organization-user-list-to-typescript --strict`: passed。
- `openspec validate --changes --strict`: passed，5 changes passed。
- `openspec validate --specs --strict`: passed，26 specs passed。
- `git diff --check`: passed。
- `cd web-admin; node scripts/check-incremental-typescript-gate.mjs --base origin/hfl-test-base`: passed。
- `cd web-admin; yarn typecheck`: passed。
- `cd web-admin; node node_modules/jest/bin/jest.js --config <focused UserListPage config> --runInBand --coverage --coverageReporters=text`: passed，13 tests passed。
- Focused coverage:
  - `UserListPage.tsx`: statements 96.17%，branches 74.33%，functions 98.3%，lines 96.1%。
- `cd web-admin; yarn build`: passed。输出包含项目既有 bundle size、Browserslist outdated 和 `fs.F_OK` deprecation warning。
- Archive 后 `openspec validate --changes --strict`: passed，4 active changes passed。
- Archive 后 `openspec validate --specs --strict`: passed，26 specs passed。
- Archive 后 `git diff --check`: passed。

## Notes

- `UserBackend.js` 保持 legacy JS，本 change 只通过 `UserListPage.tsx` 的局部兼容类型约束本页实际调用的 backend 函数。
- 聚焦 Jest 输出 React 18 `ReactDOM.render` warning，来源是项目当前 testing-library 栈；断言均通过，本迁移 change 不需要修改源码行为。
