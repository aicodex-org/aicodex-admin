## Context

`admin/controllers/insight_provider.go` 当前通过 `getInsightAllowedTokenAudiences`、`isInsightIssuerAllowed` 和 `hasInsightRequiredScopes` 读取 legacy env/config。服务凭据治理配置入口已经能保存 `insight_provider_trust` 分组，但该分组尚未定义可被 provider trust runtime 消费的显式 policy 字段。

## Decisions

1. `insight_provider_trust` 的 saved runtime policy 使用 `boundedRuntimePolicy` 承载 copy-safe 字段，避免新增独立接口：
   - `allowedAudiences`: audience/client id 列表，只允许非 URL、非 secret-like 的短文本。
   - `requiredScopes`: scope 列表；为空时采用现有默认 `profile insight.scope.read`，并在 status 中标记 `requiredScopesDefaulted=true`。
   - `allowedIssuerDigests`: issuer 的 SHA-256 digest 列表；不得保存完整 issuer URL。
   - `issuerMode`: `any_non_empty` 或 `digest_allowlist`。
2. 显式 saved policy 判定只针对 `insight_provider_trust` 分组：只有保存记录存在且该分组含有 trust policy 字段时，provider bearer 校验才覆盖 legacy env/config。保存了其它分组不会误触发 provider trust override。
3. saved enabled policy 覆盖 legacy env/config。缺 audience、scope 或 issuer digest mismatch 时直接拒绝，不能回落 env。
4. saved disabled policy fail-closed。即使 legacy env/config 配置完整，也拒绝 provider bearer。
5. `issuerMode=any_non_empty` 保留 legacy “未配置 issuer allowlist 时只要求 issuer 非空”的兼容语义，但只有在 saved policy 显式选择该 mode 时生效。
6. Governance status 对 `insight_provider_trust` 输出 copy-safe 摘要：
   - `configuredKeys` 只包含 key 名、count 和 digest 别名，不包含完整 issuer URL。
   - `boundedRuntimePolicy` 可包含 `source`、`allowedAudienceCount`、`allowedIssuerDigestCount`、`requiredScopeCount`、`requiredScopesDefaulted`、`issuerMode`、`cannotInfer`。
   - `blockedReasons` 使用 stable aliases，例如 `insight_provider_saved_trust_policy_disabled`、`insight_provider_allowed_audiences_missing`、`insight_provider_issuer_digest_missing`、`insight_provider_required_scopes_missing`。
7. 配置入口继续拒绝敏感材料。针对 `insight_provider_trust`，`boundedRuntimePolicy` 中的 URL、`Authorization`、`Cookie`、`clientSecret`、private key、DSN、raw payload/raw id/full private URL 都必须拒绝。

## Compatibility

- 没有保存配置或没有显式 trust policy 字段时，provider bearer trust 继续使用 legacy env/config。
- 现有 response shape 不改名；只增加 copy-safe bounded policy 摘要和 stable blocked reason。
- `requiredScopes` 默认逻辑沿用现有默认 scope，但 status 必须表达 defaulted。

## Validation Plan

- RED: 先写 focused Go tests，证明 saved policy 当前未被 provider trust 和 status 消费。
- GREEN: 最小实现 policy normalization、sanitizer、provider trust resolution 和 status 输出。
- Coverage: 对 `admin/controllers` 和 `admin/object` 运行 focused tests 与覆盖率。
- OpenSpec: target strict、changes strict、specs strict。
- Frontend: 只有触碰 `web-admin` 时运行 focused Jest/typecheck；如不触碰则记录 N/A。

## Rollback

回滚本 change 后，provider bearer trust 将重新只按 legacy env/config 判断。已保存的 copy-safe policy metadata 不含可复用凭据，可继续留存在配置记录中；后续重新启用该 change 或删除配置记录均不需要 secret rotation。
