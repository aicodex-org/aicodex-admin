## 验证摘要

本 change 在本地开发工作区完成，只使用合成组织、合成 hash 和脱敏样例。未连接真实 API/Gateway/Insight 数据库，未执行真实 remediation，未写组织主数据，未触发 projection publish。

## OpenSpec 与空白检查

- `openspec validate implement-admin-organization-directory-remediation-execution-approval-preview --strict`: 通过，change valid。
- `openspec validate --changes --strict`: 通过，4 个 active changes 0 failed。
- `git diff --check`: 通过，无空白错误。

## 后端验证

- `go test ./object -run 'TestOrganizationDirectoryRemediationApprovalPreview'`: RED 阶段失败于缺失 `OrganizationDirectoryRemediationApprovalPreviewService`、query、risk 常量和 helper；实现后通过。
- `go test ./object -run 'TestOrganizationDirectoryRemediationApprovalPreview|TestOrganizationDirectoryRemediationPreflight|TestOrganizationDirectoryRemediationActionDraft' -coverprofile ..\output\approval-preview-object.cover`: 通过。
- `go tool cover -func ..\output\approval-preview-object.cover`: 受影响新增文件 `organization_directory_remediation_approval_preview.go` 的 changed functions 覆盖率为 88.9%-100%，其中主要 service、normalize、preview builder、risk、required approvals、export 均为 100%，达到 85% 门槛。
- `go test ./controllers -run 'TestNewOrganizationDirectoryRemediation(Preflight|ApprovalPreview)QueryParsesOperatorFilters' -cover`: 通过。
- `go test ./routers -run 'TestGetOrganizationDirectoryRemediation(Preflight|ApprovalPreview)ObjectUsesOrganizationQuery' -cover`: 通过。

补充说明：曾运行 `go test ./object ./controllers ./routers -cover`，该广包命令失败在仓库既有本地环境依赖和非本 change 测试：
- `object.TestDumpToFile` 尝试连接本地 MySQL `localhost:3306` 被拒绝。
- `object.TestAICodexDesktopApplicationDiscoveryContract` 既有断言失败。
本 change 已用对象、controller、router 聚焦测试覆盖新增路径。

## 前端验证

- `yarn test src/backend/PlatformApiMappingBackend.test.js src/Setting.test.js src/OrganizationDirectoryQualityPage.test.js --runInBand --watchAll=false`: 通过，3 个 suites / 19 个 tests passed。页面测试会输出仓库现有 React 18 `ReactDOM.render` warning，未导致失败。
- `yarn build`: 通过，生成 `web-admin/build`，构建产物未被 Git 跟踪。输出包含既有 bundle size、Browserslist 和 Node `fs.F_OK` deprecation warning。

## 覆盖分支

- ready-for-approval：对象层和页面层均验证 `readyForApproval=true`、`riskLevel=medium`、required approvals、operator checklist 和 sample stable hashes。
- blocked / missing draft / missing preflight sample：对象层验证 `draft_not_found`、`missing_preflight_samples`、`riskLevel=blocked`；页面层验证 blocked approval preview 展示且没有执行入口。
- invalid filters / internal error：对象层验证 unsupported action/entity/status/limit/topN 和 store error fail-closed；controller/router 验证 query parser 与 organization-scoped authz。
- export redaction：对象层和页面层验证 export/copy JSON 只含 stable hash、manual_review_only、状态和安全摘要，不包含真实人员明细或原始 source id。

## 剩余风险

- Approval preview 是派生只读对象，`approvalPreviewId/hash` 未持久化，不能作为真实审批流长期记录主键。
- 前端测试存在既有 React 18 render warning；本 change 未处理测试基础设施升级。
