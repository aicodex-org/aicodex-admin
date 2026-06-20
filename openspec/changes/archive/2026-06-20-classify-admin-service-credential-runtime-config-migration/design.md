# Design

## 目标

- 给 Admin owner 侧运行态服务凭据、身份 provider trust 和跨服务配置建立可恢复的分类路线。
- 后续 UI 或配置迁移只能读取本分类中的 owner 边界，不得把下游 owner truth 或 root secret 迁入错误入口。
- 盘点材料只保留 key/pattern 和来源类型，不保留真实值、raw payload、完整私有 URL、账号或组织明细。

## 非目标

- 不实现配置迁移、UI、API、DB schema、密钥轮换、provider contract 或运行态 smoke。
- 不编辑认证中心、OIDC、WeCom/login active change 写集。
- 不编辑 LLM AI/Gateway TS 迁移写集。
- 不修改 API/Gateway 或 Insight 仓库。

## 分类原则

| 迁移桶 | 判定规则 | 兼容/fallback |
| --- | --- | --- |
| `keep in env/config` | 启动级、root secret、DB/Redis/port/TLS/KMS/Vault bootstrap、目录挂载、build/translation token、recovery/break-glass | 保持 env/config 或外部 secret system 为 truth；UI 只能链接 runbook 或展示脱敏 configured/missing |
| `move to Admin UI` | Admin 自己拥有的身份应用、OIDC client、身份源 Provider、provider trust 白名单、Admin outbound 调用 API/Gateway 的 credential reference 和调用策略 | 先保留 env/config 读取；未来 UI 持久化后必须 fail closed，且只展示引用/状态，不展示值 |
| `move to API UI` | API/Gateway owner 的接入凭据、provider runtime diagnostics、Gateway authorization/usage provider facts、contract/metric/path metadata、handoff package、credential lifecycle/audit | Admin 只保存引用、调用策略或只读 owner receipt；不得写 Gateway 授权事实 |
| `move to Insight UI` | Insight consumer-side 的业务服务接入、provider alias/base URL/reference、doctor/dry-run/save/rollback/export limit | Insight 只消费 Admin/API/Gateway owner contract；不得生成 API/Gateway token 或补算 Admin truth |
| `defer/blocked` | 与 auth-center/OIDC/WeCom/login active changes、LLM TS 迁移、未知 owner 决策、缺失 runtime contract 或 bootstrap 约束重叠 | 等对应 owner change 归档或主控决策后再迁移；本 change 只记录 blocked 原因 |

## 脱敏盘点摘要

| key/pattern | 当前来源类型 | target owner | 建议 | 验证路径 | 风险/阻塞 |
| --- | --- | --- | --- | --- | --- |
| `AICODEX_DB_DRIVER`, `AICODEX_DB_HOST`, `AICODEX_DB_PORT`, `AICODEX_DB_USER`, `AICODEX_DB_PASSWORD`, `AICODEX_DB_NAME`, `AICODEX_DB_SSLMODE`, `AICODEX_DB_EXTRA_OPTIONS` | deploy example / docs env pattern | Admin deploy/runtime | `keep in env/config` | deploy example key scan, docs key scan, startup config smoke | DB credential 和 DSN 属于 root/bootstrap secret，不能迁入业务 UI |
| `driverName`, `dbName`, `dataSourceName` | app config / compose / local runtime settings | Admin deploy/runtime | `keep in env/config` | app config key scan, local runtime config tests | `dataSourceName` 可能包含 credential，任何报告必须只记录 key 名 |
| `AICODEX_ADMIN_HTTP_PORT`, `AICODEX_ADMIN_IMAGE`, `AICODEX_CREATE_DATABASE`, `AICODEX_ADMIN_UPLOAD_DIR`, `AICODEX_ADMIN_LOG_DIR`, `AICODEX_ADMIN_TMP_DIR`, `RUNNING_IN_DOCKER`, `defaultLanguage` | deploy example / app config | Admin deploy/runtime | `keep in env/config` | deploy example key scan | 端口、镜像、目录和语言默认值不是业务凭据 |
| `CROWDIN_PERSONAL_TOKEN` | translation config pattern | Build/localization owner | `keep in env/config` | repo key-name scan | build/translation token 不属于 Admin runtime UI |
| `insightProviderAllowedAudiences`, `insightProviderAllowedIssuers`, `insightProviderRequiredScopes` and `AICODEX_INSIGHT_PROVIDER_ALLOWED_*` | compose / env example / main spec | Admin provider trust | `move to Admin UI` | OpenSpec owner-boundary spec, deploy key scan | 必须 fail closed；只展示 audience/issuer/scope 名称和脱敏状态 |
| `insightUsageIdentityResolverEndpoint`, `insightUsageIdentityResolverToken`, `insightUsageIdentityResolverCaller`, `insightUsageIdentityResolverMaxItems`, `insightUsageIdentityResolverTimeoutMs` and matching `AICODEX_INSIGHT_USAGE_IDENTITY_RESOLVER_*` | compose / app config / main spec | Admin outbound service credential owner context | `move to Admin UI` | OpenSpec owner-boundary spec, deploy key scan | endpoint/token 只能作为引用或 configured/missing 状态展示，不输出值 |
| `gatewayOrganizationProjectionEndpoint`, `gatewayOrganizationProjectionStatusEndpoint`, `gatewayOrganizationProjectionToken`, `gatewayOrganizationProjectionCaller`, `gatewayOrganizationProjectionTimeoutMs`, `gatewayOrganizationProjectionFreshnessTTLSeconds`, `gatewayOrganizationProjectionMaxRetries`, `gatewayOrganizationProjectionRefreshEnabled`, `gatewayOrganizationProjectionRefreshIntervalSeconds`, `gatewayOrganizationProjectionRefreshInitialDelaySeconds`, `gatewayOrganizationProjectionRefreshBatchSize` | main spec / runtime policy pattern | Admin outbound service credential owner context with API/Gateway owner receipt | `move to Admin UI` | OpenSpec owner-boundary and Gateway projection specs | Admin 只拥有 producer 调用策略和 credential reference，不拥有 Gateway 授权事实 |
| identity `Application`, `Provider binding`, `OIDC client`, redirect URI, scopes, provider target organization | main specs / existing Admin object contexts | Admin identity owner contexts | `move to Admin UI` | Application/Provider/OIDC specs | 受 auth-center/OIDC active changes 影响的具体页面写集 deferred |
| API/Gateway `接入凭据`, provider credential lifecycle/audit, provider runtime diagnostics, contract/metric/path metadata, handoff package | owner-boundary prompt / Gateway projection specs | API/Gateway | `move to API UI` | API/Gateway owner contract and Admin read-only receipt specs | 本仓只记录 owner route；不得在 Admin 中创建 API/Gateway truth |
| Insight business service access, provider alias/base URL/reference, doctor/dry-run/save/rollback/export limit | owner-boundary prompt / Insight provider specs | Insight | `move to Insight UI` | Insight consumer contract and Admin provider wrapper specs | Insight consumer 不得生成 API/Gateway token 或补算 Admin/API/Gateway truth |
| OIDC gateway routing, auth-center shell, WeCom homepage login/admin config, LLM AI/Gateway TS migration surfaces | active OpenSpec changes / archived TS migration specs | Existing active change owner | `defer/blocked` | `openspec list --json`, active change strict validation | 等 active changes 归档或主控明确授权后再做具体迁移 |

## 验证策略

- 创建 change 后运行 `openspec validate classify-admin-service-credential-runtime-config-migration --strict`。
- 运行 `openspec validate --changes --strict` 和 `openspec validate --specs --strict`，确保历史 active changes 不破坏 strict 可信度。
- 运行 `git diff --check` 和归档后差异检查。
- 使用 key-name scan 确认新增 artifacts 只包含安全 key/pattern 和占位描述，不包含 `=` 后真实值、token、Cookie、DSN、完整私有 URL 或 raw payload。
- 因本 change 不修改生产代码，单测覆盖率为 N/A。
