# Verification

## 2026-05-29 本地实现验证

已运行：

```powershell
cd D:\CodeRepo\LeagProject\aicodex\aicodex-admin\admin
go test ./controllers -run 'TestInsightCurrentUserUsesWecomResolver|TestInsightCurrentUserReturnsUnavailable|TestInsightDepartmentScopeUsesResolver|TestInsightDepartmentScopeRejectsResolver|TestInsightUsageIdentityResolver' -count=1 -vet=off -timeout 5m
go test ./controllers -run 'TestInsightDepartmentScope(BatchesResolverCandidatesAcrossDepartments|DeduplicatesOverlappingResolverCandidates)' -count=1 -vet=off -timeout 5m
go test ./controllers -run 'TestInsight' -count=1 -vet=off -timeout 5m
go test ./controllers -count=1 -vet=off -timeout 5m
go test ./object -run 'TestWecom|TestGetWecom' -count=1 -timeout 5m
cd ..
openspec validate define-wecom-usage-identity-mapping --strict
```

结果：

- resolver client 配置、鉴权头、成功 envelope、协议错误分类测试通过。
- current-user 在缺少手工映射时可通过 resolver 返回 `usageIdentity.apiUserId`、`mappingStatus=OK`、`mappingSource=wecom.resolver`。
- resolver 不可用时返回 `PROVIDER_UNAVAILABLE`，不会降级为 `MISSING`。
- 部门 scope 会批量解析成员并回填顶层与部门级 `apiUserIds`。
- resolver 返回 `MISSING` 时，部门/全公司这类 queryable scope 会跳过未映射成员；self/custom users 这类精确 scope 仍返回 `AUTHORIZATION_FAILED` 和 `mappingStatus=MISSING`。
- 未配置 resolver endpoint/token 时保持原手工映射行为。
- 部门负责人跨多个部门时只发起一次 resolver 批量调用；父子部门重叠成员会按 `adminUserId` 去重后再请求 api。
- `openspec validate define-wecom-usage-identity-mapping --strict` 通过。

## 配置样例

```env
AICODEX_INSIGHT_USAGE_IDENTITY_RESOLVER_ENDPOINT=http://aicodex-api:3000/api/usage-identity-provider/v1/wecom/resolve
AICODEX_INSIGHT_USAGE_IDENTITY_RESOLVER_TOKEN=replace_with_private_token
AICODEX_INSIGHT_USAGE_IDENTITY_RESOLVER_CALLER=aicodex-admin
AICODEX_INSIGHT_USAGE_IDENTITY_RESOLVER_MAX_ITEMS=200
AICODEX_INSIGHT_USAGE_IDENTITY_RESOLVER_TIMEOUT_MS=5000
```

真实 token 和生产 endpoint 只写入私有部署环境，不提交到仓库。

## 2026-05-29 测试环境部署联调

已完成：

- api 测试环境已部署 `hfl-test/add-wecom-usage-identity-resolver`，commit `2a39df656`。
- admin 测试环境已部署 `hfl-test/define-wecom-usage-identity-mapping`，commit `d7fc7f72`。
- api 侧已配置 `INSIGHT_USAGE_IDENTITY_PROVIDER_*`；admin 侧已配置 `AICODEX_INSIGHT_USAGE_IDENTITY_RESOLVER_*`，真实 token 只写入远端私有 `.env`。
- 使用远端私有 token 调用 api resolver 冒烟成功：不存在的测试主体返回 `success=true`、`mappingStatus=MISSING`，证明路由、鉴权和服务间配置已生效。
- admin 容器内 resolver endpoint/token 已加载，服务健康检查通过。
- 为企业微信同步用户 `wecom-user-huangfanli` 临时开启密码联调，并在 api 测试库创建等价用量账号与 `aicodex-admin` OAuth binding；临时密码只保存在本机私密文件，不提交仓库。
- 该用户在 admin 侧补充 `aicodexApiOrganizationId=019e5071-1b17-7632-906e-bb56b62e9b21`，api 侧等价账号加入同一默认用量组织，避免把 admin 企业微信组织名误传给 usage provider。
- Insight 使用 `wecom-user-huangfanli` 通过 aicodex-admin OIDC 密码登录成功；后续修复展示名优先级后，页面显示企业微信组织同步展示名 `黄凡力`。
- api resolver 对该 admin subject 返回 `success=true`、`mappingStatus=OK`、`apiUserId=3`。
- Insight `用量概览` 重新查询后，`summary`、`timeseries`、`model-options` 均返回 `code=0`；当前等价账号无实际用量，页面显示空态。
- Insight `组织用量` 的 `organization-tree` / `by-department` 和 `人员明细` 的 `by-user` 均返回 `code=0`、空列表。
- 日志验证：admin 侧 `insight_usage_identity_resolver_audit` 出现 `resolverOkCount=1`，`insight_admin_provider_audit` 出现 `scopeType=SELF`、`mappingStatus=OK`、`apiUserCount=1`；api 侧出现 `usage_identity_provider.request.completed` 和 `usage_provider.request.completed` 成功审计。

## 2026-06-01 企业微信扫码复测

- 从 Insight 跳转到 aicodex-admin 企业微信扫码入口，使用企业微信用户 `huangfanli` 扫码登录成功，并正常回跳 Insight。
- Insight 右上角显示 `黄凡力`，确认 current-user provider 已优先返回企业微信组织同步的 `displayName`，不再使用 Casdoor 通用友好名 `Fanley, Huang`。
- `用量概览`、`组织用量`、`人员明细` 页面均可进入并展示空态，没有出现登录失败、scope provider 失败或 usage provider 错误提示。
- 当前测试账号暂无可管理部门、可见人员和实际用量，页面空态符合本轮测试数据预期；如需验证部门负责人报表，需要在 admin 企业微信组织中为该用户配置可管理部门并让对应成员完成 api 用量身份绑定。

## 2026-06-01 企业微信同步用户应用关联回填

- admin 测试环境已部署 `hfl-test/define-wecom-usage-identity-mapping`，commit `fe5bbb1c`。
- 修复前通过 `GET /api/get-users?owner=wecom-wwe7e01c69367e67bf&p=1&pageSize=2000` 统计：总用户 `1048`，已禁用 `5`，已删除 `0`，`signupApplication` 为空 `1045`，已设置 `3`。
- 触发 `POST /api/wecom-org-sync/runs`，runId 为 `wecom-sync-run-1780280084291897054`，后台同步终态为 `succeeded`。
- 本次同步结果：新增用户 `0`，更新用户 `1043`，禁用用户 `5`。
- 同步后再次统计：总用户 `1048`，已禁用 `5`，已删除 `0`，`signupApplication` 为空 `5`，已设置 `1043`。
- 结论：现存活跃企业微信同步用户均已回填默认企业微信应用关联；企业微信侧已删除或缺失的 5 个用户继续按软禁用保留，不做物理删除。

## 2026-06-01 预归档补充验证

- 预归档 review 发现 resolver 响应协议防御可补强：当 api resolver 返回空、重复或非本次请求的 `requestId` 时，admin provider 现在按 `PROVIDER_UNAVAILABLE` 处理，避免异常响应把其他用户的用量身份串到当前用户或 scope。
- 新增测试覆盖 current-user 收到非预期 `requestId`、scope 收到重复 `requestId` 两个边界。
- 已运行 `go test ./controllers -count=1 -vet=off -timeout 5m`，结果通过。
- 已运行 `go test ./object -run "TestWecomOrganizationSyncService" -count=1 -timeout 5m`，结果通过。
- 已运行 `openspec validate define-wecom-usage-identity-mapping --strict`，结果通过。
- 已运行 `git diff --check`，结果通过。
- 已部署远端 `10.18.80.69` 的 admin 服务到 `hfl-test/define-wecom-usage-identity-mapping`，commit `11f5e68b`；服务首页返回 HTTP 200。
- 部署后通过 admin API 登录冒烟成功，再次统计企业微信组织用户：总用户 `1048`，已禁用 `5`，已删除 `0`，`signupApplication` 为空 `5`，已设置 `1043`。

## 2026-06-01 二次预归档审阅

- 二次 review 发现上一轮协议防御仍缺少“漏掉本次预期 `requestId`”校验：resolver 返回空结果或只返回部分结果时，admin provider 可能把 provider 协议异常误判为 `MISSING`。
- 已修复 `mapInsightUsageIdentityResultsByRequestId`，要求 resolver 响应必须覆盖本次所有预期 `requestId`；漏项统一返回 `PROVIDER_UNAVAILABLE`，不再降级成用户映射缺失。
- 新增 `TestInsightCurrentUserRejectsOmittedResolverRequestId` 和 `TestInsightScopeRejectsOmittedResolverRequestId`，覆盖 current-user 空响应和 scope 部分漏响应两个边界。
- 再次 review 发现审计日志 spec 容易被理解为单条日志必须同时包含 provider 字段和 resolver batch 字段；已回写 design/spec，明确 admin provider audit 与 resolver-client audit 通过同一 `traceId` 关联。
- 三次 review 发现 `tasks.md` 的审计日志任务描述仍有同类歧义；已同步任务描述，明确 scope provider audit 与 resolver-client audit 分开记录、同 trace 关联。
- 已运行 `go test ./controllers -count=1 -vet=off -timeout 5m`，结果通过。
- 已运行 `openspec validate define-wecom-usage-identity-mapping --strict`，结果通过。
- 已运行 `git diff --check`，结果通过。
