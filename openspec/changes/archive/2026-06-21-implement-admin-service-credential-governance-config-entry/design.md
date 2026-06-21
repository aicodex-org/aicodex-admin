## Context

Admin 已有只读服务凭据治理状态合同，来源是运行态 env/config 和既有 helper。该合同能安全展示四个分组的状态，但没有 Admin-owned 配置入口来记录 operator 可维护的引用、caller 策略、owner-managed/keep-in-env 分类和 remediation route。

仓库中未发现可直接复用的成熟 secret retain/clear/encrypted settings 模式，因此本 change 不新增 raw secret 保存能力。保存操作只落 copy-safe 的配置引用和策略元数据，用于 UI 回读和 status 摘要增强。

## Decisions

1. 配置合同落在 Application Access owner 上下文，路径使用 `/api/application-access/service-credential-governance-config`，与现有 status endpoint 并列。
2. 鉴权复用 `requireServiceCredentialGovernanceGlobalAdmin()`，仅 `built-in/*` global admin 可读写；未登录和非 global admin fail closed。
3. 配置持久化采用 Admin 本仓库已有 Xorm model/service/store 模式，新增一张轻量记录表保存 JSON 元数据；表内容只包含安全字段，不包含 raw secret。若记录缺失，GET 返回默认分组和 `source=admin_service_credential_governance_config`。
4. POST 只接受稳定分组 key 和白名单字段。未知分组、非法状态、raw secret-like 字段或超过边界的策略值直接拒绝，不做部分保存。
5. Credential reference 只记录 `referenceKey`、`referenceStatus`、`sourceClass`、`ownerManaged`、`keepInEnv` 和 `rotationHint` 等元数据；不得保存 `value`、`token`、`secret`、`authorization`、`cookie`、`dsn`、`privateUrl` 或完整 endpoint。
6. 既有 status endpoint 的 response shape 不变；实现可把配置入口保存的 owner hint、reference status 或 remediation route 合并进分组摘要，但不得移除或重命名旧字段。
7. 前端在 `/applications` 的“服务凭据治理”区块中提供配置入口，采用 AntD 表单/列表/按钮，不做视觉重设计；保存后立即回读脱敏摘要。

## API Shape

`GET /api/application-access/service-credential-governance-config`

响应 `data`:

- `updatedAt`
- `source=admin_service_credential_governance_config`
- `groups[]`
- `groups[].key`
- `groups[].label`
- `groups[].enabled`
- `groups[].owner`
- `groups[].sourceClass`: `admin_config | env_config | external_secret_system`
- `groups[].credentialReferenceStatus`: `configured | missing | external_secret | not_applicable`
- `groups[].credentialReferenceKey`
- `groups[].callerPolicy`
- `groups[].boundedRuntimePolicy`
- `groups[].remediationRoute`
- `groups[].nextAction`
- `groups[].blockedReasons[]`
- `groups[].keepInEnvKeys[]`

`POST /api/application-access/service-credential-governance-config`

请求 `groups[]` 使用同一 copy-safe 字段集合。服务端返回保存后的脱敏 `data`，用于前端回读。

## Persistence And Migration

- 新增对象使用 `owner/name` 主键和 `configJson` 文本字段，跟随现有 `ormer.Engine.Sync2` 自动建表/补表。
- 该表只存 copy-safe 配置元数据，不保存 token、secret、完整 URL 或 provider 响应。
- 这不是大 DB 迁移；如果自动建表在目标环境被禁用，接口应以错误状态返回并由 operator 走既有 DB schema 发布流程。

## Security

- 请求和响应都不得包含 raw secret/token/client secret/Authorization header/Cookie/DSN/private key/完整 private URL/raw ids/raw payload。
- 服务端校验字段名和值，发现 secret-like key 或 secret-like value 直接返回错误，不写入文件。
- POST 不触发 provider request、resolver request、Gateway projection publish/refresh、OIDC/login/WeCom 行为。
- 验证记录、report 和最终回传只记录命令、字段、状态和脱敏结论。

## Validation Plan

- TDD RED 后端测试：读取默认配置、保存并回读、global-admin guard、非管理员拒绝、raw secret-like payload 拒绝且不泄漏、malformed payload fail closed。
- GREEN 后端实现：DTO、归一化/校验、文件读写、GET/POST controller、路由和 authz。
- TDD RED 前端测试：加载配置入口、保存后回读、保存错误、禁用/reference-only/keep-in-env 状态、敏感字段不展示。
- 收口验证：OpenSpec strict、Go focused tests/coverage、前端 focused tests/coverage、TS gate、typecheck、`git diff --check`；如路由/import/build-time 行为受影响则运行 `yarn build`。
