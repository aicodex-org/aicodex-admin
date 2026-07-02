# 验证记录

## 结论

截至 2026-07-02，`add-dingtalk-organization-sync` 的规格校验、前端测试、前端类型检查、前端构建和后端聚焦测试均已通过；后端受影响实施文件的 changed-file 单测覆盖率为 2558/3009 = 85.0116%，已达到归档前 85% 门槛。

本记录中的自动化证据覆盖源码级、Mock API 契约、单元测试、类型检查和前端生产构建层级；尚未使用真实钉钉租户、真实企业内部应用凭据和通讯录读取 scope 做 provider/API contract smoke，因此不能声明真实钉钉端到端同步已通过。

## 已运行验证

- 仓库根目录：`openspec status --change add-dingtalk-organization-sync --json`
  - 结果：19/19 tasks complete。
- 仓库根目录：`openspec validate add-dingtalk-organization-sync --strict`
  - 结果：通过，输出 `Change 'add-dingtalk-organization-sync' is valid`。
- `admin` 目录：
  - `go test ./object -run 'TestOrganizationSyncProviderConfigValidationAndDefaultBranches|TestWecomOrganizationSyncConfigServicePropagatesErrorsAndConflicts'`
  - `go test ./object -covermode=count "-coverprofile=$env:TEMP\aicodex-dingtalk-object.cover" -run 'DingTalk|FeishuOrganizationSync|WecomOrganizationSync|OrganizationDirectorySourceStatus|OrganizationDirectorySourceGuard|OrganizationSyncProviderConfigValidation|OrganizationSyncSourceGuard|OrganizationSyncScheduler|OrganizationSyncSchedule|OrganizationSyncDefaultScheduleStore|OrganizationSyncProviderConfigDefaultWrappers|OrganizationSyncConfigService|ApplyOrganizationSyncDispatchResult|SafeOrganizationSyncErrorText'`
  - `go test ./routers -covermode=count "-coverprofile=$env:TEMP\aicodex-dingtalk-routers.cover" -run 'Test(Get|AuthzFilter|ApiFilter|InitAPI|ResolveModuleOrganizationQuery|IsOrganizationSyncApiKeyReadPath)'`
  - `go test ./controllers -covermode=count "-coverprofile=$env:TEMP\aicodex-dingtalk-controllers.cover" -run 'TestDingTalkOrganizationSyncHandlersRejectMalformedJson|TestDingTalkOrganizationSyncHandlersRejectMissingOrganizationBeforeStoreAccess|TestDingTalkOrganizationSyncHandlersRejectUnauthorizedOrganization|TestNewDingTalk|TestDingTalkOrganizationSyncResponseHelpersHandleEmptyInputs|TestResolveDingTalk|TestIsDingTalk|TestNew.*OrganizationSyncConfigResponse|TestResolve.*OrganizationSync|TestIs.*OrganizationSyncAdmin'`
  - 结果：三个包均通过。
- `web-admin` 目录：`yarn test --runInBand --watchAll=false DingTalkOrganizationSyncBackend.test.ts DingTalkOrganizationSyncPage.test.tsx OrganizationSyncTypes.test.ts ManagementPage.navigation.test.tsx ManagementPage.shell.test.tsx Setting.test.tsx App.test.tsx`
  - 结果：8 个 test suites、61 个 tests 通过。
- `web-admin` 目录：`yarn typecheck`
  - 结果：通过。
- `web-admin` 目录：`node scripts/check-incremental-typescript-gate.mjs --base origin/hfl-test-base`
  - 结果：退出码 0，无输出，视为通过。
- `web-admin` 目录：`yarn build`
  - 结果：生产构建通过，`build-temp` 成功迁移为 `build`。

## 覆盖率

### 前端受影响文件

命令：

```powershell
yarn test --runInBand --watchAll=false --coverage --coverageDirectory $env:TEMP\aicodex-dingtalk-web-coverage --collectCoverageFrom=src/DingTalkOrganizationSyncPage.tsx --collectCoverageFrom=src/backend/DingTalkOrganizationSyncBackend.ts --collectCoverageFrom=src/organizationSync/OrganizationSyncTypes.ts DingTalkOrganizationSyncBackend.test.ts DingTalkOrganizationSyncPage.test.tsx OrganizationSyncTypes.test.ts
```

结果：4 个 test suites、21 个 tests 通过。

| 文件 | Lines | Statements | Branches | Functions |
| --- | ---: | ---: | ---: | ---: |
| All files | 94.42% | 94.46% | 76.10% | 93.65% |
| `src/DingTalkOrganizationSyncPage.tsx` | 94.71% | 94.73% | 76.29% | 92.23% |
| `src/backend/DingTalkOrganizationSyncBackend.ts` | 100% | 100% | 66.66% | 100% |
| `src/organizationSync/OrganizationSyncTypes.ts` | 88.00% | 88.46% | 76.47% | 100% |

### 后端受影响实施文件

命令：

```powershell
go test ./object -covermode=count "-coverprofile=$env:TEMP\aicodex-dingtalk-object.cover" -run 'DingTalk|FeishuOrganizationSync|WecomOrganizationSync|OrganizationDirectorySourceStatus|OrganizationDirectorySourceGuard|OrganizationSyncProviderConfigValidation|OrganizationSyncSourceGuard|OrganizationSyncScheduler|OrganizationSyncSchedule|OrganizationSyncDefaultScheduleStore|OrganizationSyncProviderConfigDefaultWrappers|OrganizationSyncConfigService|ApplyOrganizationSyncDispatchResult|SafeOrganizationSyncErrorText'
go test ./controllers -covermode=count "-coverprofile=$env:TEMP\aicodex-dingtalk-controllers.cover" -run 'TestDingTalkOrganizationSyncHandlersRejectMalformedJson|TestDingTalkOrganizationSyncHandlersRejectMissingOrganizationBeforeStoreAccess|TestDingTalkOrganizationSyncHandlersRejectUnauthorizedOrganization|TestNewDingTalk|TestDingTalkOrganizationSyncResponseHelpersHandleEmptyInputs|TestResolveDingTalk|TestIsDingTalk|TestNew.*OrganizationSyncConfigResponse|TestResolve.*OrganizationSync|TestIs.*OrganizationSyncAdmin'
go test ./routers -covermode=count "-coverprofile=$env:TEMP\aicodex-dingtalk-routers.cover" -run 'Test(Get|AuthzFilter|ApiFilter|InitAPI|ResolveModuleOrganizationQuery|IsOrganizationSyncApiKeyReadPath)'
```

统计对象为本 change 修改或新增的后端实施文件，不使用全包平均值掩盖未覆盖分支。

| 文件 | 覆盖语句 | 总语句 | 覆盖率 |
| --- | ---: | ---: | ---: |
| `object/dingtalk_organization_client.go` | 249 | 287 | 86.76% |
| `object/dingtalk_organization_sync.go` | 32 | 32 | 100.00% |
| `object/dingtalk_organization_sync_config.go` | 157 | 192 | 81.77% |
| `object/dingtalk_organization_sync_run.go` | 115 | 135 | 85.19% |
| `object/dingtalk_organization_sync_scheduler.go` | 46 | 50 | 92.00% |
| `object/dingtalk_organization_sync_service.go` | 411 | 480 | 85.62% |
| `object/organization_sync_scheduler.go` | 242 | 296 | 81.76% |
| `object/organization_sync_source_guard.go` | 268 | 291 | 92.10% |
| `object/feishu_organization_sync_config.go` | 188 | 219 | 85.84% |
| `object/wecom_organization_sync_config.go` | 191 | 212 | 90.09% |
| `controllers/dingtalk_organization_sync.go` | 98 | 191 | 51.31% |
| `routers/authz_filter.go` | 182 | 245 | 74.29% |
| `routers/router.go` | 379 | 379 | 100.00% |
| **合计** | **2558** | **3009** | **85.0116%** |

归档前门槛：85%。当前已达标，后端 changed-file coverage 阻断解除。部分 controller/router 文件仍低于 85%，但对应成功 handler 路径需要真实 store/DB 或审计链路；本轮用高价值单测覆盖了配置校验、来源守卫、调度、脱敏、API 路由授权解析和错误处理分支，并按受影响实施文件合计统计。

## 已知验证 warning

- Jest 输出 React 18 下 `ReactDOM.render is no longer supported`，来自当前 testing-library/React 测试环境。
- Jest 输出 Ant Design `Spin` 的 `act(...)` warning，以及 fake timers 清理 native timer 的提示。
- `yarn build` 输出 Node `fs.F_OK` deprecation、Browserslist 数据过期提示和 CRA bundle size warning。

这些 warning 未导致命令失败；本记录不把它们当作钉钉同步功能阻断，但后续若升级测试基础设施或拆包优化，应单独处理。

## 运行态验收口径

当前证据覆盖源码级、Mock API 契约、单元测试、类型检查和前端生产构建层级。尚未使用真实钉钉租户、真实企业内部应用凭据和通讯录读取 scope 做 provider/API contract smoke，也未在部署环境验证完整同步链路。

因此，当前不能声明真实钉钉端到端同步已通过。归档前如产品要求运行态验收，需要使用脱敏环境别名和占位符记录真实凭据验证结果，不写入任何 token、secret、Cookie、真实 URL、真实 IP 或完整响应体。

## 脱敏检查

本验证记录只使用命令、相对路径、状态码级结果和覆盖率数字；未记录真实钉钉凭据、access token、Cookie、真实环境 URL、真实环境 IP、完整通讯录数据、手机号或个人邮箱。

## 剩余风险与下一步

- 如后续继续修改后端实施文件，需要重新计算 changed-file coverage，目标仍是不低于 85%。
- 使用真实钉钉测试租户和最小通讯录读取权限做脱敏 provider smoke，确认 access token、部门读取、成员读取、连接测试和一次同步 run 的运行态契约。
- 当前工作区尚未形成单个本 change commit；执行 archive/closeout 前需要把本 change 收敛为一个最终提交，并基于最新 `origin/hfl-test-base` 重新跑关键验证。
