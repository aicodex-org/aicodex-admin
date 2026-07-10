## 验证范围

本记录区分 60 pre-fix 运行态证据、本地自动化修复证据和 60 post-fix 只读 smoke。验证过程只读取 60 测试环境的授权私有说明、Admin provider/mapping 只读接口和脱敏状态；未写数据库、未改配置、未重启服务，未记录 token、Cookie、密码、私有 URL、raw payload 或 raw DB row。

## 60 pre-fix 脱敏证据

- 同一测试账号登录会话中，`GET /api/admin-provider/insight/v1/current-user` 返回 HTTP 200 / status ok / `usageIdentity.mappingStatus=OK`，且 `apiUserId` 为正整数；organization 短哈希 `1cc23f9e`，API user id 短哈希 `d4735e3a`。
- 同一会话中，`GET /api/admin-provider/insight/v1/current-user/scope` 返回 HTTP 503 / `PROVIDER_UNAVAILABLE` / `mappingStatus=MISSING`。
- 组织 mapping 只读接口返回 HTTP 200：目标组织 mapping 总数 1，`CONFIRMED` 且带 API organization id 的记录数 1；API organization id 短哈希 `834549ee`。
- 用户 mapping readiness 返回 HTTP 200：总 subject 1083，`active_publishable=4`、`mapping_missing=1079`。
- `current-user=OK` 且 saved resolver 对缺失成员不可用，结合 Admin provider 代码只接受 confirmed 正整数本地 mapping 或成功 resolver 结果，可排除“当前用户自身 mapping 未补齐”的配置分支。结论分类为 `CODE_BUG`；resolver unavailable 是聚合范围缺陷的触发条件，不是允许扩大权限的理由。

## TDD 证据

### RED

命令：

```text
go test ./controllers -run TestInsightQueryableScopesSkipResolverUnavailableMissingMembers -count=1 -vet=off -timeout 90s -v
```

结果：失败。`all_company` 与 `department_tree` 均返回 `PROVIDER_UNAVAILABLE: usage identity resolver unavailable`，证明严格 preload 在既有 `skipMissing` 前提前终止。

精确范围对照：

```text
go test ./controllers -run TestInsightExactScopesFailClosedWhenResolverUnavailable -count=1 -vet=off -timeout 90s -v
```

结果：通过；`SELF` / `CUSTOM_USERS` 均保持 `AUTHORIZATION_FAILED + MISSING`。

### GREEN

命令：

```text
go test ./controllers -run 'TestInsight(QueryableScopesSkipResolverUnavailableMissingMembers|ExactScopesFailClosedWhenResolverUnavailable)$' -count=1 -vet=off -timeout 90s -v
```

结果：通过；聚合范围只保留 confirmed 映射成员，缺失成员未进入 `adminUserIds` / `apiUserIds`，精确范围仍 fail-closed。

## 自动化回归与覆盖率

命令：

```text
go test ./controllers -run 'TestInsight.*Scope|TestInsight.*Usage' -count=1 -vet=off -timeout 90s
```

结果：通过，`ok .../controllers 0.715s`。

完整 controllers 回归与覆盖率：

```text
go test ./controllers -count=1 -vet=off -timeout 5m -coverprofile=<temp-cover>
go tool cover -func=<temp-cover>
```

结果：通过。controllers package 总 statements coverage 为 20.8%；本 change 直接修改的实现函数覆盖率为：

- `mapInsightUsersToUsageIdsWithPolicyAndCache`: 95.0%
- `preloadInsightUsageIdentityCacheWithPolicy`: 87.2%
- `cacheInsightMissingUsageIdentities`: 100.0%

受影响函数均达到 85% 门槛；package 总覆盖率受 controllers 大包历史代码影响，不作为本 change 的 changed-function 门槛替代。

## OpenSpec 与工作区门禁

- RC 阶段执行 `openspec validate fix-admin-current-user-scope-mapping --strict`：通过。
- Self-closeout 阶段同步并归档 change 后执行 `openspec validate --changes --strict`：无 active change，命令通过。
- Self-closeout 阶段执行 `openspec validate --specs --strict`：34 个主规格全部通过。
- 基于最新 `origin/hfl-test-base` 重放单提交后执行聚焦 Go 回归与 changed-function coverage：通过，覆盖率仍为 95.0% / 87.2% / 100.0%。
- `git diff --check`：通过。
- secure handoff package/redeem/confirm：无代码改动。
- RC 与 60 smoke 阶段未修改 `test`、60 配置或数据；self-closeout 仅按授权 ff-only 合入 `hfl-test-base`，不触碰 `test`。

## 60 post-fix 脱敏 smoke

- 60 Admin 部署提交与 RC HEAD 一致，服务健康。
- 使用真实 Insight OIDC 测试登录态调用 `GET /api/admin-provider/insight/v1/current-user`：HTTP 200 / status ok / `usageIdentity.mappingStatus=OK`；审计计数为 admin user 1、API user 1、group 1。
- 同一登录流程调用 `GET /api/admin-provider/insight/v1/current-user/scope`：HTTP 200 / status ok / errorCode 为空 / `mappingStatus=OK` / `scopeType=ALL_COMPANY`；审计计数为 admin users 4、API users 4、departments 3。
- Admin provider 脱敏审计 trace 短号 `4d15c70f`（current-user）与 `8d191058`（scope）均为 `status=ok`、`mappingStatus=OK`、errorCode 为空；相邻重复调用结果一致。
- Insight 用量概览的 summary、timeseries、model-options 三条报告请求均返回 HTTP 200，页面不再显示账号映射错误，而显示当前授权范围和筛选条件下暂无用量数据，证明链路已越过 Admin mapping gate 并进入 API usage provider 查询。

运行态结论：原问题分类为 `CODE_BUG`，修复已在 60 的管理员 `ALL_COMPANY` 路径生效；不属于当前用户 `CONFIG_GAP` 或 `ENV_PROVIDER_UNAVAILABLE`。

剩余风险：本轮 60 post-fix smoke 未覆盖 `DEPARTMENT_TREE` 和本人 mapping 缺失的 `SELF` 运行态账号，但 focused Go 测试已覆盖两者的 queryable/fail-closed 边界；当前时间窗口没有非零用量，因此只确认 gate 与 provider 查询路径通过，未确认非零聚合展示。resolver 不可用期间，聚合结果仍只包含本地 confirmed 映射成员，可能是不完整但确定的子集；Admin readiness 应继续向 operator 展示缺失计数。
