## 验证日期

- 2026-06-16

## 后端 focused tests

- 在 `admin/` 模块目录执行：`go test ./object -run 'Test(OrganizationDirectoryRemediationOperatorNoteReadonlyAuditSearch|GetOrganizationDirectoryRemediationOperatorNoteReadonlyAuditSearch)' -count=1 -timeout=120s -vet=off -coverprofile ..\coverage-object-readonly-audit-search.out -covermode=count -v`
  - 结果：通过。
  - 覆盖行为：有结果、scoped empty、blocked/readiness-only、cannotInfer、历史检索需要 persistent store、脱敏 export、invalid filters、默认导出入口 historical boundary、blocked fallback、readiness/checklist/searchId mismatch fail-closed。
  - 非阻断 warning：`init global config instance failed ... open conf/app.conf`，本次 focused object tests 未依赖该配置。
- 在 `admin/` 模块目录执行：`go test ./controllers -run 'Test(NewOrganizationDirectoryRemediationOperatorNoteReadonlyAuditSearchQueryParsesOperatorFilters|GetOrganizationDirectoryRemediationOperatorNoteReadonlyAuditSearchHandler)' -count=1 -timeout=120s -vet=off -coverprofile ..\coverage-controllers-readonly-audit-search.out -covermode=count -v`
  - 结果：通过。
  - 覆盖行为：controller query parser 接收 note/readiness/packet/preview/draft/remediationRun/action/risk/status/checklist/reason/history/limit/topN 等安全筛选；handler 返回只读 historical boundary；invalid historyMode 走 operator-readable error。
  - 非阻断 warning：同上 `conf/app.conf`。
- 在 `admin/` 模块目录执行：`go test ./routers -run 'Test(Get.*Object|ResolveModuleOrganization|GetModuleOrganizationObject)' -count=1 -timeout=120s -vet=off -coverprofile ..\coverage-routers-readonly-audit-search.out -covermode=count -v`
  - 结果：通过，22 个 authz/object-scope 相关测试通过。
  - 覆盖行为：新增 API 走 organization query object scope，同时复跑同类 organization-scoped API 路径，保持 fail-closed 范围解析一致。
  - 非阻断 warning：同上 `conf/app.conf`。

## 后端 coverage

- object package focused coverage：`coverage: 3.5% of statements`，未达到 85% package 级目标；新增实现文件 changed-file statements coverage 为 98.31% (116/118)。
- controllers package focused coverage：`coverage: 0.2% of statements`，未达到 85% package 级目标。
- routers package focused coverage：`coverage: 2.2% of statements`，未达到 85% package 级目标。
- `go tool cover -func ..\coverage-object-readonly-audit-search.out | rg "OperatorNoteReadonlyAuditSearch|total:"`
  - `GetOrganizationDirectoryRemediationOperatorNoteReadonlyAuditSearch`: 100.0%
  - `normalizeOrganizationDirectoryRemediationOperatorNoteReadonlyAuditSearchQuery`: 100.0%
  - `newOrganizationDirectoryRemediationOperatorNoteReadonlyAuditSearchFilters`: 100.0%
  - `newOrganizationDirectoryRemediationOperatorNoteReadonlyAuditSearchItem`: 95.7%
  - `organizationDirectoryRemediationOperatorNoteReadonlyAuditSearchItemMatches`: 100.0%
  - `organizationDirectoryRemediationOperatorNoteReadonlyAuditSearchRequiresPersistence`: 100.0%
  - `organizationDirectoryRemediationOperatorNoteReadonlyAuditSearchCannotInfer`: 100.0%
  - `organizationDirectoryRemediationOperatorNoteReadonlyAuditSearchRedactedFields`: 100.0%
  - `organizationDirectoryRemediationOperatorNoteReadonlyAuditSearchMarkdown`: 100.0%
  - `organizationDirectoryRemediationOperatorNoteReadonlyAuditSearchReadinessStatusSupported`: 100.0%
  - `organizationDirectoryRemediationOperatorNoteReadonlyAuditSearchHistoryModeSupported`: 100.0%
  - `organizationDirectoryRemediationOperatorNoteReadonlyAuditSearchId`: 100.0%
  - `newOrganizationDirectoryRemediationOperatorNoteReadonlyAuditSearchExport`: 100.0%
  - `newOrganizationDirectoryRemediationOperatorNoteReadonlyAuditSearchItemExport`: 100.0%
- `go tool cover -func ..\coverage-controllers-readonly-audit-search.out | rg "OrganizationDirectoryRemediationOperatorNoteReadonlyAuditSearch|total:"`
  - `GetOrganizationDirectoryRemediationOperatorNoteReadonlyAuditSearch`: 100.0%
  - `newOrganizationDirectoryRemediationOperatorNoteReadonlyAuditSearchQuery`: 100.0%
- `go tool cover -func ..\coverage-routers-readonly-audit-search.out | rg "getModuleOrganizationObject|resolveModuleOrganizationQuery|total:"`
  - `getModuleOrganizationObject`: 89.5%
  - `resolveModuleOrganizationQuery`: 71.4%
- 覆盖率结论：object 新增实现文件 changed-file coverage 已达到 85% 目标，controller 新增 handler/query parser 函数级 coverage 已达到 100%，router 新增 path 所在 `getModuleOrganizationObject` helper coverage 已达到 89.5%；routers package 级覆盖率仍受大 package 基数影响未达到 85%。已用 authz object scope 和 focused behavior tests 覆盖本 change 关键边界，未通过低价值 mock 或全仓平均覆盖率掩盖该缺口。

## 前端 focused tests

- `CI=true npm test -- --runInBand --runTestsByPath src/backend/PlatformApiMappingBackend.test.js -t "readonly audit search"`
  - 结果：通过，1 passed / 7 skipped。
  - 覆盖行为：API wrapper 只发送安全 query 参数。
- `CI=true npm test -- --runInBand --runTestsByPath src/OrganizationDirectoryQualityPage.test.js -t "readonly audit search|approval packet audit"`
  - 结果：通过，5 passed / 15 skipped。
  - 覆盖行为：打开“备注审计检索”、筛选参数、blocked/readiness-only、cannotInfer、脱敏 JSON/Markdown 复制导出、空态、错误态、无保存/执行按钮。
  - 非阻断 warning：React 18 下既有 `ReactDOM.render is no longer supported` warning，来源为当前测试库渲染方式，本 change 未修改测试渲染基础设施。
- `CI=true npm test -- --coverage --watchAll=false --runInBand --runTestsByPath src/backend/PlatformApiMappingBackend.test.js src/OrganizationDirectoryQualityPage.test.js src/Setting.test.js --testTimeout=60000 --collectCoverageFrom=src/backend/PlatformApiMappingBackend.js --collectCoverageFrom=src/OrganizationDirectoryQualityPage.js --collectCoverageFrom=src/Setting.js --coverageReporters=json-summary --coverageReporters=text-summary`
  - 结果：通过，33 passed / 0 skipped。
  - 覆盖行为：完整相关前端测试文件、只读检索成功/空态/错误态/复制失败态、API wrapper、`Setting.getApiPaths()` allowlist。

## 前端 coverage 与 build

- `CI=true npm test -- --coverage --watchAll=false --runInBand --runTestsByPath src/backend/PlatformApiMappingBackend.test.js src/OrganizationDirectoryQualityPage.test.js src/Setting.test.js --testTimeout=60000 --collectCoverageFrom=src/backend/PlatformApiMappingBackend.js --collectCoverageFrom=src/OrganizationDirectoryQualityPage.js --collectCoverageFrom=src/Setting.js --coverageReporters=json-summary --coverageReporters=text-summary`
  - 结果：通过，33 passed / 0 skipped。
  - total coverage：statements 54.49% (939/1723)，branches 39.13% (639/1633)，functions 44.82% (169/377)，lines 55.41% (932/1682)，未达到 85%。
  - `src/OrganizationDirectoryQualityPage.js`：statements 85.38%，branches 69.81%，functions 85.95%，lines 85.34%。
  - `src/backend/PlatformApiMappingBackend.js`：statements 98.37%，branches 49.04%，functions 100%，lines 98.37%。
  - `src/Setting.js`：statements 10.87%，branches 6.01%，functions 3.53%，lines 11.34%。
  - `src/Setting.js` touched function：`getApiPaths` covered，hits=1。
  - 覆盖率结论：本 change 主要前端实现文件 `OrganizationDirectoryQualityPage.js` 与 API wrapper `PlatformApiMappingBackend.js` 的 statements/lines/functions 已达到 85%；`Setting.js` 是大范围既有全局配置文件，本 change 只新增一个 API path allowlist 项，已通过 `Setting.test.js` 的 `getApiPaths()` 断言直接覆盖，但整文件统计未达到 85%。
- `CI=true npm run build`
  - 结果：通过，`Compiled successfully`。
  - 非阻断 warning：bundle size 提示、`fs.F_OK` deprecation、Browserslist `caniuse-lite` outdated，均为既有构建链 warning。

## OpenSpec 与 diff 检查

- `openspec validate implement-admin-organization-directory-remediation-operator-note-readonly-audit-search --strict`
  - 结果：通过，`Change 'implement-admin-organization-directory-remediation-operator-note-readonly-audit-search' is valid`。
- `openspec validate --changes --strict`
  - 结果：通过，5 active changes passed。
- `openspec validate --specs --strict`
  - 结果：通过，18 specs passed。
- `git diff --check`
  - 结果：通过，无 whitespace error 输出。

## 剩余风险

- 本 change 不新增 persistent operator notes store/schema/retention/audit write path；历史检索只能暴露当前可派生范围，并通过 `persistenceRequiredForHistoricalSearch=true` 与 `cannotInfer` fail-closed。
- Go routers package coverage 与前端 `Setting.js` 整文件 coverage 未达到 85%。当前验证以新增 object 文件 changed-file coverage、controller 新增函数级 coverage、router touched helper coverage、前端主要实现文件 coverage、focused 行为测试、allowlist 断言、build 和 OpenSpec 校验作为补充证据；归档前 review 需要确认是否接受共享大文件/大 package 覆盖率缺口。
