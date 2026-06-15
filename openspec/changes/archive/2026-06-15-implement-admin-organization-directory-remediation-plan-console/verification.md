## 验证记录

实施前：

- `openspec validate implement-admin-organization-directory-remediation-plan-console --strict`：通过。
- `git diff --check`：通过。

实现后（2026-06-15）：

- `openspec validate implement-admin-organization-directory-remediation-plan-console --strict`：通过。
- `openspec validate --changes --strict`：4 passed, 0 failed。
- `openspec validate --specs --strict`：15 passed, 0 failed。
- `git diff --check`：通过。
- `cd admin && go test ./object ./controllers ./routers -run 'TestOrganizationDirectory(RemediationPlan|Quality)|TestNewOrganizationDirectoryRemediationPlanQueryParsesOperatorFilters|TestGetOrganizationDirectoryRemediationPlanObjectUsesOrganizationQuery' -count=1`：通过。
- `cd admin && go test ./object -run 'TestOrganizationDirectoryRemediationPlan' -count=1 -coverprofile='../output/organization-directory-remediation-plan-object.cover.out' -coverpkg=./object`：通过。
  - `organization_directory_remediation_plan.go` 主要函数覆盖：`GetPlan` 96.2%，query normalize 92.0%，action alias 100.0%，priority 100.0%，operator text 90.0%，export summary 100.0%。
  - `go tool cover` 的 total 1.9% 是整个 `object` 大包口径，不代表本 change 文件覆盖率。
- `cd web-admin && yarn test --runInBand --watchAll=false src/backend/PlatformApiMappingBackend.test.js src/OrganizationDirectoryQualityPage.test.js src/Setting.test.js`：3 suites / 10 tests passed。
  - 记录到既有 React 18 `ReactDOM.render` 测试 warning，未阻断。
- `cd web-admin && yarn build`：通过。
  - 记录到既有 `fs.F_OK` deprecation warning 和 CRA bundle size warning，未阻断。
- `openspec archive implement-admin-organization-directory-remediation-plan-console --yes`：通过，主规格 `admin-organization-master-model` 已同步 2 个新增 requirement。
- `openspec validate --specs --strict`：归档后通过。

边界核对：

- 只新增 Admin 只读 remediation plan 聚合与前端展示/导出。
- 未执行真实修复，未写 Gateway facts，未触发 projection publish，未读取 API/Gateway/Insight 内部库。
- 导出基于 API 返回的 `exportSummary`，样例使用 hash/sanitized id，不包含 token、Cookie、私有 URL、真实 source payload 或完整组织树。
