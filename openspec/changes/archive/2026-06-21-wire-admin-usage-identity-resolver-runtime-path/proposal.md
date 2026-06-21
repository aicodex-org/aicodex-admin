## Why

60 环境验收发现 stable blocker `usage_identity_resolver_downstream_runtime_path_not_wired`：`usage_identity_resolver` 的 saved service credential runtime policy 已能保存、回读和进入 status overlay，但 live Insight provider 的用量身份映射仍只读取本地 confirmed mapping。

这会导致 operator 在“应用接入中心 / 服务凭据治理”中保存的 resolver 策略没有真正约束 `current-user` 或 scope 查询链路。尤其是 saved disabled / unresolved / invalid policy 不能在 outbound 前 fail-closed，P0“通过 UI 打通用量配置”仍未闭环。

## What Changes

- 在 Admin provider runtime path 中接入现有 `usage_identity_resolver` saved runtime policy gate。
- 本地 confirmed admin-to-api mapping 保持优先且行为不变。
- 当本地 mapping missing 且用户存在安全 resolver item 时，调用现有 resolver runtime policy。
- saved disabled、unresolved reference、invalid/scope/caller mismatch 在 outbound 前 fail-closed，不回落 legacy env/config。
- saved `env_config` / `keepInEnv=true` 正向路径继续允许 legacy secret 位置，但必须应用 saved caller/bounded policy。
- 增加聚焦 Go 测试和验证记录，覆盖 no-outbound、fail-closed 和 bounded policy 行为。

## Non-Goals

- 不改 API、Gateway、Insight 仓库。
- 不新增 secret vault，不解析 `credentialReferenceKey` 为真实 secret，不把引用 key 当 URL 或 token 使用。
- 不改 `gateway_organization_projection` 正向 publish 逻辑；该路径已由上一 change 覆盖。
- 不改 Login、OIDC callback、WeCom 登录、身份应用 CRUD 或组织授权 truth。
- 不输出 token、Cookie、DSN、client secret、Authorization header、完整私有 URL、raw payload、raw id、真实账号或完整组织树。

## Impact

- 影响 Admin 后端 `insight_provider` 的 usage identity resolution path。
- 复用既有 `insight_usage_identity_resolver` 配置、HTTP resolver 和 service credential runtime policy helper。
- 无数据库迁移，无新 API，无前端 TypeScript 改动。
