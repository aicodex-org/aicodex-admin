## Context

已归档的服务凭据治理配置入口把 operator 可维护的元数据保存在 Admin-owned store 中，且 `ServiceCredentialGovernanceConfigService.GetConfig()` 在没有保存记录时返回默认分组并设置 `IsConfigured=false`。当前 status builder 只读取 legacy env/config，因此无法区分“没有保存配置，按 legacy fallback 展示”和“已经保存配置，必须按 saved config 解释状态”。

## Decisions

1. overlay 只作用于 `usage_identity_resolver` 和 `gateway_organization_projection`。`insight_provider_trust` 继续由 Admin provider trust runtime config 推导；`keep_in_env` 继续作为部署/外部 secret 分类展示。
2. status endpoint 保持 response shape：`source` 仍为 `admin_runtime_config`，分组 key 与字段不改名；overlay 只改变对应分组的状态、引用状态、caller、bounded policy、blocked reasons、remediation route 和 key 摘要。
3. status endpoint 通过现有 `applicationAccessServiceCredentialGovernanceConfigServiceFactory().GetConfig()` 读取 saved config。读取失败时返回 error，而不是静默回落 legacy，避免 metadata store 故障时误报 readiness。
4. `IsConfigured=false` 表示没有保存配置，status 必须保持 legacy env/config fallback。
5. saved config `enabled=false` 表示 operator 显式禁用该分组。status MUST fail closed：返回 `blocked`、`credentialReferenceStatus=not_applicable` 或 saved reference status、清空 legacy configured token readiness，并附加稳定 reason `admin_service_credential_config_disabled`。
6. saved config `enabled=true` 且 `credentialReferenceStatus=configured|external_secret` 时，status 可返回 `configured`，但只展示 `credentialReferenceKey` 对应的安全 key 名，不展示 endpoint/token/full URL。caller 与 bounded runtime policy 取 saved copy-safe metadata。
7. saved config `enabled=true` 但缺少 reference、caller 或 bounded runtime policy 时，status 返回 `partial` 或 `blocked`，并附加稳定 blocked reasons，例如 `admin_service_credential_reference_missing`、`admin_service_credential_caller_policy_missing`、`admin_service_credential_runtime_policy_missing`。
8. 若 saved `blockedReasons` 已包含 operator 维护的安全 reason，status 合并这些 reasons；服务端仍依赖配置入口的 copy-safe 校验保证不保存敏感值。

## Status Overlay Mapping

- `enabled=false`: `status=blocked`，`blockedReasons` 包含 `admin_service_credential_config_disabled`，不保留 legacy token configured keys。
- `enabled=true` + `credentialReferenceStatus=configured|external_secret` + caller/policy 完整: `status=configured`。
- `enabled=true` + reference 缺失: `status=blocked`，`credentialReferenceStatus=missing`。
- `enabled=true` + caller 或 bounded policy 缺失: `status=partial`，并返回稳定 reason。
- `sourceClass=external_secret_system` 只作为引用来源分类，不触发 external secret 解析。

## Validation Plan

- RED: focused Go tests 先证明 saved config 不会影响现有 status。
- GREEN: 最小实现 overlay builder 和 controller factory 读取路径。
- Coverage: 受影响 Go controller package 使用 `go test -cover` 或 coverprofile 检查覆盖率。
- OpenSpec: target strict、changes strict、specs strict。
- Security: JSON marshal 检查不泄漏 token、Authorization、Cookie、clientSecret、privateKey、完整 private URL 或 raw payload。
- Frontend: 只有实际触碰 `web-admin` 时运行 TS gate、focused Jest、`yarn typecheck` 和必要 build。

## Rollback

该 change 只影响 Admin status endpoint 的只读状态合成逻辑。回滚代码后，无保存配置和已保存配置都会重新按 legacy env/config 推导状态；配置入口保存的数据仍为 copy-safe metadata，不需要数据回滚。
