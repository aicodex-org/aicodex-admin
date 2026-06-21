## Why

Admin 已有 `GET /api/application-access/service-credential-governance-status` 和 `GET/POST /api/application-access/service-credential-governance-config`。配置入口可以保存 copy-safe 的服务凭据引用、caller policy 和 bounded runtime policy，但 status contract 仍主要从 legacy env/config 推导 `usage_identity_resolver` 与 `gateway_organization_projection` 状态。

这导致管理员保存或禁用服务凭据治理配置后，应用接入中心看到的状态仍可能回落到 legacy env token readiness，无法表达“Admin 已保存配置引用优先”或“已保存配置禁用时必须 fail-closed”。本 change 补齐 saved copy-safe config 对 status/diagnostics 的 overlay，让状态契约和配置入口形成闭环。

## What Changes

- `GET /api/application-access/service-credential-governance-status` 在读取运行态状态时消费已保存的服务凭据治理配置元数据。
- 无保存配置时保持现有 legacy env/config fallback 行为，兼容部署配置和 60 环境。
- 保存了 `usage_identity_resolver` 或 `gateway_organization_projection` 配置时，status 优先使用 saved `enabled`、`sourceClass`、`credentialReferenceStatus`、`credentialReferenceKey`、`callerPolicy`、`boundedRuntimePolicy`、`blockedReasons`、`remediationRoute` 和 `nextAction`。
- saved config `enabled=false` 时 fail-closed：对应分组不得继续把 legacy env/config token 报告为 active readiness，并返回稳定 blocked reason。
- saved config `enabled=true` 且 reference 已配置或 external secret 管理时，status 只表达引用状态和 bounded policy，不解析真实 external secret。
- 应用接入中心继续消费既有 status/config 契约；如需 UI 调整，仅限 overlay 状态可见性的最小改动。

## Out of Scope

- 不保存 raw secret/token/client secret/Cookie/Authorization/DSN/private key/完整 private URL/raw payload/raw ids。
- 不解析 external secret，不实现 KMS/Vault resolver，不测试凭据连通性。
- 不触发 Gateway projection publish/refresh，不调用 API/Gateway/Insight 真实 runtime。
- 不修改 API/Insight repo，不改 OIDC/Login/WeCom 主流程。
- 不迁移 `keep_in_env` 中的 DB、Redis、KMS/Vault bootstrap、break-glass、build token、RADIUS/LDAP root secret 等部署级配置。
- 不新增“大中心”、一级菜单、新 UI 库或视觉重设计。

## Impact

- Backend: 扩展服务凭据治理 status builder，使其在只读路径读取配置 service 并对 resolver/projection 分组做 copy-safe overlay。
- Tests: 增加 focused Go tests，覆盖 legacy fallback、saved enabled、saved disabled fail-closed、missing/partial 和脱敏。
- OpenSpec: 补充 Admin service credential owner boundary 与 Application Access Center 对 overlay 状态的契约。
- Security: 输出继续只包含安全 key 名、引用状态、caller policy、bounded runtime policy、blocked reasons 和 remediation route。
