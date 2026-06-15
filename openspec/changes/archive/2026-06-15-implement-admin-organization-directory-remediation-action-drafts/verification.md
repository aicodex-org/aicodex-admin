## 验证记录

## 已执行

- `openspec validate implement-admin-organization-directory-remediation-action-drafts --strict`：通过。
- `git diff --check`：实施前通过。
- `cd admin && go test ./object -run "TestOrganizationDirectoryRemediationActionDraft" -count=1 -v`：通过，覆盖草案生成、action/reason 过滤、ready/空 organization 空态、非法参数、store error 和脱敏样例。
- `cd admin && go test ./controllers -run "TestNewOrganizationDirectory" -count=1 -v`：通过，覆盖 action draft query 参数组装。
- `cd admin && go test ./routers -run "TestGetOrganizationDirectory|TestResolveModuleOrganization" -count=1 -v`：通过，覆盖 organization scoped authz 解析。
- `cd web-admin && craco test --runTestsByPath src/backend/PlatformApiMappingBackend.test.js src/Setting.test.js src/OrganizationDirectoryQualityPage.test.js --watchAll=false --runInBand --json --outputFile=craco-action-drafts-results.json`：通过，3 suites / 14 tests。
- `cd admin && go test ./object -run "TestOrganizationDirectoryRemediationActionDraft|TestSortOrganizationDirectoryRemediationActionDrafts" -count=1 -coverprofile=<temp-cover>`：通过；新增 `organization_directory_remediation_action_draft.go` 中各函数覆盖率均不低于 87.5%，核心 `GetActionDrafts` 为 95.8%，query normalize / preconditions / export/sample 为 100%。
- `cd admin && go test ./controllers -run "TestNewOrganizationDirectory" -count=1 -coverprofile=<temp-cover>`：通过；新增 query helper `newOrganizationDirectoryRemediationActionDraftQuery` 覆盖率 100%。
- `cd admin && go test ./routers -count=1 -coverprofile=<temp-cover>`：通过；共享 `getModuleOrganizationObject` 覆盖率 89.5%，新增 action draft path 分支已覆盖。
- `cd web-admin && craco test ... --coverage --collectCoverageFrom=src/OrganizationDirectoryQualityPage.js --collectCoverageFrom=src/backend/PlatformApiMappingBackend.js --collectCoverageFrom=src/Setting.js`：测试通过，14/14；覆盖工具输出文件级覆盖率，其中 `OrganizationDirectoryQualityPage.js` 行覆盖 129/148（87.16%），`PlatformApiMappingBackend.js` 行覆盖 135/136（99.26%），`Setting.js` 行覆盖 87/767（11.34%）。`Setting.js` 是全局大文件，本 change 只新增 allowlist path，已由 `Setting.test.js` 精确断言覆盖。
- `openspec validate --changes --strict`：通过，4 changes / 0 failed。
- `cd admin && go test ./object ./controllers ./routers`：controllers、routers 通过；object 包失败于既有环境依赖测试：
  - `TestAICodexDesktopApplicationDiscoveryContract` 断言 issuer 为 `https://auth.example.com`。
  - `TestDumpToFile` 连接本地 MySQL loopback 端口被拒绝。
  这两项不属于本 change 聚焦路径；本 change 新增 object/controller/router 聚焦测试均已单独通过。
- `cd web-admin && npm run build`：通过，CRACO production build 编译成功并执行 postbuild。
- `git diff --check`：通过。
- `openspec archive -y implement-admin-organization-directory-remediation-action-drafts`：通过；CLI 同步 `admin-organization-master-model` 主规格并归档到 `openspec/changes/archive/2026-06-15-implement-admin-organization-directory-remediation-action-drafts/`。执行时因 4.4/4.5 属于归档/git 收尾任务，CLI 提示 2 个 tasks 未完成并在 `--yes` 下继续。
- `openspec validate --specs --strict`：通过，15 specs / 0 failed。
- `openspec validate --changes --strict`：通过，3 active changes / 0 failed。

## 剩余风险

- 完整 `go test ./object` 仍依赖本地配置/数据库，当前开发机未提供对应 MySQL 服务；本 change 的新增 object 聚焦测试和覆盖率已通过。
- 前端 coverage 工具只能按文件输出，无法直接给出 changed-line 覆盖率；`Setting.js` 文件级覆盖率受既有全局大文件影响，新增 allowlist 行已有行为级测试覆盖。
