## Why

上一轮应用接入治理状态接入被阻塞在 `admin_service_credential_runtime_source_gap`：`ApplicationAccessCenter` 没有可消费的 Admin-owned 运行态脱敏服务凭据治理状态契约。如果继续只做静态说明面板，管理员无法判断 provider trust、usage identity resolver、Gateway organization projection publisher 或 keep-in-env 分组到底是已配置、缺失、部分配置还是被阻断。

本 change 先补齐 Admin 自身拥有的只读契约，再在应用接入上下文中以紧凑摘要消费该契约。该契约只读取 Admin 运行态配置和现有安全配置 helper，不读取 API/Gateway/Insight 内部库，不发布 projection，不写入真实登录、OIDC、WeCom 或 Gateway truth。

## What Changes

- 新增 `GET /api/application-access/service-credential-governance-status`，返回 `admin_runtime_config` 来源的脱敏治理状态。
- 响应按 `insight_provider_trust`、`usage_identity_resolver`、`gateway_organization_projection`、`keep_in_env` 四个分组返回状态、配置 key 名、缺失 key 名、凭据引用状态、调用策略、受限运行策略、阻断原因和修复入口。
- 后端只返回 key 名和状态，不返回 token、Authorization header、Cookie、DSN、client secret、private key、完整 private URL、真实账号、完整组织树、raw provider/downstream response 或 raw id。
- 在应用接入中心读取该接口并展示紧凑的服务凭据治理摘要，覆盖加载、错误和空状态；不新建一级中心，不改变 Application 保存、删除、认证、OIDC、Provider 或 Gateway projection 行为。

## Out of Scope

- 不新增服务凭据写入、轮换、删除或 secret center 管理能力。
- 不改变 Insight provider 调用、usage identity resolver 调用、Gateway projection publish/refresh 的现有运行语义。
- 不查询或改写 API/Gateway/Insight 内部 truth、authorization facts、usage facts、projection store 或 report provider diagnostics。
- 不接管 OIDC/login/WeCom 遗留 active changes 的写集，不做视觉重设计或新 UI 库引入。

## Impact

- Backend: 新增只读 controller/build helper、路由和 GET allowlist。
- Frontend: 应用接入中心增加一个只读状态摘要和 focused tests。
- OpenSpec: 更新服务凭据 owner boundary 和应用接入中心规格。
- Security: 验证响应与 UI 均不泄漏凭据值或私有连接细节。
