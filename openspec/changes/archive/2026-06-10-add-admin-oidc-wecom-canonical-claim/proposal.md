## Why

`aicodex-api` 需要从已验签的 OIDC `id_token` 中读取企业微信稳定身份，用于后续用户绑定和迁移。当前 `sub` 已稳定表示 admin subject，不能被替换为企业微信或 API 业务用户标识，因此需要新增一个标准签名 claim 承载企业微信 canonical identity。

## What Changes

- 在 JWT-Standard `id_token` 签发路径新增标准 claim `wecom_canonical_id`。
- 内部企业微信成员且同时具备 `corp_id` 与 `userid` 时输出 `wecom:<corp_id>:<userid>`。
- 当前登录身份不是企业微信，或缺少 `corp_id` / `userid` 时不输出该 claim；不得使用手机号、邮箱、姓名、昵称等弱资料字段拼接。
- 更新 OIDC discovery `claims_supported`，声明 `wecom_canonical_id`。
- 更新脱敏 fixture / 文档，说明 `sub` 仍是稳定 admin subject，`wecom_canonical_id` 仅用于 API 侧绑定/迁移。

## 能力范围

### 新增能力

无。

### 修改能力

- `admin-oidc-multitenant-api-mapping-contract`: 在标准 OIDC token 契约中新增已签名的企业微信 canonical identity claim。

## 影响范围

- 影响 Go 后端 `admin/object` 下的 JWT-Standard token claims 与 OIDC discovery metadata。
- 影响 OIDC 下游契约：`aicodex-api` 可优先消费 `wecom_canonical_id`，但 `id_token.sub` 仍保持稳定 admin subject。
- 不修改 `aicodex-api` 仓库，不引入长期双轨 subject，不新增弱字段 fallback。
