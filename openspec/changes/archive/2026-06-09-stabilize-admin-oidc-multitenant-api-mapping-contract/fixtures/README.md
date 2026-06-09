# 脱敏联调契约样例

本目录只保存 synthetic 数据，用于说明 `aicodex-admin` 作为统一 IdP 时，多组织 OIDC 接入到 `aicodex-api` 业务组织/用户映射的期望形态。

- `issuer` 使用 `https://admin.example.invalid`。
- `client_id` 使用 `client-api-synthetic`。
- platform organization 使用 `org-alpha` / `org-beta`。
- admin subject 使用 `org-alpha/alice`。
- api organization/user 使用 synthetic ID。
- 不包含真实 endpoint、内网 IP、账号、token、cookie、client secret 或客户数据。

## 关键约束

- shared application authorize 请求必须显式携带 `organization`。
- `id_token.sub` / `userinfo.sub` 是 canonical issuer 内稳定 admin subject。
- `aud` 标识 client 或资源受众，不承载 organization。
- `apiOrganizationId` / `apiUserId` 来自一等 mapping object；旧属性和 ExternalIdentity lineage 只作为迁移候选。
- mapping 缺失、冲突、待审或禁用时，授权入口和后续 projection 必须 fail closed。
