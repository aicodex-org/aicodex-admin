## 验证记录

验证时间：2026-07-02

### 自动化验证

- `openspec validate align-admin-insight-provider-handoff-ui --strict`：通过。
- `git diff --check`：通过。
- `web-admin`: `node scripts/check-incremental-typescript-gate.mjs --base origin/hfl-test-base`：通过。
- `web-admin`: `yarn test ApplicationUsageAccessPage.test.tsx --runInBand --watchAll=false`：通过，9/9 tests passed。
- `web-admin`: `yarn test ManagementPage.navigation.test.tsx --runInBand --watchAll=false`：通过，8/8 tests passed。
- `web-admin`: `yarn test ApplicationUsageAccessPage.test.tsx --coverage --collectCoverageFrom=src/ApplicationAccessServiceCredentialGovernancePanel.tsx --collectCoverageFrom=src/ApplicationUsageAccessPage.tsx --runInBand --watchAll=false`：通过，9/9 tests passed；受影响文件 statements 88.97%、lines 89.2%。
- `web-admin`: `yarn typecheck`：通过。
- `web-admin`: `yarn build`：通过；构建输出包含既有 Browserslist outdated 和 bundle size 提示，无失败。
- `openspec archive align-admin-insight-provider-handoff-ui -y`：通过，归档到 `openspec/changes/archive/2026-07-02-align-admin-insight-provider-handoff-ui`，并同步主规格 `admin-enterprise-identity-usage-access-entry`。
- `openspec validate --changes --strict`：通过，3/3 active changes passed。
- `openspec validate --specs --strict`：通过，31/31 specs passed。

### 浏览器检查

- `web-admin`: 本地 dev server 使用 `PORT=7004 craco start` 启动成功，`webpack compiled successfully` 且 `No issues found`。
- 使用 `playwright-cli` 对 `http://localhost:7004/application-usage-access` 执行本地 mock-auth smoke：仅 mock `/api/get-account`、服务凭据治理 status/config 三个只读接口，mock 数据为脱敏假 owner/status/source，不含真实账号、token、URL 或 secret。
- 390px 与 1440px 视口均渲染到 `Insight Admin Provider Handoff`、`Owner evidence summary`、`copy-safe handoff actions`；console error=0；`document/body scrollWidth <= viewportWidth`，无横向溢出。
- 截图输出到 ignored 目录 `output/playwright/usage-access-mobile-390.png`、`output/playwright/usage-access-desktop-1440.png`。

### 覆盖率说明

本 change 修改前端 UI 文案、导航标签、locale、样式和 OpenSpec 文档，不新增后端实现。聚焦 Jest 覆盖入口文案、四块固定结构、copy-safe 交接边界、ready/异常态 owner evidence 默认可见、敏感材料不渲染和导航 i18n。覆盖率统计对象为 `ApplicationAccessServiceCredentialGovernancePanel.tsx` 与 `ApplicationUsageAccessPage.tsx` 两个受影响前端文件，statements 88.97%、lines 89.2%，达到 85% 门槛。

### 剩余风险

- 已做本地 mock-auth 浏览器 smoke；仍建议主控在统一 60 环境用真实登录态和真实后端数据复验。
- 本 change 不证明 Insight Provider Doctor 通过，也不证明 Admin runtime provider 可调用；只证明 Admin UI 和 copy-safe handoff 口径对齐 P0 边界。
