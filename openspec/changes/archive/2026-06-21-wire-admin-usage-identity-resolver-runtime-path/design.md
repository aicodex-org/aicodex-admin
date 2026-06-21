## Context

上一阶段已实现 Admin-owned service credential governance config 与 runtime policy helper：

- 无 saved config 时，`usage_identity_resolver` 保留 legacy env/config fallback。
- saved disabled / unresolved external reference 时，`getInsightUsageIdentityResolverConfig()` 不返回可用 resolver config。
- saved `env_config` / `keepInEnv=true` 时，legacy endpoint/token 仍作为 secret 位置，但 caller、timeout、maxItems 等 copy-safe runtime policy 可覆盖 legacy 默认值。

剩余缺口在 live provider 调用链：`resolveInsightUsageIdentityWithTrace()` 和批量 scope 映射仍只调用本地 confirmed mapping，没有在 local mapping missing 时进入 resolver gate。

## Decisions

1. 本地 confirmed mapping 仍是最高优先级。
   - `PlatformApiUserMapping` 已是 Admin 侧明确映射事实，存在且有效时不发起 resolver outbound。

2. resolver 只在 local mapping missing 且 `buildInsightUsageIdentityResolveItem()` 返回安全 item 时运行。
   - item 只包含稳定 admin/source/wecom 标识。
   - 非 confirmed external identity、禁用 WeCom mapping 或缺少稳定标识时不发起 resolver outbound。

3. resolver unavailable 作为 fail-closed，而不是 legacy fallback。
   - saved disabled、unresolved reference、缺必要 policy 或 config store 不可判定时，resolver 构造失败。
   - 对 live `current-user` 路径返回 `PROVIDER_UNAVAILABLE`，`mappingStatus=MISSING`，不触达外部。
   - 对 scope 聚合路径复用同一解析函数，保留 `skipMissing` 语义：没有安全 item 的普通 missing 可继续被聚合 skip；显式 saved policy fail-closed 不应被 skip 掩盖。

4. resolver response 只接受确定且正整数的 `apiUserId`。
   - `OK` 且 `apiUserId>0` 映射为 `MappingStatusOK`。
   - `MISSING`、`AMBIGUOUS`、`INVALID` 或非正整数保持对应 mapping status，不在 Admin 本地补算或伪造。

5. 日志、错误和验证记录保持 copy-safe。
   - 不输出 endpoint、token、Authorization、raw URL、raw response、raw id 或个人敏感字段。
   - stable blocker 使用既有 `PROVIDER_UNAVAILABLE` / mapping status 表达，详细 root cause 留在脱敏 status diagnostics。

## Risks

- 如果 resolver 正向路径没有安全 fake/no-op 60 target，只能在 60 中证明 disabled/unresolved no-outbound，正向运行态验收记录为 `blocked_by_no_safe_usage_resolver_test_target`。
- 批量 scope 路径可能涉及多用户解析，本 change 必须避免为了方便而对每个用户重复构造外部 HTTP client；优先复用 cache 和 resolver 实例。

## Validation

- OpenSpec target/changes/specs strict。
- 聚焦 Go tests 覆盖：
  - local confirmed mapping 不触发 resolver；
  - local missing + saved disabled no-outbound fail-closed；
  - local missing + unresolved external/admin reference no-outbound fail-closed；
  - local missing + saved env_config/keepInEnv 使用 saved caller/maxItems/timeout；
  - resolver invalid/scope/caller mismatch 或不可用时 fail-closed；
  - scope mapping path 复用 resolver gate。
- `go test -cover ./admin/controllers` 作为受影响 package 覆盖率证据。
- `git diff --check`。
