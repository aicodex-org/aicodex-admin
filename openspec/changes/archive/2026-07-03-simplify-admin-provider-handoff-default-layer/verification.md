## 验证记录

验证时间：2026-07-03

### 自动化验证

- `openspec validate simplify-admin-provider-handoff-default-layer --strict`：通过。
- `git diff --check`：通过。
- `web-admin`: `node scripts/check-incremental-typescript-gate.mjs --base origin/hfl-test-base`：通过。
- `web-admin`: `yarn test ApplicationUsageAccessPage.test.tsx --watchAll=false`：先按 TDD 观察到目标失败，再实现后通过，9/9 tests passed。
- `web-admin`: `yarn test ApplicationUsageAccessPage.test.tsx ApplicationAccessCenter.test.tsx ManagementPage.navigation.test.tsx --watchAll=false`：通过，29/29 tests passed。
- `web-admin`: `yarn test ApplicationUsageAccessPage.test.tsx --coverage --collectCoverageFrom=src/ApplicationAccessServiceCredentialGovernancePanel.tsx --collectCoverageFrom=src/ApplicationUsageAccessPage.tsx --runInBand --watchAll=false`：通过，9/9 tests passed；受影响文件 statements 89.03%、lines 89.18%。
- `web-admin`: `yarn typecheck`：通过。
- `web-admin`: `yarn build`：通过；输出包含既有 Browserslist outdated、Node `fs.F_OK` deprecation 和 bundle size 提示，无失败。

### 浏览器检查

- 使用本地静态 build + Playwright mock-auth smoke，不连接真实后台，只 mock `/api/get-account`、`/api/insight-admin-provider/handoff/status`、`/api/insight-admin-provider/handoff/config` 和其它非目标 `/api/*` 空响应。
- 1440x900 与 390x844 视口均渲染到 `Insight Admin Provider 交接`、交接状态、目标消费方、`copy-safe metadata`、`生成 Admin 交接包` 和单条 `缺少凭据引用` 阻断摘要。
- 默认层未出现 `交接能力`、wrapper route 或 owner alias；展开 `诊断详情` 后 `交接能力`、wrapper route 和 owner evidence 可见。
- 1440x900 默认层/展开详情：`scrollWidth=1440`、`viewportWidth=1440`，console error=0，page error=0。
- 390x844 默认层/展开详情：`scrollWidth=390`、`viewportWidth=390`，console error=0，page error=0。

### 覆盖率说明

本 change 修改前端 UI 呈现、测试、locale 和 OpenSpec，不修改后端契约。覆盖率统计对象为 `ApplicationAccessServiceCredentialGovernancePanel.tsx` 与 `ApplicationUsageAccessPage.tsx` 两个受影响前端文件；lines 89.18%，达到 85% 门槛。

### 剩余风险

- 浏览器 smoke 使用本地脱敏 mock 数据，只证明 Admin UI 默认层、诊断折叠、copy-safe 边界和响应式表现，不证明真实 60 登录态或 Insight runtime provider 可调用。
- 本 change 不实现 Admin secure handoff，不验证 API/Gateway/Insight runtime contract。
