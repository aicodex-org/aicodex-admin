## Context

Admin 已经拥有以下运行态配置读取点：

- `insightProviderAllowedAudiences`、`insightProviderAllowedIssuers`、`insightProviderRequiredScopes` 控制 Insight 调用 Admin provider 的 trust allowlist。
- `insightUsageIdentityResolverEndpoint`、`insightUsageIdentityResolverToken`、`insightUsageIdentityResolverCaller`、`insightUsageIdentityResolverMaxItems`、`insightUsageIdentityResolverTimeoutMs` 控制 Admin 调用 API/Gateway usage identity resolver。
- `GetGatewayProjectionPublisherConfig()` 和 `GetGatewayProjectionRefreshConfig()` 读取 Admin-to-Gateway projection publisher/refresh worker 配置。
- root/bootstrap 类配置应继续保留在 env/config 或外部 secret 系统边界，仅能展示安全 key 分类。

这些配置目前分散在运行时 helper 中，应用接入中心不能直接消费。P0 需要一个 Admin-owned、read-only、sanitized contract 作为前端和后续治理工作的稳定来源。

## Decisions

1. 后端响应 builder 放在 `admin/controllers`，因为 Insight provider trust 和 usage identity resolver helper 已在同 package 中，避免为本次任务迁移共享 helper 或扩大写集。
2. Gateway projection 状态通过 `object.GetGatewayProjectionPublisherConfig()` 和 `object.GetGatewayProjectionRefreshConfig()` 读取，只展示 endpoint/statusEndpoint/token 的配置状态和 caller/timeout/retry/freshness/refresh 数值，不展示 URL 或 token 值。
3. `insight_provider_trust` 对 allowed audiences 缺失 fail closed；allowed issuers 缺失按现有运行行为可接受任意非空 issuer，但治理状态标记为 `partial`，提示收敛白名单；required scopes 缺失时使用现有默认 scope 并在 bounded policy 中标记 defaulted。
4. `usage_identity_resolver` 在 endpoint 和 token 均配置时为 `configured`，只配置一项时为 `partial`，都缺失时为 `missing`；token 只以 `credentialReferenceStatus` 表示。
5. `gateway_organization_projection` 未启用时为 `not_applicable`；启用但 endpoint/statusEndpoint/token 缺失时为 `blocked` 或 `partial`，并返回稳定 `blockedReasons`；启用且最小 publish 配置完整时为 `configured`。
6. `keep_in_env` 是分类分组，不读取或暴露配置值；它返回安全 key/pattern 名和 `external_secret` 凭据引用状态。
7. UI 只在 `/applications` 的既有应用接入上下文中展示摘要，不新增中心，不触发任何写操作。

## API Shape

`GET /api/application-access/service-credential-governance-status`

响应 `data` 中包含：

- `generatedAt`
- `source=admin_runtime_config`
- `groups[]`
- `groups[].key`
- `groups[].label`
- `groups[].owner`
- `groups[].status`: `configured | missing | partial | blocked | not_applicable`
- `groups[].configuredKeys[]`
- `groups[].missingKeys[]`
- `groups[].credentialReferenceStatus`: `configured | missing | external_secret | not_applicable`
- `groups[].callerPolicy`
- `groups[].boundedRuntimePolicy`
- `groups[].keepInEnvKeys[]`
- `groups[].blockedReasons[]`
- `groups[].remediationRoute`

## Security

- 响应和测试不得包含 token、Authorization header、Cookie、DSN、client secret、private key、完整 private URL、raw response、raw ids、真实账号或完整组织树。
- 日志和验证记录只记录命令、字段名、状态和脱敏结论。
- 该接口只读，不触发 provider request、resolver request、Gateway projection publish/refresh、OIDC/login/WeCom 行为。

## Validation Plan

- TDD RED: 先补后端 builder/API focused tests，证明四个分组、状态分类和敏感值不泄漏。
- GREEN: 实现后端 builder、controller、route、authz allowlist。
- UI 若接入：补 focused Jest tests 覆盖加载、错误、摘要和敏感值不展示。
- 收口验证：OpenSpec strict、Go focused tests/coverage、前端 focused tests、TS gate、typecheck、diff check；如路由或 build-time import 受影响则运行 build。
