## Verification

本记录只写脱敏命令、状态和覆盖率摘要，不写 token、Cookie、DSN、client secret、private key、完整 issuer URL、完整私有 URL、raw payload、raw id、真实账号或完整组织树。

## RED

- `cd admin; go test ./controllers -run 'Insight|ServiceCredentialGovernance' -count=1`
  - 结果：按预期失败。新增 `insight_provider_trust` saved runtime policy tests 证明当前 provider trust helper 和 governance status 仍使用 legacy env/config。
- `cd admin; go test ./object -run ServiceCredentialGovernanceConfig -count=1`
  - 结果：按预期失败。新增 trust policy array test 证明当前 sanitizer 会把 copy-safe arrays 转成字符串。

## GREEN

- `cd admin; go test ./controllers -run 'Insight|ServiceCredentialGovernance' -count=1`
  - 结果：通过。
- `cd admin; go test ./object -run ServiceCredentialGovernanceConfig -count=1`
  - 结果：通过。

## Coverage

- `cd admin; go test ./controllers -run 'Insight|ServiceCredentialGovernance' -coverprofile .\controllers-trust-policy.cover -count=1`
  - 结果：通过，package 总覆盖率 `9.4%`。该包历史体量很大，因此按本 change 新增/修改函数查看 changed-function coverage。
  - `applyInsightProviderTrustStatusGroupConfigOverlay`: `86.5%`
  - `getInsightProviderTrustRuntimePolicy`: `100.0%`
  - `buildInsightProviderTrustRuntimePolicyFromConfig`: `94.7%`
  - `hasInsightProviderTrustRuntimePolicyFields`: `100.0%`
  - `insightPolicyStringSlice`: `91.7%`
- `cd admin; go test ./object -run ServiceCredentialGovernanceConfig -coverprofile .\object-trust-policy.cover -count=1`
  - 结果：通过，package 总覆盖率 `1.0%`。该包历史体量很大，因此按本 change 新增/修改函数查看 changed-function coverage。
  - `validateInsightProviderTrustRuntimePolicy`: `85.7%`
  - `sanitizeServiceCredentialGovernanceConfigPolicy`: `96.4%`
  - `containsServiceCredentialGovernanceSensitivePolicyValue`: `100.0%`
  - `containsServiceCredentialGovernanceSensitiveMaterial`: `100.0%`
  - `serviceCredentialGovernancePolicyStringSlice`: `91.7%`
  - `isServiceCredentialGovernanceIssuerDigest`: `85.7%`

## OpenSpec And Diff

- `openspec validate implement-admin-insight-provider-trust-runtime-policy --strict`: 通过。
- `openspec validate --changes --strict`: 通过。
- `openspec validate --specs --strict`: 通过。
- `git diff --check`: 通过。

## Security Notes

- saved `insight_provider_trust` runtime policy 只保存 copy-safe `allowedAudiences`、`requiredScopes`、`allowedIssuerDigests` 和 `issuerMode`。
- 完整 issuer URL 不保存；provider runtime 使用 `sha256:<digest>` 与 token issuer 的 digest 比对。
- saved disabled policy fail-closed，不回落 legacy env/config。
- 本 change 未触发 API/Gateway/Insight 写操作、Gateway projection publish/refresh、Login/OIDC callback 或 WeCom 主流程。

## Frontend

- 未修改 `web-admin`，前端 Jest、TypeScript gate、`yarn typecheck` 和 build 为 N/A。
