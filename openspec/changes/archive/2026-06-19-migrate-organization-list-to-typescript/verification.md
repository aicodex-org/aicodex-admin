## Verification

- `openspec validate migrate-organization-list-to-typescript --strict`: passed。
- `openspec validate --changes --strict`: passed，5 changes passed。
- `openspec validate --specs --strict`: passed，26 specs passed。
- `git diff --check`: passed。
- `cd web-admin; node scripts/check-incremental-typescript-gate.mjs --base origin/hfl-test-base`: passed。
- `cd web-admin; yarn typecheck`: passed。
- `cd web-admin; node node_modules/jest/bin/jest.js --config <focused OrganizationListPage/OrganizationBackend config> --runInBand --coverage --coverageReporters=text`: passed，14 tests passed。
- Focused coverage:
  - `OrganizationListPage.tsx`: statements 100%，branches 84.21%，functions 100%，lines 100%。
  - `OrganizationBackend.ts`: statements 100%，branches 100%，functions 100%，lines 100%。
- `cd web-admin; yarn build`: passed。输出包含项目既有 bundle size、Browserslist outdated 和 `fs.F_OK` deprecation warning。
- Archive 后 `openspec validate --changes --strict`: passed，4 active changes passed。
- Archive 后 `openspec validate --specs --strict`: passed，26 specs passed。
- Archive 后 `git diff --check`: passed。

## Notes

- 验证前 `web-admin/node_modules` 不存在；`yarn install --frozen-lockfile` 在依赖写入后超时。该步骤没有产生 package 或 lockfile 改动，后续 `yarn typecheck`、聚焦 Jest 和 `yarn build` 已基于安装后的依赖通过。
- 聚焦 Jest 输出 React 18 `ReactDOM.render` warning，来源是项目当前 testing-library 栈；断言均通过，本迁移 change 不需要修改源码行为。
