# 验证记录

## RED / GREEN

- RED：`yarn test ApplicationUsageAccessPage.test.tsx ApplicationAccessCenter.test.tsx --runInBand --watchAll=false` 先失败，失败点为旧 loading/error/empty 文案仍显示 `服务凭据治理状态/配置`，以及前端 API client 仍调用旧 `/api/application-access/service-credential-governance-*` path。
- RED：`go test ./controllers -run "InsightAdminProviderHandoff|ApplicationAccessServiceCredentialGovernance"` 先失败，失败点为 `GetInsightAdminProviderHandoffStatus`、`GetInsightAdminProviderHandoffConfig`、`SaveInsightAdminProviderHandoffConfig`、`DiagnoseInsightAdminProviderHandoffConfig` handler 尚不存在。
- GREEN：补齐新 endpoint handler、旧 endpoint deprecated 拒绝、前端新 path 和新文案后，相关聚焦测试通过。

## OpenSpec

- `openspec validate remove-legacy-admin-usage-access-surfaces --strict`：通过。
- `git diff --check`：通过。

## 后端与 API

- `go test ./controllers -run "InsightAdminProviderHandoff|ApplicationAccessServiceCredentialGovernance" -timeout 60s`：通过。
- `go test ./routers -timeout 60s`：通过。
- 覆盖行为：
  - 新 `GET /api/insight-admin-provider/handoff/status` 返回 copy-safe 运行态状态 envelope。
  - 新 `GET/POST /api/insight-admin-provider/handoff/config` 复用既有 copy-safe 配置读写校验。
  - 新 `POST /api/insight-admin-provider/handoff/diagnostics` 复用既有脱敏诊断。
  - 旧 `/api/application-access/service-credential-governance-*` handler 返回稳定 deprecated error，并指向匹配的新 handoff endpoint。

## 前端

- `yarn test ApplicationUsageAccessPage.test.tsx ApplicationAccessCenter.test.tsx ManagementPage.navigation.test.tsx --runInBand --watchAll=false`：通过，3 个 test suites / 29 个 tests。
- 覆盖行为：
  - 用量接入页默认层保持 `Insight Admin Provider 交接`、`生成 Admin 交接包`、manual/secretRef binding 和 `技术细节` 折叠语义。
  - loading/error/empty 文案不再使用旧 `服务凭据治理状态/配置`。
  - 前端 API client 改用 `/api/insight-admin-provider/handoff/status|config|diagnostics`。
  - 应用接入中心不渲染旧治理入口，也不请求旧运行态状态。

## TypeScript 与 Build

- `node scripts/check-incremental-typescript-gate.mjs --base origin/hfl-test-base`（从 `web-admin` 目录运行）：通过。
- `yarn typecheck`：通过。
- `yarn build`：通过。构建输出包含既有 Browserslist 过期和 bundle size 提示，无编译错误。

## 覆盖率

- `go test ./controllers -run "InsightAdminProviderHandoff|ApplicationAccessServiceCredentialGovernance" -coverprofile ../tmp-remove-legacy-admin-usage-access-surfaces-controllers.cover -timeout 60s`：通过；`controllers` 大包总覆盖率为 2.8%，该数字受历史未触达 controller 文件影响，不作为本次小范围 handler 质量结论。
- `go tool cover -func ...`：本次新增/改动的 handoff handler、legacy deprecated handler 与 `respondLegacyServiceCredentialGovernanceEndpointDeprecated` 均为 100.0% 函数覆盖。
- `yarn test ApplicationUsageAccessPage.test.tsx ApplicationAccessCenter.test.tsx --coverage --collectCoverageFrom=src/backend/ApplicationAccessServiceCredentialGovernanceBackend.ts --collectCoverageFrom=src/ApplicationAccessServiceCredentialGovernancePanel.tsx --runInBand --watchAll=false`：通过。
  - `ApplicationAccessServiceCredentialGovernancePanel.tsx`：88.51% statements / 81.35% branches / 96.92% funcs / 88.65% lines。
  - `ApplicationAccessServiceCredentialGovernanceBackend.ts`：91.55% statements / 86.25% branches / 100% funcs / 90.44% lines。

## 未执行项与剩余风险

- 未做浏览器 smoke。原因：本次为 endpoint/path 文案和 handler cleanup，已由 Jest 覆盖默认层、技术细节折叠、复制动作和 API client path；没有新增布局结构或运行态登录链路。
- 旧 Go controller 文件仍保留内部 `ServiceCredentialGovernance*` 类型和 helper 名称，作为新 `Insight Admin Provider` handoff 的 copy-safe 状态/配置数据源实现细节；产品入口和外部 API surface 已收敛到新 handoff 语义。
