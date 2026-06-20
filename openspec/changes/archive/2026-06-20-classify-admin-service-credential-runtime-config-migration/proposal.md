## Why

Admin 侧的服务间凭据、身份 provider trust、Gateway/Insight 对接策略和启动级配置目前散布在部署示例、运行态配置、OpenSpec 主规格和运维文档中。三仓库配置治理需要把这些 key/pattern 先按 owner 和迁移桶归类，明确哪些继续留在 env/config，哪些以后进入 Admin UI，哪些应由 API/Gateway 或 Insight 的配置界面承接，避免后续把 bootstrap root secret、身份应用、API/Gateway 授权事实和 Insight consumer truth 混到同一个入口。

本 change 只做 Admin owner 侧配置盘点和迁移路线，不迁移真实密钥，不修改业务页面、认证中心业务代码、LLM AI/Gateway TS 写集、API/Gateway 或 Insight 仓库。

## What Changes

- 在 `admin-service-credential-owner-boundary` capability 下新增运行态服务凭据和身份 provider 配置盘点要求。
- 记录脱敏分类清单，只写 key/pattern、当前来源类型、target owner、迁移建议、兼容/fallback、验证路径和风险。
- 明确 `AICODEX_DB_*`、`driverName`、`dbName`、`dataSourceName`、端口、目录、bootstrap/root token 等继续留在 env/config 或外部 secret system。
- 明确 Admin owner 的 provider trust 和 outbound service credential reference 后续可迁到 Admin UI 或既有 Admin owner context，但本 change 不实现 UI。
- 明确 API/Gateway owner 的接入凭据、provider runtime diagnostics、contract/metric/path metadata、handoff package 和 credential audit 应迁到 API UI。
- 明确 Insight consumer-side 的业务服务接入、provider alias/base URL/reference、doctor/dry-run/save/rollback/export limit 应迁到 Insight UI。
- 将 auth-center/OIDC/WeCom/login active changes 或 LLM TS 迁移重叠项标为 `defer/blocked`，不接管其写集。

## Capabilities

### Modified Capabilities

- `admin-service-credential-owner-boundary`: 增加运行态服务凭据/身份 provider 配置的 owner 分类和迁移路线要求。

## Impact

- 写集限制在本 OpenSpec change、归档后的 `admin-service-credential-owner-boundary` 主规格和最终报告。
- 不修改生产代码、前端页面、接口、数据库 schema、部署配置、真实 `.env`、runtime secret、DB 行或测试环境数据。
- 不接管 `stabilize-admin-oidc-gateway-routing`、`refactor-web-admin-auth-center-shell`、`add-wecom-homepage-login-and-admin-config`。
- 验证以 OpenSpec strict、`git diff --check` 和脱敏清单检查为主；代码覆盖率为 N/A，因为无生产代码变更。
