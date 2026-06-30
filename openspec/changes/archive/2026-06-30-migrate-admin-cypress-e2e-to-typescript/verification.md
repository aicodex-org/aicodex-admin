## 验证记录

本记录只描述本地源码、类型、Cypress 安装检查和构建层级验证；本 change 不修改后端 API、测试账号、fixture、选择器语义或真实登录流程，未运行完整 Cypress E2E。

## 命令结果

- `openspec validate migrate-admin-cypress-e2e-to-typescript --strict`: 通过。
- `git diff --check`: 通过。
- `npx tsc --noEmit --project cypress/tsconfig.json`: 通过，覆盖 `cypress.config.ts`、`cypress/support/**/*.ts` 和 `cypress/e2e/**/*.cy.ts`。
- `npx cypress verify`: 初次在默认本机环境失败，原因为 Cypress binary integrity check 期望的用户 cache 盘符与实际解析盘符不一致。按 Cypress 提示执行 `npx cypress install --force` 后，默认环境仍复现同一盘符映射问题；随后使用 `$env:CYPRESS_CACHE_FOLDER="<actual-cypress-cache-folder>"; npx cypress verify` 通过。
- `yarn typecheck`: 通过。
- `node scripts/check-incremental-typescript-gate.mjs --base origin/hfl-test-base`: 通过。
- `yarn build`: 初次失败于本地 CRA/ESLint stale cache 对已合入的 `src/auth` 文件误报 unused import；源码只读核验确认本 change 未触碰 `src/auth` 且报错 import 已不存在。清理 `web-admin/node_modules/.cache` 后重跑通过。仍有既有 `fs.F_OK` deprecation、Browserslist outdated 和 bundle size warning。

## 覆盖率

- N/A。本 change 迁移 Cypress E2E 测试资产和 Cypress config/support，不修改生产应用实现代码；使用 Cypress TypeScript 静态检查和 Cypress verify 作为本批次主要回归保护。

## 未运行完整 E2E

- 未运行完整 Cypress E2E，因为完整 E2E 依赖本地 Admin 服务、后端、测试账号和 fixture 状态。当前任务要求不修改 fixture/账号/baseUrl/测试流程，因此不把完整 E2E 作为强制门禁。
