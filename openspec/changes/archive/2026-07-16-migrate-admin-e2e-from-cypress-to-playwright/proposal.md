## Why

Admin 现有 19 个 Cypress spec / 22 个测试仍绑定 Cypress 12.15.0、`localhost:7001` 和已经漂移到 Vite `7002` 的 CI 启动边界；Cypress 15 + Bun 评估又已确认无法解除当前 lifecycle/依赖树阻断。现在需要在保持 Yarn、Vite、Jest、React、Web3 与生产业务行为不变的前提下，把 E2E 单一真值迁到 Playwright，并让 CI 真正执行完整浏览器回归。

## What Changes

- 引入显式 typed Playwright 配置、`playwright/` 测试目录、认证 fixture 与共享 helper，逐项等价迁移全部 19 个 Cypress spec / 22 个测试，不删除测试、不弱化关键断言、不增加 skip/only。
- 统一 Playwright `baseURL`、Vite `webServer`、本地 E2E 与 CI 到 `7002`；环境覆盖使用公开、可配置的本机地址，不写死私有环境。
- 使用一次性隔离数据库和仓库内置测试数据运行真实 E2E；认证只使用确定性 fixture 身份，禁止把真实账号、Cookie、token、私有 URL 或响应体写入代码、日志和工件。
- 在 GitHub Actions 安装 Chromium 并实际运行完整 Playwright E2E；失败时上传必要的 HTML report、trace 和 screenshot，工件只包含隔离 fixture 数据并设置有限保留期。
- 一次性删除 Cypress dependency、config、support、19 个 spec、Cypress 专用 TypeScript 配置与 `cypress-io/github-action`，并从 Yarn lock 中移除 Cypress/Bluebird 路径。
- 保持 Yarn 和 `yarn.lock` 为唯一 package manager 真值；不迁移 Bun，不升级 React、Router、Jest、Vite，不移除或重构 Web3，不修改 Admin Go runtime、Provider/Insight contract 或生产业务源码。

## Capabilities

### New Capabilities

- `web-admin-playwright-e2e`: 定义 Admin Playwright E2E 的 typed 配置、7002 运行边界、确定性 fixture、等价迁移、真实执行、失败工件和安全清理契约。

### Modified Capabilities

- `web-admin-test-baseline-and-ci-gates`: 将前端 CI 门禁扩展为安装 Chromium 并真实执行完整 Playwright E2E，失败时保留有限、脱敏的诊断工件。
- `web-admin-incremental-typescript`: 用 Playwright TypeScript 配置、fixtures/helpers/specs 的验证契约替代已完成的 Cypress TypeScript 资产契约，并移除 Cypress 专用类型边界。

## Impact

- 影响 `web-admin/package.json`、`web-admin/yarn.lock`、E2E 配置/测试/helpers、E2E 工件忽略规则、前端 CI 契约测试和 `.github/workflows/build.yml`。
- 删除 `web-admin/cypress.config.ts` 与 `web-admin/cypress/**`，新增 `web-admin/playwright.config.ts` 与 `web-admin/playwright/**`。
- CI 继续使用临时 MySQL service 和仓库内置初始化数据；本地验收使用临时 SQLite 数据库，测试完成后回收数据库、session、浏览器和报告产物。
- 不改变 Admin API schema、路由、权限、认证协议、生产账号或真实数据库内容；不触碰 `test` 分支。
