## Why

Admin secure handoff 当前兑换出的 `adm-*` 随机材料只存在于 grant record，不是 OAuth token，也没有 Admin Provider 的专用验证契约。`AutoSigninFilter` 会先把所有 Bearer 当作 OAuth access token 查询数据库，因此真实 Profile connectivity probe 在到达 Provider controller 前被通用 HTTP 200 错误吞掉。现有一次性交接流程虽然能 redeem/confirm，却不能交付可实际调用 `current-user`、`scope` 和 `organization-tree` 的运行态凭据。

## What Changes

- 将默认 secure-handoff issuer 产出的随机占位材料替换为受 issuer、audience、scope、subject、target registration/workspace/environment/provider 与独立 expiry 约束的 Admin Provider runtime credential。
- grant redeem 后只持久化 credential verifier，不保留可重取的 raw material；confirm 后 runtime credential 继续可验证，grant revoke/closed state、runtime expiry 与凭据篡改均 fail closed。
- 在 `AutoSigninFilter` 内为三个明确的 Insight Admin Provider 路径增加专用 Bearer 分流：运行凭据必须完成 grant/verifier/target/expiry/scope 验证，普通 JWT 继续由 Provider controller 的既有签名验证处理；其它路径仍走现有 OAuth token 行为。
- Provider controller 从 request context 接收已验证的 handoff 身份，并继续使用 typed `insight_provider_trust` resolution 校验 audience、issuer 和 required scopes；saved disabled、store unavailable、invalid policy 不回退 legacy 配置。
- 全局管理员生成接入包时必须从 Admin 已存在的非 `built-in` 业务组织中显式选择 target organization；Admin 在持久化package binding、runtime credential claims和验证后的auth context中绑定该组织，不能从Insight query、workspace alias或创建者`Owner`推断。
- `current-user` 在创建者个人用量映射为 `MISSING`（包括 saved resolver unavailable 且只能确认 `MISSING`）时返回 HTTP 200 诊断 envelope；`INVALID`、`AMBIGUOUS`、认证或 typed trust 失败继续 fail closed。
- `current-user`、`scope` 和 `organization-tree` 对 handoff credential 统一使用已验证 target organization；普通 JWT/session 的既有组织选择行为保持不变，handoff 请求中的 query 不能覆盖 credential target。
- Provider 路径的错误 Bearer 返回稳定 HTTP 401/403 `InsightProviderEnvelope`，不再被通用 filter 转换成 HTTP 200 泛化 JSON。
- 以完整 Beego router/filter → Provider controller 测试覆盖 redeem material 成功调用、错误/过期/撤销/篡改 target 拒绝与 typed trust fail-closed。

## Capabilities

### New Capabilities

无。

### Modified Capabilities

- `admin-secure-handoff-grant`: secure handoff redeem material 成为可撤销、可过期、绑定目标与身份的 Admin Provider runtime credential，同时保持一次兑换和 operator-facing 脱敏。
- `insight-admin-provider-wrapper`: 三个 Provider 路径接受经专用 filter 验证的 handoff credential，并对无效 Bearer 返回稳定 401/403 envelope，继续服从 typed trust policy。

## Impact

- 后端：`admin/object/admin_secure_handoff_grant.go` 及测试、`admin/routers/auto_signin_filter.go` 及新增 router 集成测试、`admin/controllers/application_access_admin_secure_handoff_grant.go`、`admin/controllers/insight_provider.go` 及聚焦测试。
- 数据：不修改已发布 AICodex-owned schema manifest、registry、migration或`ormer.go`。target organization进入v2 credential claims，接入包`packageHash`同时绑定copy-safe metadata与target，redeem后的exact verifier保证claims不可篡改；现有server-only `CredentialMaterial`仍只保存单向verifier digest。
- 前端：接入包面板复用现有组织列表 API 和 AntD Select，提供 loading、empty、error、无可用业务组织与提交中状态；不允许自由输入或静默选择 `built-in`。
- 兼容：不修改 Provider 路径、nonce、grant TTL、one-time redeem/confirm 或 typed runtime config resolution；接入包新增 copy-safe target organization alias，旧包不会被静默解释为 `built-in`，必须重新生成。
- 交付：先推送 release-candidate 工作分支并在获准的 60 Admin 做脱敏 smoke；未获主控验收前不 archive、不合入 `hfl-test-base`，不操作 `test`。
