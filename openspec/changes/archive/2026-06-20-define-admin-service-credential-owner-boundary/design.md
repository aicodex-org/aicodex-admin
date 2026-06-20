## Context

只读盘点确认 Admin 仓库已有三类与本 change 相关的配置表面：

- 身份应用与身份源：`Application`、Provider 绑定、OIDC client 和相关授权/回调配置已经由现有 Application / Provider / OIDC client 上下文管理。
- Insight provider trust / 白名单：`insightProviderAllowedAudiences`、`insightProviderAllowedIssuers`、`insightProviderRequiredScopes` 出现在 Admin deploy 配置和 provider 校验代码中。
- Admin outbound service credentials：`insightUsageIdentityResolverEndpoint`、`insightUsageIdentityResolverToken`、`insightUsageIdentityResolverCaller`、`insightUsageIdentityResolverMaxItems`、`insightUsageIdentityResolverTimeoutMs`、`gatewayOrganizationProjectionEndpoint`、`gatewayOrganizationProjectionStatusEndpoint`、`gatewayOrganizationProjectionToken`、`gatewayOrganizationProjectionCaller`、`gatewayOrganizationProjectionTimeoutMs`、`gatewayOrganizationProjectionFreshnessTTLSeconds`、`gatewayOrganizationProjectionMaxRetries`、`gatewayOrganizationProjectionRefreshEnabled`、`gatewayOrganizationProjectionRefreshIntervalSeconds`、`gatewayOrganizationProjectionRefreshInitialDelaySeconds`、`gatewayOrganizationProjectionRefreshBatchSize` 等 key 已在 Admin producer / provider 侧使用。

本盘点只记录 key 名和 owner 分类；未读取、记录或输出任何配置值。

## Decisions

### 身份应用和 OIDC client 继续归现有对象上下文

Admin SHALL 继续把身份应用、Provider、OIDC client、回调地址、授权范围、Provider 目标组织和 OIDC 组织解析模式放在现有 Application / Provider / OIDC client owner context。配置治理不得新增一个抽象“跨服务凭据”入口来接管身份应用，也不得让该入口绕过既有 Application / Provider 权限、审计和字段约束。

### Insight provider trust / 白名单归 Admin provider trust context

`insightProviderAllowedAudiences`、`insightProviderAllowedIssuers`、`insightProviderRequiredScopes` 是 Admin 为 Insight 调用 Admin provider 时维护的 trust allowlist。后续如产品化到 UI，应落在 Admin provider trust / 白名单或等价 owner context，并只展示允许的 audience、issuer、scope 策略和脱敏状态，不展示 bearer token、Cookie 或原始授权头。

### Admin outbound 服务间凭据引用归 Admin owner context

Admin 调 API/Gateway 的 outbound 服务间凭据引用和调用策略由 Admin 管理，包括 usage identity resolver、Gateway organization projection ingestion/status、projection refresh worker 的 endpoint/token reference、caller、timeout、max items、retry、batch、refresh interval 和 freshness TTL。Admin owner 的职责是管理“调用谁、用哪个凭据引用、以什么 caller 和运行策略调用”，而不是管理 API/Gateway 的授权事实或 Insight 的消费真值。

### keep-in-env 边界保持在启动配置或外部密钥系统

DB、Redis、监听端口、TLS/证书、bootstrap、KMS/Vault bootstrap、RADIUS/LDAP server secret、break-glass/recovery、构建 token、翻译 token 和其它根密钥配置 SHALL 继续留在 env/config、部署系统或外部密钥系统。Admin UI/runtime 不应把这些启动级或根密钥配置作为普通业务凭据入口管理。

### 跨服务 truth owner 不变

Admin 可以作为 identity、organization master model、provider trust 和 projection producer 的 owner，但 SHALL NOT 写入或推断 API/Gateway usage facts、resource authorization facts、Gateway runtime allow/deny 结果或 Insight consumer truth。Insight 和 API/Gateway consumer 不得用 Admin 诊断输出在本地补算 owner/provider 的可信事实。

## Non-Goals

- 不改 Admin 认证中心登录、回调、OIDC runtime、Application、Provider 或 Gateway projection 业务代码。
- 不新增页面、菜单、抽屉、表格、API 或数据库 schema。
- 不改 API/Gateway、Insight 或 LLM AI/Gateway TS 写集。
- 不读取或输出 token、Cookie、DSN、client secret、完整私有 URL、完整组织树、真实账号或 raw payload。

## Validation

- `openspec validate define-admin-service-credential-owner-boundary --strict`
- `openspec validate --changes --strict`
- `openspec validate --specs --strict`
- `git diff --check`

代码测试和覆盖率为 N/A，因为本 change 仅修改 OpenSpec 文档和主规格，不修改生产代码。
