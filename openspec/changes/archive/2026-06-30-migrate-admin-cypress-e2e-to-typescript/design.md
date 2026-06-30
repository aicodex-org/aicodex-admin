## Context

`web-admin` 主 `tsconfig.json` 当前只包含 `src`，这是为了让 Admin 应用源码的 TS/TSX 渐进迁移与历史 JS 共存。Cypress 文件位于 `web-admin/cypress` 和根 `cypress.config.js`，不应为了 E2E 类型化扩大主应用 typecheck 范围。

当前 Cypress support 中只有 `cy.login()` 自定义命令，E2E specs 多为 selector 和 URL 断言。迁移适合以机械 rename 和 Cypress 专用 tsconfig 为主，不引入新依赖，也不修改真实测试数据或流程。

## Goals / Non-Goals

**Goals:**

- 将 Cypress config、support 和所有 `.cy.js` specs 迁移到 TypeScript。
- 为 `cy.login()` 补充 Cypress namespace 局部声明，确保 `.cy.ts` specs 能通过静态检查。
- 保持 Cypress 配置、测试流程、选择器、路径、账号、fixture 和断言语义不变。
- 用 Cypress 专用静态检查覆盖 `cypress.config.ts`、support 和 specs。

**Non-Goals:**

- 不迁移或修改 `web-admin/src/auth/*`、`web-admin/src/table/*`、`OrganizationEditPage*`、`UserEditPage*`、Provider/Application/Syncer/backend/common widgets。
- 不修改 `web-admin/public/ProviderHintRedirect.js`、`web-admin/public/AuthCallbackHandler.js`，它们是 public raw scripts，本 change 不新增构建链路。
- 不修改 `web-admin/mv.js`、`web-admin/craco.config.js`、`package.json`、lockfile 或主 `web-admin/tsconfig.json`，除非验证证明 Cypress 无法独立 typecheck。
- 不运行完整 Cypress E2E 作为强制门禁；完整 E2E 依赖本地服务、后端和测试账号/fixture。

## Decisions

- **Cypress tsconfig 独立。** 新增 `web-admin/cypress/tsconfig.json` 并包含 `../cypress.config.ts`、`support/**/*.ts`、`e2e/**/*.cy.ts`，避免主 app `yarn typecheck` 被 E2E 文件耦合。
- **No behavior refactor.** `.cy.js` 到 `.cy.ts` 只做后缀和必要类型修正，不整理拼写、测试标题、选择器或 URL。`orgnazition.cy.*` 保持原名。
- **Custom command declaration stays local.** `cy.login()` 类型放在 Cypress support 边界内，避免把测试 command 类型扩散到应用源码。
- **Validation reflects evidence level.** 本 change 的验证重点是 TypeScript 静态检查、Cypress 安装/配置加载检查、主 app typecheck 和 build；未运行完整 E2E 时明确记录原因，不把静态验证写成端到端通过。

## Risks / Trade-offs

- Cypress specs 依赖真实本地 Admin 服务和测试账号，完整 E2E 不稳定且可能泄漏环境信息 → 默认不强制跑完整 E2E，只验证配置和静态类型。
- Cypress/Node 类型可能与主 app DOM/Jest 类型混用 → 使用 Cypress 专用 tsconfig 隔离 `types: ["cypress", "node"]`。
- 迁移批量文件较多 → 以 `git mv` 保留 rename 关系，避免无关格式化和行为改写。
