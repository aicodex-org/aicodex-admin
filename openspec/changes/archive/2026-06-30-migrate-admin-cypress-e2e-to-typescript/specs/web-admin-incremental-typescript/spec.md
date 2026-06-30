## ADDED Requirements

### Requirement: Cypress E2E assets migrate conservatively to TypeScript
Admin 前端 SHALL 支持将 `web-admin/cypress` E2E specs、support 和 Cypress config 从 legacy JavaScript 渐进迁移为 TypeScript，并保持现有 E2E 配置、测试流程、选择器和运行时行为兼容。

#### Scenario: Cypress config and support files are migrated
- **WHEN** 本 change 迁移 Cypress 配置和 support 文件
- **THEN** `web-admin/cypress.config.js` SHALL become `web-admin/cypress.config.ts`
- **AND** `web-admin/cypress/support/e2e.js` 和 `web-admin/cypress/support/commands.js` SHALL become `.ts`
- **AND** Cypress custom commands such as `cy.login()` SHALL have local Cypress namespace typing for Cypress specs

#### Scenario: Cypress E2E specs are migrated without behavior changes
- **WHEN** 本 change 迁移 `web-admin/cypress/e2e/*.cy.js`
- **THEN** all migrated specs SHALL use `.cy.ts`
- **AND** migration SHALL preserve test names, selector usage, visited paths, assertions, fixture/account usage, Cypress `baseUrl`, retries, and historical filenames such as `orgnazition.cy.ts`
- **AND** migration SHALL NOT modify backend API contracts, application source under `web-admin/src`, public raw scripts, CRACO config, build scripts, or runtime authentication behavior

#### Scenario: Cypress TypeScript is validated separately from app typecheck
- **WHEN** Cypress assets are ready for closeout
- **THEN** a Cypress-specific TypeScript check SHALL cover `cypress.config.ts`, `cypress/support/**/*.ts`, and `cypress/e2e/**/*.cy.ts`
- **AND** the main `web-admin/tsconfig.json` SHALL remain scoped to `src` unless a documented blocker proves that an app-level config change is required
- **AND** OpenSpec strict validation, `git diff --check`, Cypress install/config verification, `yarn typecheck`, incremental TypeScript gate, and `yarn build` SHALL pass or have a documented blocker
