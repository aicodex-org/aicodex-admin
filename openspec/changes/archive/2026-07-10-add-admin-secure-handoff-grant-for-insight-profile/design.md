# Design

## Scope

本 change 在 Admin 仓库内新增 Admin owner secure handoff 的最小可验证能力。现有 `aicodex.admin.serviceCredentialGovernanceHandoff` copy-safe 包继续作为 metadata 层；新增组合包对齐 Insight common envelope，顶层使用 `schemaVersion: "aicodex.insight.access-package.v1"`、`target: "insight.connection-profile.import"`，包含 `copySafeHandoff` 和 `secureHandoffGrant` 两个明确分层。

## Decisions

1. `secureHandoffGrant` 是短 TTL、一次性、敏感 grant envelope。它可被 operator 复制给 Insight，但不得包含 credential material、完整 secretRef、redeem URL 或 raw owner endpoint。
2. Admin owner grant API 使用固定路径前缀 `/api/insight-admin-provider/handoff/secure-grants`，支持 create、redeem、confirm、fail、revoke、status。Insight 后续只能通过受信 owner registry 决定 endpoint，不能相信包内 URL。
3. P0 最小实现使用 Admin 现有 DB/xorm 模式持久化 grant record，覆盖 TTL、一次性、防重放、audience/workspace/environment/provider/target registration/package hash 校验、nonce/redeemed marker、状态审计和脱敏状态查询。内存 store 仅作为 focused tests 的注入边界保留。
4. `redeem` 响应中的 `credentialMaterial` 只返回给 server-to-server 调用；status、组合包、UI 和普通审计只返回 `credentialSuffix`、`credentialReference`、trace marker 和状态。
5. 前端只复制组合包，不预览 raw credential material，不缓存 secure grant 到 browser storage，不把 manual/env/config 作为默认主路径。

## Safety

- 所有输入输出走敏感字段拦截：token、secret、Authorization、Cookie、DSN、client secret、private key、完整私有 URL、raw payload、真实账号和完整组织树均不得出现在 operator-facing JSON。
- grant status 查询不能作为 credential material 重取通道。
- `confirmed`、`failed`、`revoked`、`expired` 后不得再返回 credential material。
- 错 audience、workspace、environment、provider、target registration、package hash 或 nonce 必须 fail closed。

## Rollout

这是 release-candidate-only change。完成后推送工作分支供主控和 Insight 后续 owner registry/import change 对齐；不 archive、不合入 `hfl-test-base`，不推 `test`。
