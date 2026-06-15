## 验证记录

日期：2026-06-15

## 命令

- `git rebase --autostash origin/hfl-test-base`：通过；已把 WIP 重放到最新 `origin/hfl-test-base`。
- `go test ./object -run 'FeishuOrganizationSyncDryRunPreview|FeishuOrganizationSyncDryRunFailureReason|IncrementFeishuDryRunReason' -count=1`：通过。
- `go test ./object -run 'FeishuOrganizationSyncDryRunPreview|FeishuOrganizationSyncDryRunFailureReason|IncrementFeishuDryRunReason' -coverprofile ..\feishu_dryrun_object.out -count=1`：通过。
- `go test ./controllers -run 'FeishuOrganizationSync' -count=1`：通过。
- `go test ./controllers -run 'FeishuOrganizationSync' -coverprofile ..\feishu_dryrun_controllers.out -count=1`：通过。
- `go test ./routers -run 'FeishuOrganizationSyncDryRunPreview|FeishuOrganizationSync' -count=1`：通过。
- `go test ./routers -run 'FeishuOrganizationSyncDryRunPreview|FeishuOrganizationSync' -coverprofile ..\feishu_dryrun_routers.out -count=1`：通过。
- 在 `web-admin` 执行 `yarn test FeishuOrganizationSyncBackend.test.js FeishuOrganizationSyncPage.test.js --watchAll=false --runInBand`：通过，2 个 suite / 7 个 test。
- 在 `web-admin` 执行 `yarn build`：通过。
- `openspec validate implement-admin-feishu-organization-sync-dry-run-diff-console --strict`：通过。
- `openspec validate --changes --strict`：通过，4 个 change。
- `openspec validate --specs --strict`：通过，15 个 spec。
- `git diff --check`：通过。

## 覆盖率说明

`admin/object/feishu_organization_sync_dry_run.go` 的 changed-function 覆盖率证据：

- `Preview`: 100.0%
- `diffDepartments`: 89.1%
- `diffUsers`: 86.0%
- `diffMemberships`: 87.3%
- `failedPreview`: 91.7%
- `prepareFeishuOrganizationSyncDryRunConfig`: 100.0%
- `classifyFeishuDryRunFailureReason`: 100.0%
- `buildFeishuDryRunDiagnostics`: 100.0%
- `safeFeishuDryRunSummary`: 100.0%
- `feishuDryRunSensitiveValues`: 100.0%
- duplicate and snapshot lookup helpers: 100.0%
- `incrementFeishuDryRunReason`: 100.0%

低于 85% 的剩余项：

- `buildPreview`: 60.0%；已通过 `Preview` 覆盖正常编排和 nil snapshot 归一化。剩余分支是下层 diff 函数返回 store error 的透传路径，下层成功路径和分类路径已直接覆盖。
- `snapshotClient`: 66.7%；测试覆盖注入 client 路径。默认构造分支只返回 concrete client，不执行网络 I/O。
- `object` package 总覆盖率仍较低，因为该 package 很大；本 change 采用 touched/changed function 证据作为门禁口径。

Controller 覆盖率：

- 直接 Beego handler 方法仍是 0%，因为现有 focused controller 测试覆盖 helper 边界，而不是完整 session-backed HTTP dispatch。
- 权限 helper 已覆盖：`resolveFeishuOrganizationSyncTarget` 100.0%，`isFeishuOrganizationSyncAdmin` 100.0%，包含全局管理员、组织管理员默认 owner、跨组织拒绝、普通成员拒绝和缺少 organization。
- Router authz parsing 已覆盖 `/api/feishu-org-sync/dry-run-preview` 的 POST body organization 提取。

## 安全门禁

- 未读取真实 Feishu/Lark app secret。
- 未触发真实租户同步。
- 未写入真实租户 payload 或 fixture。
- Dry-run service 复用现有 snapshot client contract，但不调用 `ApplyFullSnapshot`。
- object 测试对比 preview 前后的持久化行数，覆盖 `Group`、`User`、Feishu mappings、platform master data、`ExternalIdentity`、`OrgSyncBatch` 和 `FeishuOrganizationSyncRun`。
- preview response 只返回聚合计数、source aliases、reason counts 和 diagnostics；不返回 raw Contact payload、完整树/用户列表、tokens、secrets、phone numbers、emails、`open_id`、`union_id` 或 `user_id`。

## 本地告警

- 早前执行 `git fetch origin --prune` 时出现 TLS certificate verification disabled warning；没有暴露 secret 或 payload。
- 前端 focused tests 会打印当前测试库既有的 React 18 `ReactDOM.render` warning。
- `yarn build` 会打印既有 bundle size、Browserslist outdated 和 Node `fs.F_OK` deprecation warnings；构建仍成功完成。
