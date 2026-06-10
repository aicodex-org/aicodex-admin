# 脱敏 OIDC 企业微信 canonical claim 样例

本目录只保存 synthetic 数据，用于说明 `aicodex-admin` 在标准 OIDC `id_token` 中输出企业微信 canonical identity claim 的契约。

- issuer 使用 `https://admin.example.invalid`。
- client 使用 `client-api-synthetic`。
- platform organization 使用 `org-alpha`。
- 企业微信 corp 使用 `corp-alpha`。
- admin subject 使用 `org-alpha/alice`。
- 企业微信内部成员 userid 使用 `alice`。

## 关键约束

- `id_token.sub` 仍表示稳定 admin subject，不替换为企业微信身份或 `apiUserId`。
- `wecom_canonical_id` 来自已签名 id_token，格式为 `wecom:<corp_id>:<userid>`。
- 缺少 `corp_id` 或 `userid` 时不输出 `wecom_canonical_id`。
- UserInfo、email、username、nickname、phone、display name 等弱资料字段不能替代该 claim。
- 本次不支持企业微信外部联系人；`external_userid` 不能混用内部成员 `userid` 前缀。
- 本目录不包含真实 endpoint、内网 IP、token、cookie、账号或 client secret。
