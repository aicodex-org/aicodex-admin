## 验证摘要

本 change 只修改 Admin 身份总览前端展示、局部样式、locale 和聚焦测试；未新增 API，未修改后端、认证、OAuth/OIDC、Gateway 或 DB 写链路。

## OpenSpec

- `openspec validate polish-admin-identity-overview-information-credibility --strict`：通过。
- `openspec validate --changes --strict`：通过，4 个 active changes 全部 valid。
- `openspec validate --specs --strict`：通过，28 个 specs 全部 valid。

## TDD 与单测覆盖率

- RED：先修改 `web-admin/src/IdentityConsoleOverview.test.js`，聚焦断言短副标题、同屏 `98%` 口径一致、repo tag 次级 `系统标识`、最近审计证据 CTA 去重复；首次运行 `yarn test IdentityConsoleOverview.test.js --watchAll=false --runInBand` 失败于旧长副标题仍存在，符合预期缺口。
- GREEN：实现后重跑 `yarn test IdentityConsoleOverview.test.js --watchAll=false --runInBand`：通过，5/5 tests passed。
- 覆盖率：`yarn test IdentityConsoleOverview.test.js --coverage --watchAll=false --runInBand --collectCoverageFrom=src/IdentityConsoleOverview.js`：通过；`IdentityConsoleOverview.js` statements 93.05%，branches 86.81%，functions 94.73%，lines 93.05%，达到 85% changed-file 覆盖目标。
- 备注：Jest 输出存在既有 React 18 `ReactDOM.render` deprecation warning，来自当前 `@testing-library/react` 版本和测试基线，不是本 change 新增行为。

## 前端构建与类型

- `cd web-admin; node scripts/check-incremental-typescript-gate.mjs --base origin/hfl-test-base`：通过。
- `cd web-admin; yarn typecheck`：通过。
- `cd web-admin; yarn build`：通过。输出包含既有 Browserslist 过期提示、`fs.F_OK` deprecation warning 和 bundle size 提示；构建最终 `Compiled successfully`。
- `git diff --check`：通过。

## 浏览器 smoke

使用 production build、本地临时静态 server 和 Playwright headless smoke，mock 只读 `/api/get-account`、`/api/get-dashboard`、`/api/get-application`、`/api/get-organization-names`，未调用真实后端或真实凭据。

- 桌面 `1440x900` `/`：console warning/error=0，pageerror=0，`document` 级横向溢出=false。
- 移动 `390x844` + mobile UA `/`：console warning/error=0，pageerror=0，`document` 级横向溢出=false。
- 两个视口均验证：`AICodex 身份基础设施总览` 可见；短副标题 `关注接入覆盖、归因、授权和审计信号。` 可见；旧长副标题不可见；`查看记录` 不再作为审计证据 CTA 重复出现；`核对审计记录`、`核对同步记录`、`核对网关证据` 可见；`98%` 出现 2 次，覆盖 summary 与用量洞察卡片一致口径。

## 剩余风险

- 本地浏览器 smoke 使用脱敏 mock 数据验证展示层，不证明真实环境 dashboard 数据、登录态或审计链路端到端可用。
- 全局 `Powered by` 仍属于应用壳层品牌标识，不在身份总览组件内；本 change 未修改全局 footer。
