## 验证记录

验证前已同步基线：

- `origin/hfl-test-base`: `191f4ae9d825d2cc5d78f82ddbbc796a30253ee8`
- 工作分支：`hfl-test/add-admin-application-identity-source-bindings`
- 当前分支已重放到最新基线，恢复 WIP 时无冲突。

### OpenSpec

- `openspec validate add-admin-application-identity-source-bindings --strict`
  - 结果：通过
- `openspec validate --changes --strict`
  - 结果：通过，4 个 active changes 均有效
- `openspec validate --specs --strict`
  - 结果：通过，19 个 specs 均有效

### 后端

- `go test -vet=off ./object -run 'TestApplicationResolveProviderLoginOrganization|TestApplicationIsProviderVisibleForLoginHandlesMissingProvider' -count=1`
  - 工作目录：`admin`
  - 结果：通过
- `go test -vet=off ./controllers -run 'TestAuthorizeWecomProfileConsentLoginIntentUsesProviderTargetOrganization' -count=1`
  - 工作目录：`admin`
  - 结果：通过

聚焦覆盖率证据和限制：

- `go test -vet=off ./object -run 'TestApplicationResolveProviderLoginOrganization|TestApplicationIsProviderVisibleForLoginHandlesMissingProvider' -count=1 -coverprofile %TEMP%/aicodex-provider-item.cover.out`
  - `ResolveProviderLoginOrganization`: 93.8%
  - `ResolveProviderLoginOrganizationObject`: 90.0%
- `go test -vet=off ./controllers -run 'TestAuthorizeWecomProfileConsentLoginIntentUsesProviderTargetOrganization|TestResolveWecomProfileConsentLoginUserUsesResolvedOrganizationForExistingUser|TestResolveWecomProfileConsentLoginUserUsesResolvedOrganizationForLarkIdentifiers|TestResolveWecomProfileConsentLoginUserCreatesInResolvedOrganizationWhenNoExistingUser|TestResolveWecomProfileConsentLoginUserPropagatesLookupError|TestResolveWecomProfileConsentLoginUserPropagatesCreateError|TestResolveWecomProfileConsentLoginUserPropagatesProfileSaveError|TestCreateWecomProfileConsentLoginUserUsesResolvedOrganization|TestCreateWecomProfileConsentLoginUserRejectsDisabledSignup|TestCreateWecomProfileConsentLoginUserHandlesUsernameConflictAndDefaultGroup|TestCreateWecomProfileConsentLoginUserGeneratesFallbackUsernameInResolvedOrganization|TestCreateWecomProfileConsentLoginUserPropagatesStoreErrors' -count=1 -coverprofile %TEMP%/aicodex-wecom-profile-consent.cover.out`
  - `resolveWecomProfileConsentLoginUser`: 94.7%
  - `createWecomProfileConsentLoginUser`: 96.8%
  - `AuthorizeLoginIntent`: 27.9%
  - 说明：`AuthorizeLoginIntent` 是完整 OAuth callback 流程函数，后半段依赖真实 provider/idp token 交换。当前 change 触及的 Provider 目标组织解析块由 `TestAuthorizeWecomProfileConsentLoginIntentUsesProviderTargetOrganization` 覆盖；新增 seam 后，目标组织传递到用户查找、Lark 匹配、创建、profile 写入、store error 和 fail-closed 分支均有聚焦测试覆盖。

### 前端

- `yarn typecheck`
  - 工作目录：`web-admin`
  - 结果：通过
- `yarn test ApplicationIdentitySourceBindings.test.js ApplicationAccessCenter.test.js --watchAll=false --runTestsByPath src/ApplicationIdentitySourceBindings.test.js src/ApplicationAccessCenter.test.js --coverage --collectCoverageFrom=src/ApplicationIdentitySourceBindings.tsx --collectCoverageFrom=src/ApplicationAccessCenter.js --coverageReporters=text-summary`
  - 工作目录：`web-admin`
  - 结果：通过，11 个测试通过
  - 覆盖率：statements 97.41%，branches 86.23%，functions 98.18%，lines 97.32%
  - warning：当前 testing-library setup 仍触发既有 React 18 `ReactDOM.render` warning。
- `yarn build`
  - 工作目录：`web-admin`
  - 结果：通过
  - warning：既有 Browserslist 数据库提示、Node `fs.F_OK` deprecation warning、CRA bundle size warning。

### 卫生检查

- `node -e "JSON.parse(require('fs').readFileSync('web-admin/src/locales/zh/data.json','utf8')); JSON.parse(require('fs').readFileSync('web-admin/src/locales/en/data.json','utf8')); console.log('locale json ok')"`
  - 结果：通过
- `git diff --check`
  - 结果：通过
- `web-admin/build/`
  - 结果：由 `yarn build` 生成，当前为 git ignored。

### 进程残留

最初并行 Go coverage 命令超时并留下本任务启动的 `go`/shim 进程，已按开始时间和命令行识别并结束。随后改为串行运行 object/controller 聚焦 coverage，均已通过。

## 归档后验证

- `openspec archive add-admin-application-identity-source-bindings -y`
  - 结果：通过；同步 `admin-application-identity-source-bindings`、`admin-enterprise-identity-application-access-center`、`admin-login-entry-routing`、`feishu-provider-configuration` 后归档到 `openspec/changes/archive/2026-06-16-add-admin-application-identity-source-bindings/`。
  - 备注：首次归档因新增 requirement 被放在 `MODIFIED Requirements` 下而 fail-fast，未改文件；修正为 `ADDED Requirements` 后目标 validate 通过并归档成功。
- `openspec validate --changes --strict`
  - 结果：通过，3 个 active changes 均有效。
- `openspec validate --specs --strict`
  - 结果：通过，20 个 specs 均有效。
- `git diff --check`
  - 结果：通过；归档同步生成的 3 个 EOF 空行已删除。
- `node -e "JSON.parse(require('fs').readFileSync('web-admin/src/locales/zh/data.json','utf8')); JSON.parse(require('fs').readFileSync('web-admin/src/locales/en/data.json','utf8')); console.log('locale json ok')"`
  - 结果：通过。
- `go test -vet=off ./object -run 'TestApplicationResolveProviderLoginOrganization|TestApplicationIsProviderVisibleForLoginHandlesMissingProvider' -count=1 -coverprofile "$env:TEMP\\aicodex-provider-item.cover.out"`
  - 工作目录：`admin`
  - 结果：通过。
  - 覆盖率：`ResolveProviderLoginOrganization` 93.8%，`ResolveProviderLoginOrganizationObject` 90.0%。
- `go test -vet=off ./controllers -run 'TestAuthorizeWecomProfileConsentLoginIntentUsesProviderTargetOrganization|TestResolveWecomProfileConsentLoginUserUsesResolvedOrganizationForExistingUser|TestResolveWecomProfileConsentLoginUserUsesResolvedOrganizationForLarkIdentifiers|TestResolveWecomProfileConsentLoginUserCreatesInResolvedOrganizationWhenNoExistingUser|TestResolveWecomProfileConsentLoginUserPropagatesLookupError|TestResolveWecomProfileConsentLoginUserPropagatesCreateError|TestResolveWecomProfileConsentLoginUserPropagatesProfileSaveError|TestCreateWecomProfileConsentLoginUserUsesResolvedOrganization|TestCreateWecomProfileConsentLoginUserRejectsDisabledSignup|TestCreateWecomProfileConsentLoginUserHandlesUsernameConflictAndDefaultGroup|TestCreateWecomProfileConsentLoginUserGeneratesFallbackUsernameInResolvedOrganization|TestCreateWecomProfileConsentLoginUserPropagatesStoreErrors' -count=1 -coverprofile "$env:TEMP\\aicodex-wecom-profile-consent.cover.out"`
  - 工作目录：`admin`
  - 结果：通过。
  - 覆盖率：`AuthorizeLoginIntent` 27.9%，`resolveWecomProfileConsentLoginUser` 94.7%，`createWecomProfileConsentLoginUser` 96.8%。
- `yarn typecheck`
  - 工作目录：`web-admin`
  - 结果：通过。
- `yarn test ApplicationIdentitySourceBindings.test.js ApplicationAccessCenter.test.js --watchAll=false --runTestsByPath src/ApplicationIdentitySourceBindings.test.js src/ApplicationAccessCenter.test.js --coverage --collectCoverageFrom=src/ApplicationIdentitySourceBindings.tsx --collectCoverageFrom=src/ApplicationAccessCenter.js --coverageReporters=text-summary`
  - 工作目录：`web-admin`
  - 结果：通过，11 个测试通过。
  - 覆盖率：statements 97.41%，branches 86.23%，functions 98.18%，lines 97.32%。
  - warning：当前 testing-library setup 仍触发既有 React 18 `ReactDOM.render` warning。
- `yarn build`
  - 工作目录：`web-admin`
  - 结果：通过。
  - warning：既有 Browserslist 数据库提示、Node `fs.F_OK` deprecation warning、CRA bundle size warning。
- `Get-CimInstance Win32_Process | Where-Object { $_.Name -eq 'go.exe' }`
  - 结果：仍可见 `./internal/remotes` 与 `./service/insight` Go 测试进程，父进程分别来自旧 PowerShell.MCP coverage 会话和独立 `pwsh` 测试命令；它们不属于本 change 的 object/controller 聚焦验证，未在本任务中结束。
