## 1. OpenSpec 和基线

- [x] 1.1 创建并校验 `migrate-admin-cypress-e2e-to-typescript` change artifacts
- [x] 1.2 确认工作分支基于最新 `origin/hfl-test-base`，且不触碰历史残留 active changes 和并行 worker 写集

## 2. Cypress TypeScript 迁移

- [x] 2.1 将 `web-admin/cypress.config.js` 迁移为 `cypress.config.ts`
- [x] 2.2 将 `web-admin/cypress/support/e2e.js` 和 `commands.js` 迁移为 `.ts`
- [x] 2.3 将 `web-admin/cypress/e2e/*.cy.js` 全部迁移为 `.cy.ts`，保持 `orgnazition` 等历史文件名不变
- [x] 2.4 为 `cy.login()` 等 Cypress custom command 补充局部类型声明
- [x] 2.5 新增 Cypress 专用 `web-admin/cypress/tsconfig.json`，不扩大主 `web-admin/tsconfig.json`

## 3. 行为边界

- [x] 3.1 保持 Cypress baseUrl、retries、测试账号、fixture、选择器、访问路径和断言语义不变
- [x] 3.2 确认未触碰 `src/auth`、`src/table`、组织/用户编辑页、Provider/Application/Syncer/backend/common widgets、public raw scripts、CRACO 或 `mv.js`

## 4. 验证

- [x] 4.1 运行 `openspec validate migrate-admin-cypress-e2e-to-typescript --strict`
- [x] 4.2 运行 `git diff --check`
- [x] 4.3 运行 Cypress TypeScript 静态检查，覆盖 config、support 和 `.cy.ts`
- [x] 4.4 运行 `npx cypress verify` 或记录本地环境无法 verify 的明确原因
- [x] 4.5 运行 `yarn typecheck`
- [x] 4.6 运行 `node scripts/check-incremental-typescript-gate.mjs --base origin/hfl-test-base`
- [x] 4.7 运行 `yarn build`

## 5. Self-closeout 说明

- 本节记录用户已授权的收尾动作，不作为实现 checklist 统计：同步主规格、archive OpenSpec、收敛 1 个逻辑 commit、普通非强制 push 到 `origin/hfl-test-base`、删除本地和远端工作分支，并且不触碰 `test`。
