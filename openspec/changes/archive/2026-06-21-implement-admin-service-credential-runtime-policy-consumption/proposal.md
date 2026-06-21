## Why

Admin 已经提供 `应用接入中心 / 服务凭据治理` 的 copy-safe 配置入口和 status overlay，但 `usage_identity_resolver` 与 `gateway_organization_projection` 的实际运行时路径仍主要读取 legacy env/config。

这会导致管理员在 UI 中保存服务凭据治理配置后，运行时仍可能继续使用旧的 endpoint、token 或 caller。P0 目标是让用量链路需要的服务间凭据/组织身份调用策略从治理配置进入真实 runtime policy gate，而不是停留在静态状态展示。

## What Changes

- 为 `usage_identity_resolver` 和 `gateway_organization_projection` 增加 Admin-owned saved runtime policy gate。
- 无已保存治理配置时，保持 legacy env/config fallback，避免破坏现有部署。
- 已保存分组 `enabled=false` 时 fail-closed，不再回落 legacy endpoint/token/caller。
- 已保存分组 `enabled=true` 且 `sourceClass=env_config` 或 `keepInEnv=true` 时，允许继续读取 legacy endpoint/token，但使用 saved caller/bounded runtime policy 约束运行时默认值。
- 已保存分组 `sourceClass=external_secret_system` 或 `admin_config` 且 Admin 当前无法解析 `credentialReferenceKey` 时，fail-closed 并返回稳定 blocker alias，例如 `admin_service_credential_reference_unresolved`。
- 对缺少 credential reference、caller policy 或必要 bounded runtime policy 的 saved enabled 分组 fail-closed，并通过脱敏 status/diagnostic 暴露稳定 blocker。

## Non-Goals

- 不实现新的 secret vault 或 external secret resolver。
- 不保存、读取、输出 raw token、Authorization header、Cookie、DSN、client secret、完整私有 URL、raw payload/raw id、真实账号或完整组织树。
- 不把 `credentialReferenceKey` 当作 URL、token 或可直接调用凭据。
- 不改 API、Gateway、Insight 仓库。
- 不触碰 OIDC/Login/WeCom/身份应用 CRUD 主流程。
- 不触发真实 Gateway projection publish/refresh 到生产或未授权环境。
- 不新增泛配置中心或新一级入口。

## Impact

- 后端：`admin/controllers/insight_usage_identity_resolver.go`、Gateway projection publisher/service/readiness/observability 等最小路径会消费 saved runtime policy gate。
- OpenSpec：扩展 `admin-service-credential-owner-boundary`，明确 saved config 从 status overlay 进入运行时 gate 的契约。
- 测试：新增 focused Go tests 覆盖 legacy fallback、saved disabled fail-closed、unresolved reference fail-closed、env_config/keepInEnv overlay 和脱敏 blocker。
