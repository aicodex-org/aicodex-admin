## 验证记录

### OpenSpec

- `openspec validate wire-admin-usage-identity-resolver-runtime-path --strict`：通过。
- `openspec validate --changes --strict`：通过。
- `openspec validate --specs --strict`：通过。

### Go 聚焦测试

- `cd admin; go test ./controllers -run 'Test(Insight(CurrentUser|Scope|UsageIdentityResolver)|BuildInsightUsageIdentityFromResolverResult|PreloadInsightUsageIdentityCache)' -count=1 -timeout 120s`：通过。

覆盖行为：

- 本地 confirmed mapping 优先，且不调用 resolver。
- local missing + saved `env_config` / `keepInEnv=true` 调用 resolver，并应用 saved caller / maxItems / timeout。
- saved disabled 与 unresolved external reference 在 outbound 前 fail-closed。
- resolver 返回 invalid / caller-scope mismatch 类状态时 fail-closed，不回落 legacy。
- scope mapping path 将 local-missing 用户合并为一次 resolver batch。
- 无 saved config 且 legacy resolver 未配置时保持 missing fallback。

### 覆盖率

- `cd admin; go test ./controllers -run 'Test(Insight(CurrentUser|Scope|UsageIdentityResolver)|BuildInsightUsageIdentityFromResolverResult|PreloadInsightUsageIdentityCache)' -coverprofile "$env:TEMP\wire-admin-usage-identity-resolver-runtime-path.cover" -count=1 -timeout 120s`：通过。
- `go tool cover -func "$env:TEMP\wire-admin-usage-identity-resolver-runtime-path.cover"` changed-function 摘要：
  - `resolveInsightUsageIdentityWithTrace`: 100.0%
  - `resolveInsightUsageIdentityWithResolver`: 100.0%
  - `buildInsightUsageIdentityFromResolverResult`: 100.0%
  - `mapInsightUsersToUsageIdsWithPolicyAndCache`: 90.0%
  - `preloadInsightUsageIdentityCache`: 87.8%
  - `getInsightUsageIdentityResolverRuntimePolicyDecision`: 100.0%
  - `getInsightUsageIdentityResolverConfig`: 100.0%
- `controllers` package 总覆盖率为 4.4%，低于 85% 是历史大包体量导致；本 change 使用 changed-function 覆盖率作为主要证据，新增/改动函数均达到 85% 以上。

### Diff 检查

- `git diff --check`：通过。

### 60 运行态

- 本阶段尚未执行 60 环境复验；完成 archive、单 commit、同步最新 `origin/hfl-test-base` 并合入后，如存在安全 fake/no-op resolver target，可继续执行聚焦 downstream gate acceptance。
- 若 60 没有安全 fake/no-op target，正向 resolver outbound 验收应记录为 `blocked_by_no_safe_usage_resolver_test_target`，不得伪造成功。
