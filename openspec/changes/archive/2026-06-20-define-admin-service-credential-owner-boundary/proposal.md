## Why

Admin 侧的身份应用、OIDC client、Insight provider trust、usage identity resolver 和 Gateway organization projection producer 已经分散存在于配置、规格和运行态代码中。三仓库配置治理需要一个明确的 Admin owner-boundary 规格，说明哪些服务间配置和凭据引用归 Admin 管理，哪些启动级配置继续留在 env/config 或外部密钥系统，避免后续把身份应用、API/Gateway 授权事实或 Insight consumer truth 混到同一个入口里。

本 change 只做 Admin 侧 owner boundary、OpenSpec 规格和只读盘点，不改认证中心业务代码、不改 LLM AI/Gateway TS 写集、不改 API/Gateway/Insight。

## What Changes

- 新增 `admin-service-credential-owner-boundary` capability，固化 Admin 对服务间配置和凭据引用的 owner 边界。
- 明确身份应用、Provider、OIDC client 继续由现有 Application / Provider / OIDC client 上下文管理，不新增独立“跨服务凭据”入口接管身份应用。
- 明确 `insightProviderAllowedAudiences`、`insightProviderAllowedIssuers`、`insightProviderRequiredScopes` 属于 Admin provider trust / 白名单 owner context。
- 明确 Admin 调 API/Gateway 的服务间凭据引用、caller、限流/分页、timeout、retry、refresh 和 freshness 策略属于 Admin outbound service credential owner context。
- 明确 DB、Redis、端口、证书、bootstrap、RADIUS/LDAP server secret、break-glass/recovery、构建/翻译 token 等启动级或根密钥配置继续留在 env/config 或外部密钥系统。
- 记录只读盘点范围，只列 key 名和 owner 分类，不记录任何 token、secret、完整私有 URL、账号、raw payload 或真实组织明细。

## Capabilities

### New Capabilities

- `admin-service-credential-owner-boundary`: 定义 Admin 身份应用、provider trust、outbound 服务间凭据引用、keep-in-env 配置和跨服务 truth owner 的边界。

### Modified Capabilities

- 无。相关现有 capability 只作为只读上下文，不在本 change 中修改。

## Impact

- 仅新增 OpenSpec change artifacts 和归档后的主规格。
- 不修改生产代码、前端页面、接口、数据库 schema、部署配置或测试 fixture。
- 不接管 `add-organization-sync-api-keys`、OIDC/auth-center 相关 active changes、LLM AI/Gateway TS 迁移或 API/Gateway/Insight 仓库写集。
- 验证以 OpenSpec strict 校验和 `git diff --check` 为主；代码覆盖率标记为 N/A，原因是无生产代码改动。
