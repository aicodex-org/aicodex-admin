## Why

Admin 前端主体和多个页面已经进入渐进 TypeScript 路线，但 `web-admin/cypress` 下的 E2E specs、support 和 Cypress config 仍是 legacy JavaScript。它们覆盖登录、应用、Provider、产品、权限、资源、会话、同步器等后台流程，继续保留 JS 会让 E2E 选择器、custom command 和配置边界缺少静态检查。

本 change 趁 Admin 暂无新功能，把 Cypress E2E 资产作为独立批次迁移到 TypeScript，避免与当前并行的 `src/auth`、`src/table` 和组织编辑页工作冲突。

## What Changes

- 将 `web-admin/cypress.config.js` 迁移为 `web-admin/cypress.config.ts`。
- 将 `web-admin/cypress/support/e2e.js`、`web-admin/cypress/support/commands.js` 迁移为 `.ts`，并为自定义 `cy.login()` 提供 Cypress 局部类型声明。
- 将 `web-admin/cypress/e2e/*.cy.js` 机械迁移为 `.cy.ts`，保留现有 spec 名称、测试标题、选择器、访问路径和断言。
- 新增 Cypress 专用 `web-admin/cypress/tsconfig.json`，只覆盖 Cypress config、support 和 specs，不扩大主 `web-admin/tsconfig.json` 的 `include: ["src"]`。

## Capabilities

### New Capabilities

### Modified Capabilities

- `web-admin-incremental-typescript`: 扩展 Admin 前端渐进 TypeScript 规则，覆盖 Cypress E2E config/support/spec 的独立 TS 迁移边界和验证要求。

## Impact

- Affected code: `web-admin/cypress.config.js`、`web-admin/cypress/support/*.js`、`web-admin/cypress/e2e/*.cy.js` 和新增 Cypress 专用 tsconfig。
- Validation: OpenSpec strict validation、`git diff --check`、Cypress TypeScript 静态检查、`npx cypress verify`、`yarn typecheck`、增量 TypeScript gate、`yarn build`。
- No runtime behavior impact: 不修改 Cypress baseUrl、retries、登录账号/fixture、选择器、真实 E2E 流程、后端 API 契约或主应用构建配置。
