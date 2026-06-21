## Why

上一条 `implement-admin-service-credential-governance-status-contract` 已经让应用接入中心能读取 Admin 运行态的服务凭据治理状态，但 operator 仍只能看到“已配置/缺失/阻断”摘要，无法在 Admin owner 上下文中维护 copy-safe 的配置引用、caller 策略和下一步处置说明。

本 change 在现有应用接入上下文中补齐服务凭据治理配置入口：管理员可以读取、保存并回读 Admin-owned 的 provider trust / allowlist、usage identity resolver、Gateway organization projection publisher 和 keep-in-env 分类元数据。配置入口只保存脱敏、可复制安全的配置引用和策略元数据，不保存 raw secret/token/client secret，也不触发任何 Gateway/API/Insight 外部写操作。

## What Changes

- 新增 global-admin-only 的服务凭据治理配置合同，例如 `GET/POST /api/application-access/service-credential-governance-config`。
- 配置合同覆盖 `insight_provider_trust`、`usage_identity_resolver`、`gateway_organization_projection`、`keep_in_env` 分组的 enabled 状态、owner hint、credential reference、caller policy、bounded runtime policy、source class、next action 和 blocked reasons。
- 保存操作仅接受 Admin-owned、copy-safe 字段；credential 只能以 reference/status/owner-managed 或 keep-in-env 元数据表示。
- 既有 `GET /api/application-access/service-credential-governance-status` 保持兼容，必要时可消费新配置元数据补充 owner/remediation 摘要，但不得破坏既有 response shape。
- 在既有 `/applications` 应用接入中心中增加紧凑配置入口和脱敏回读状态；不新建“大中心”，不改变 Application 表格、保存、删除、Provider、OIDC、登录、WeCom 或 Gateway projection 行为。

## Out of Scope

- 不实现 raw secret 存储、明文凭据保管、凭据生成、轮换、真实连通性测试或 external secret system 写入。
- 不修改 API/Gateway/Insight 仓库，不写 Gateway authorization facts，不触发 Gateway projection publish/refresh。
- 不改 OIDC callback、认证中心登录主流程、WeCom 同步主流程，也不接管相关历史 active change。
- 不新增独立一级菜单、营销式页面或新 UI 库。

## Impact

- Backend: 新增配置 DTO、脱敏校验/归一化、GET/POST controller、路由和 global-admin guard 复用。
- Frontend: 扩展 `ApplicationAccessCenter` 和 backend client，提供 loading/error/saving/saved/disabled/masked/reference-only 状态。
- OpenSpec: 更新 Admin service credential owner boundary 与 Application Access Center 规格。
- Security: 测试和验证必须证明响应、UI、日志和 report 不包含 token、Authorization header、Cookie、DSN、client secret、完整 private URL、raw ids 或 raw payload。
