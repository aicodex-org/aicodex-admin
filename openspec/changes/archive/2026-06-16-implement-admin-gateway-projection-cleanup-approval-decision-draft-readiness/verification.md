# Verification

## 计划

- `openspec validate implement-admin-gateway-projection-cleanup-approval-decision-draft-readiness --strict`
- `openspec validate --changes --strict`
- `openspec validate --specs --strict`
- `git diff --check`
- staged 后 `git diff --cached --check`
- 后端聚焦测试：`go test -run 'GatewayProjectionCleanupApprovalDecisionDraft|GatewayProjectionCleanupApprovalPolicy|GatewayProjectionCleanupApprovalAudit|CleanupExecuteReadiness' -cover ./object`
- controller/router 聚焦测试：按新增 endpoint 所在包运行相关 `go test`
- 前端聚焦测试：`npm test -- --runTestsByPath src/backend/PlatformApiMappingBackend.test.js src/PlatformApiMappingPage.test.js`
- 前端 build：按项目既有脚本执行

## 结果

- `openspec validate implement-admin-gateway-projection-cleanup-approval-decision-draft-readiness --strict`：通过，change valid。
- `openspec validate --changes --strict`：通过，4 个 active changes 全部 passed。
- `openspec validate --specs --strict`：通过，18 个 specs 全部 passed。
- `git diff --check`：通过，无 whitespace error。
- `openspec archive implement-admin-gateway-projection-cleanup-approval-decision-draft-readiness --skip-specs -y`：通过，change 已归档到 `openspec/changes/archive/2026-06-16-implement-admin-gateway-projection-cleanup-approval-decision-draft-readiness/`；主规格已在实现中手动同步，因此 archive 使用 `--skip-specs` 避免重复追加。
- archive 后 `openspec validate --specs --strict`：通过，18 个 specs 全部 passed。
- archive 后 `openspec validate --changes --strict`：通过，3 个剩余 active changes 全部 passed。
- archive 后 `git diff --check`：通过，无 whitespace error。
- `go test -run 'GatewayProjectionCleanupApprovalDecisionDraft|GatewayProjectionCleanupApprovalPolicy|GatewayProjectionCleanupApprovalAudit|CleanupExecuteReadiness' -count=1 -timeout 90s -coverprofile <temp-cover> ./object`：通过。
- `go test -run 'TestGatewayProjectionCleanupApprovalDecisionDraftHandler|TestParseGatewayProjectionQueryCSVTrimsEmptyApprovalEvidence' -count=1 -timeout 90s -coverprofile <temp-cover> ./controllers`：通过。
- `go test ./routers`：通过。
- `CI=true npm test -- --runTestsByPath src/backend/PlatformApiMappingBackend.test.js src/PlatformApiMappingPage.test.js --runInBand --watchAll=false`：通过，2 个 test suites / 15 tests passed。输出存在项目既有 React 18 `ReactDOM.render` warning，未阻断本 change。
- `CI=true npm test -- --runTestsByPath src/backend/PlatformApiMappingBackend.test.js src/PlatformApiMappingPage.test.js --runInBand --watchAll=false --coverage --collectCoverageFrom=src/backend/PlatformApiMappingBackend.js --collectCoverageFrom=src/PlatformApiMappingPage.js`：通过。
- `npm run build`：通过。输出存在既有 bundle size warning、`fs.F_OK` deprecation warning 和 Browserslist outdated warning，未阻断本 change。

## 覆盖率

- 后端 `object` 受影响函数覆盖率：
  - `CleanupApprovalDecisionDraftReadiness`：94.4%。
  - `gatewayProjectionCleanupApprovalDecisionDraftState`、`gatewayProjectionCleanupApprovalDecisionSummary`、`gatewayProjectionCleanupApprovalDecisionBlockingReasons`、`buildGatewayProjectionCleanupDecisionManualReviewChecklist`、`buildGatewayProjectionCleanupDecisionCopySafeLabels`：100%。
  - package 总覆盖率为 2.2%，受历史大包稀释，不作为本次 changed-function 口径。
- 后端 `controllers` 新增 handler 覆盖率：
  - `GetGatewayProjectionPublishAttemptRetentionCleanupApprovalDecisionDraftReadiness`：100%。
  - package 总覆盖率为 0.3%，受历史大包稀释，不作为本次 changed-function 口径。
- 前端覆盖率：
  - `src/backend/PlatformApiMappingBackend.js`：98.3% statements，100% functions。
  - `src/PlatformApiMappingPage.js`：63.22% statements，59.81% functions，受历史大页和既有未覆盖分支稀释；本次新增 decision draft 面板加载、错误禁用、展示、复制/导出和脱敏说明由聚焦测试覆盖。

## 脱敏说明

本 change 不执行真实 60 写入、不访问生产或类生产环境、不记录 token/Cookie/私有 URL/真实账号/手机号/邮箱/完整组织树/完整 Gateway 响应。验证记录只保留命令、状态、脱敏字段和剩余风险。

## 剩余风险

- P0 只生成 Admin producer 侧只读 decision draft/readiness，不持久化真实 approval decision，不打开 cleanup gate，不执行 cleanup/delete/update。
- Gateway receipt hint 和 readiness hash 仅作为诊断线索，不代表 Gateway runtime authorization success。
- 前端页面文件仍是历史大页，changed behavior 已用聚焦测试覆盖；未在本 change 中拆分页面或处理 React 18 `ReactDOM.render` 既有警告。
