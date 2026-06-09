## Why

`aicodex-admin` 已经具备多组织统一认证中心的基础能力，但“不同组织通过 OIDC 登录后，如何稳定映射到 `aicodex-api` 的业务组织和业务用户”仍缺少明确契约。当前如果继续依赖临时属性、人工约定或仅凭宽松 token 语义兼容接入，后续会把跨组织主体唯一性、审计、gateway projection 和下游授权判断建立在不稳定前提上。

本 change 基于已归档的 `define-aicodex-organization-data-and-auth-boundaries` 基线，单独收口 admin 作为统一 IdP 时的多组织 OIDC 接入与 admin/api 映射契约。目标不是重做组织架构主线，而是在标准 OIDC 入口和下游业务租户/用户之间建立可验证、可演进、默认 fail-closed 的稳定边界。

## What Changes

- 新增 admin 多组织 OIDC 到 api 组织/用户映射契约，明确独立 organization client、DCR client 和 shared application 三种接入模式的目标组织表达方式。
- 明确 `id_token`、`access_token` 和 `userinfo` 中 `iss`、`sub`、`aud`、`organization`、`client` 等字段的稳定语义，区分哪些字段可作为稳定主体键，哪些仅作为登录上下文。
- 明确 `admin organization -> api organization UUID` 的权威映射来源、唯一性约束、变更语义、缺失/冲突时的 fail-closed 行为和审计要求。
- 明确 `admin user / external identity -> api user` 的权威映射来源、唯一性约束、映射状态、缺失/冲突时的 fail-closed 行为和审计要求。
- 明确 shared application 模式下必须如何表达目标 organization，以及目标 organization 缺失、歧义或与显式允许范围不一致时的拒绝语义。
- 明确既有 `IsShared`、`clientId-org-*`、`aicodexApiOrganizationId`、`aicodexApiUserId` 等旧口径只能作为迁移输入，不能继续作为长期运行时权威来源。
- 新增独立映射对象、管理入口和迁移任务，将旧散落属性收敛到 `PlatformApiOrganizationMapping` / `PlatformApiUserMapping` 或等价一等对象。
- 要求 token claim 与 userinfo 契约能够支撑跨组织主体唯一性、审计和后续 gateway projection；若现有 claim 不足，必须定义补充字段或额外映射查询契约，不能依赖昵称、手机号、邮箱或人工补录作隐式 join。
- 要求 proposal、design、spec、fixture、verification 和联调脚本全部脱敏，禁止写入真实地址、内网 IP、token、cookie、账号、客户端密钥或客户真实数据。
- 不通过兼容性补丁延续旧口径；对不稳定映射、歧义 organization 或 claim 不足场景统一采用 fail-closed，而不是回退到更宽松的默认组织、默认用户或弱标识匹配。

## Capabilities

### New Capabilities

- `admin-oidc-multitenant-api-mapping-contract`: 定义 `aicodex-admin` 作为统一 IdP 时，多组织 OIDC client / DCR / shared application 的组织表达、token claim 语义、userinfo 语义、admin 到 api 组织/用户稳定映射、fail-closed 规则和脱敏验证边界。

### Modified Capabilities

- `admin-login-entry-routing`: 将显式授权入口扩展为区分 organization-scoped client 与 shared application 的目标组织解析语义，并要求目标 organization 缺失、歧义或越权时拒绝继续登录。
- `admin-organization-master-model`: 补充平台组织与平台用户到 `aicodex-api` 组织 UUID / 用户 ID 的权威映射来源、映射状态、唯一性和审计要求，使 OIDC 登录上下文与后续稳定主体映射口径一致。

## Impact

- 影响 `aicodex-admin` 的 OAuth/OIDC 授权入口、DCR / application 归属模型、token / userinfo 语义、组织与用户映射模型、审计日志和联调验证材料。
- 影响 `aicodex-api` 作为消费方的接入前提：后续必须按本契约校验 `iss` / `aud` / `sub` / organization 语义，并在映射缺失或 claim 不足时 fail-closed；但本 change 不实现 `aicodex-api` 侧业务代码。
- 影响后续 `admin-gateway-organization-projection-publisher` 和 gateway authorization projection 的输入假设：稳定主体和组织映射不能再依赖弱标识或人工口径。
- 影响测试与文档要求：必须补充脱敏 fixture、token claim 样例、shared application 负例和映射失败负例。
- 不重做组织主模型总方案，不实现 gateway 权限矩阵，不恢复 insight 报表，不把真实环境信息写入仓库。
