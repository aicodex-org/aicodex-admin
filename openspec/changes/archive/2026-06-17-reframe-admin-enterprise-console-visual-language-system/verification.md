# 验证记录

本文件随实现推进更新。不得记录真实密钥、token、Cookie、client secret、私有 URL 细节、完整连接串或敏感测试数据。

## 计划

- `openspec validate "reframe-admin-enterprise-console-visual-language-system" --strict`
- `openspec validate --changes --strict`
- `openspec validate --specs --strict`
- `git diff --check`
- `git diff --cached --check`
- `cd web-admin; yarn typecheck`
- 聚焦 Jest/coverage 覆盖本轮触碰组件
- `cd web-admin; yarn build`
- 浏览器复验桌面 `1440x900` 和移动 UA，记录 `/providers`、`/applications`、`/sessions`、`/records`、`/tokens`、`/verifications`、`/agents` 的 list/table top

## 结果

- 基线漂移处理：用户补充时 `origin/hfl-test-base` 先后前进到 `418db968...`、`3538d4ce...`，收尾时又前进到 `9fa73758...`、`c0f9938c...` 和 `dd641916d7e899c2f7ee8363a2c3c4c6dfe18fd6`。final 前重新 `git fetch origin hfl-test-base` 并 rebase，当前 change 已安全 replay/rebase 到 `dd641916...`，`origin/hfl-test-base..HEAD` 保持 1 个逻辑 commit。
- `openspec validate "reframe-admin-enterprise-console-visual-language-system" --strict`：通过，输出 `Change 'reframe-admin-enterprise-console-visual-language-system' is valid`。
- `git diff --check`：通过。文档更新和归档后会再次运行。
- `cd web-admin; node scripts/check-incremental-typescript-gate.mjs --base origin/hfl-test-base`：通过。
- `cd web-admin; yarn typecheck`：通过，最新基线 rebase 后最近一次 `Done in 9.84s`。
- 聚焦 Jest/coverage：通过。命令：
  `yarn test --watchAll=false --runInBand --roots src --testMatch "**/AuthSourceCenter.test.js" --testMatch "**/ApplicationAccessCenter.test.js" --testMatch "**/AuditOperationsCenter.test.tsx" --testMatch "**/LlmAiGatewayCenter.test.tsx" --testMatch "**/TourConfig.test.js" --collectCoverageFrom=src/AuthSourceCenter.js --collectCoverageFrom=src/ApplicationAccessCenter.js --collectCoverageFrom=src/AuditOperationsCenter.tsx --collectCoverageFrom=src/LlmAiGatewayCenter.tsx --collectCoverageFrom=src/TourConfig.js --coverage`
  结果：5 个 test suites 通过，27 个 tests 通过。
- `cd web-admin; yarn build`：通过，输出 `Compiled successfully`，并将 `build-temp` 移动为 `build`。
- `openspec archive "reframe-admin-enterprise-console-visual-language-system" -y`：通过，CLI 同步 5 个主规格并归档为 `openspec/changes/archive/2026-06-17-reframe-admin-enterprise-console-visual-language-system/`；proposal 中 “more than 10 deltas” 为非阻塞 warning。
- 归档后 `openspec validate --specs --strict`：通过，23 个 specs passed。
- 归档后 `openspec validate --changes --strict`：通过，4 个 active changes passed。
- 归档后 `git diff --check`：通过。archive 同步初次产生 3 个主规格 EOF 空行 warning，已仅清理尾部空行并重新通过。
- 浏览器复验：使用本地静态 build + mock API 服务，不使用真实测试环境、不部署、不重启、不写库。桌面 `1440x900`：
  - `/providers` table top `575`
  - `/applications` table top `559`
  - `/sessions` table top `543`
  - `/records` table top `543`
  - `/tokens` table top `543`
  - `/verifications` table top `543`
  - `/agents` table top `638`
- 移动复验：新建 Playwright mobile context，viewport `390x844`，iPhone Safari UA：
  - `/providers` table top `894`
  - `/applications` table top `820`
  - `/sessions` table top `834`
  - `/records` table top `834`
  - `/tokens` table top `834`
  - `/verifications` table top `834`
  - `/agents` table top `796`
- 浏览器附加断言：上述桌面与移动目标页 `tourVisible=false`；本轮痕迹文案检测 `textHasTrace=false`；移动 context `scrollWidth=clientWidth=390`，未检测到页面级横向溢出。

## 单测覆盖率

- 覆盖率统计对象：`src/AuthSourceCenter.js`、`src/ApplicationAccessCenter.js`、`src/AuditOperationsCenter.tsx`、`src/LlmAiGatewayCenter.tsx`、`src/TourConfig.js`。
- 总计：Statements `100%`，Branches `94.05%`，Functions `100%`，Lines `100%`。
- 分文件：
  - `ApplicationAccessCenter.js`：Statements `100%`，Branches `94.23%`，Functions `100%`，Lines `100%`
  - `AuditOperationsCenter.tsx`：Statements `100%`，Branches `92.06%`，Functions `100%`，Lines `100%`
  - `AuthSourceCenter.js`：Statements `100%`，Branches `94.23%`，Functions `100%`，Lines `100%`
  - `LlmAiGatewayCenter.tsx`：Statements `100%`，Branches `100%`，Functions `100%`，Lines `100%`
  - `TourConfig.js`：Statements `100%`，Branches `86.66%`，Functions `100%`，Lines `100%`
- 结论：受影响实现文件聚焦覆盖率达到 85% 门槛。新增断言覆盖紧凑首屏结构、列表优先、审计运维运行态核对、LLM AI/Gateway 空态与边界、企业认证中心路由关闭旧 Tour、i18n 痕迹文案清理。

## 剩余风险

- 本轮浏览器复验使用本地静态 build + mock API，只验证前端布局、Tour 状态、响应式和文案层级；不声明真实认证链路、OAuth/OIDC 回调、Gateway projection、会话清理、令牌签发或生产/类生产运行态已端到端通过。
- `yarn build` 仍输出既有 bundle size、Browserslist caniuse-lite 过期和 Node `fs.F_OK` deprecation 警告；本 change 未触碰构建基础设施。
- `web-admin/src/basic/ShortcutsPage.test.js`、`web-admin/src/common/EnterpriseIdentityConsoleLayout.test.js` 仍是历史 TSX 测试后缀债务；本 change 未触碰对应 TSX 组件。`AuditOperationsCenter.test.js` 已随触碰迁移为 `.test.tsx`。
