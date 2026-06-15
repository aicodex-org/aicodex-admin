## 验证记录

### 实施前门禁

- `git fetch origin --prune`：已执行。
- `git pull --ff-only origin hfl-test-base`：已执行，工作区从最新 `origin/hfl-test-base` 创建本 change 分支。
- `git status --short --branch`：启动时为 clean，后续仅包含本 change 文件。
- 仓库规则：未发现仓库根 `AGENTS.md` 或 `openspec/AGENTS.md`。
- `openspec validate implement-admin-organization-directory-remediation-preflight-console --strict`：通过。
- `openspec validate --changes --strict`：通过，4 个 active changes 全部通过。
- `git diff --check`：通过。

### 后端验证

- `cd admin && go test ./object -run "TestOrganizationDirectoryRemediationPreflight" -count=1 -timeout 60s -coverprofile ..\coverage-object-preflight.out`：通过。
- `cd admin && go test ./controllers -run "TestNewOrganizationDirectoryRemediationPreflight" -count=1 -timeout 60s -coverprofile ..\coverage-controllers-preflight.out`：通过。
- `cd admin && go test ./routers -run "TestGetOrganizationDirectoryRemediationPreflight" -count=1 -timeout 60s -coverprofile ..\coverage-routers-preflight.out`：通过。
- `cd admin && go tool cover -func ..\coverage-object-preflight.out`：新增 `organization_directory_remediation_preflight.go` 内所有函数覆盖率为 100.0%；`object` 包级覆盖率为 1.8%，受大包中未运行测试稀释。
- `cd admin && go tool cover -func ..\coverage-controllers-preflight.out`：新增 query helper `newOrganizationDirectoryRemediationPreflightQuery` 覆盖率为 100.0%；`controllers` 包级覆盖率为 0.0%，受大包中未运行测试稀释。
- `cd admin && go tool cover -func ..\coverage-routers-preflight.out`：覆盖 `getModuleOrganizationObject` 中新增 organization-scoped path 分支；`routers` 包级覆盖率为 0.6%，受大包中未运行测试稀释。

### 前端验证

- `cd web-admin && CI=true npx craco test --runTestsByPath src/backend/PlatformApiMappingBackend.test.js src/Setting.test.js src/OrganizationDirectoryQualityPage.test.js --watchAll=false --runInBand --silent`：通过。
- `cd web-admin && CI=true npx craco test --runTestsByPath src/backend/PlatformApiMappingBackend.test.js src/Setting.test.js src/OrganizationDirectoryQualityPage.test.js --watchAll=false --runInBand --silent --coverage --collectCoverageFrom=src/backend/PlatformApiMappingBackend.js --collectCoverageFrom=src/Setting.js --collectCoverageFrom=src/OrganizationDirectoryQualityPage.js`：通过；`OrganizationDirectoryQualityPage.js` 语句覆盖率 87.95%，`PlatformApiMappingBackend.js` 语句覆盖率 98.85%，`Setting.js` 整体语句覆盖率 10.87% 但本 change 新增 allowlist path 由 `Setting.test.js` 明确断言覆盖。
- `cd web-admin && npm run build`：通过；构建输出包含既有 bundle size warning。

### 覆盖分支

- ready manual-review preflight、`autoExecutionAllowed=false`、`executionMode=manual_review_only`。
- missing draft、空 organization、`qualityStatus=ready` 空态、非法参数、store error fail-closed。
- `blockedReasons`：`draft_not_found`、`no_affected_subjects`、`missing_sanitized_samples`、`missing_preconditions`、`draft_blocked`。
- 脱敏样例与导出：仅稳定 hash、display-safe label、source/status/reason/version 摘要；测试断言不导出真实人员明细。
- 前端 Drawer：从 action draft 进入 preflight、展示 readiness/safety/next steps/sample digests、导出预检 JSON，未提供“执行修复”入口。

### 剩余风险

- P0 仍为只读 preflight console，不执行真实修复；未来若新增执行能力，需要单独 change 设计审批、审计、幂等和回滚边界。
- `Setting.js` 是大型共享配置文件，文件级覆盖率低；本 change 只新增一个 API path allowlist，并由 focused test 覆盖该新增行为。
