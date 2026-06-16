## Verification

- `openspec validate implement-admin-organization-directory-remediation-approval-packet-operator-notes --strict`：通过。
- `openspec validate --changes --strict`：通过，4 个 active changes 全部有效。
- `openspec validate --specs --strict`：通过，18 个 specs 全部有效。
- `git diff --check`：通过。
- `go test -run 'TestOrganizationDirectoryRemediationApprovalPacketOperatorNotes' ./object`：通过，本机无 stdout。
- `go test -cover -run 'TestOrganizationDirectoryRemediationApprovalPacketOperatorNotes' ./object`：通过；`admin/object` 大包统计口径覆盖率为 2.7%。本 change 新增 object/service changed-function 分支由该测试覆盖；包级总覆盖率受历史大包代码拖累，不能代表本 change 覆盖质量。
- `go test -run 'TestNewOrganizationDirectoryRemediationApprovalPacketOperatorNotesQuery|TestGetOrganizationDirectoryRemediationApprovalPacketOperatorNotesObject|TestOrganizationDirectoryRemediationApprovalPacketOperatorNotes' ./controllers ./routers ./object`：通过，本机无 stdout。过程中曾出现一次 `admin/object` 大包 compile 阶段超过 120 秒无输出，已终止本任务的 `go test ...OperatorNotes...` 与其 `compile.exe` 子进程；该行为与本任务启动时记录的 Go 1.26.3 大包编译基线问题一致。
- `yarn test OrganizationDirectoryQualityPage.test.js --watchAll=false`：通过；输出包含既有 React 18 `ReactDOM.render` warning。
- `yarn test PlatformApiMappingBackend.test.js Setting.test.js --watchAll=false`：通过。
- `yarn test OrganizationDirectoryQualityPage.test.js PlatformApiMappingBackend.test.js Setting.test.js --watchAll=false --coverage --collectCoverageFrom=src/OrganizationDirectoryQualityPage.js --collectCoverageFrom=src/backend/PlatformApiMappingBackend.js --collectCoverageFrom=src/Setting.js`：通过；`OrganizationDirectoryQualityPage.js` 行覆盖 85.62%，`PlatformApiMappingBackend.js` 行覆盖 98.71%，`Setting.js` 为历史大文件 allowlist，文件级行覆盖 11.34%，本 change 仅新增 allowlist 字符串并由 `Setting.test.js` 断言覆盖。
- `yarn build`：通过；输出包含既有 bundle size warning，并生成本地 `web-admin/build`（未纳入 git diff）。

## Coverage Notes

- Object/service tests 覆盖 ready handoff draft、blank organization、ready filter、missing packet、blocked packet、cannotInfer、Markdown/JSON redaction、invalid filter fail-closed。
- Controller/router tests 覆盖 operator notes query parsing 与 organization-scoped authz path。
- Frontend tests 覆盖交接备注入口、error、empty、disabled copy/export、JSON/Markdown copy/export redaction、无执行/修复入口。
