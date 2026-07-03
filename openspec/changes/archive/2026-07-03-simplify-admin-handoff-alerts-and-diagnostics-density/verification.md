## 验证摘要

本 change 只修改 Admin 前端默认呈现层、诊断详情密度、locale 文案、OpenSpec 和相关测试；未修改后端接口、copy-safe package contract、API/Gateway/Insight contract 或凭据生命周期。

## 已运行命令

- `openspec validate simplify-admin-handoff-alerts-and-diagnostics-density --strict`：通过。
- `git diff --check`：通过。
- `cd web-admin; yarn test ApplicationUsageAccessPage.test.tsx --watchAll=false --runInBand`：通过，9 个测试通过。
- `cd web-admin; yarn test ApplicationUsageAccessPage.test.tsx ApplicationAccessCenter.test.tsx ManagementPage.navigation.test.tsx --watchAll=false --runInBand`：通过，29 个测试通过。
- `cd web-admin; yarn test ApplicationUsageAccessPage.test.tsx --coverage --collectCoverageFrom=src/ApplicationAccessServiceCredentialGovernancePanel.tsx --collectCoverageFrom=src/ApplicationUsageAccessPage.tsx --runInBand --watchAll=false`：通过；`ApplicationAccessServiceCredentialGovernancePanel.tsx` 行覆盖率 89.8%，`ApplicationUsageAccessPage.tsx` 行覆盖率 100%。
- `cd web-admin; node scripts/check-incremental-typescript-gate.mjs --base origin/hfl-test-base`：通过。
- `cd web-admin; yarn typecheck`：通过。
- `cd web-admin; $env:NODE_OPTIONS='--max_old_space_size=4096'; yarn build`：通过；仅有既有 Browserslist、deprecation 和 bundle-size 类 warning。

## 本地浏览器 smoke

使用本地 mock-auth 前端服务和 Playwright CLI 做脱敏 smoke，未记录真实账号、组织树、完整私有 URL、Cookie、Authorization 或 raw payload。

- 1440x900 默认态：页面级 `scrollWidth === clientWidth`，console error/warning 为空；未出现第二个 copy-safe 黄色告警，未出现醒目 P0 边界 Alert，未出现旧文案或绿色 `材料已齐`。
- 1440x900 展开诊断：页面级 `scrollWidth === clientWidth`，console error/warning 为空；`compactRows=2`、`capabilityChips=3`、`technicalRows=3`。
- 390x844 默认态：页面级 `scrollWidth === clientWidth`，console error/warning 为空；默认层只保留一处主阻断叙事，copy-safe 操作区为中性说明。
- 390x844 展开诊断：页面级 `scrollWidth === clientWidth`，console error/warning 为空；阻断项、可用能力、技术证据均可访问且未造成横向溢出。

## 剩余风险

- 浏览器 smoke 使用本地 mock-auth 验证前端呈现层，不声明真实 60 环境端到端验收完成。
- 本轮只收敛 UI 告警和诊断密度，不改变 Admin secure handoff、真实凭据绑定或 Insight Profile 导入 contract。
