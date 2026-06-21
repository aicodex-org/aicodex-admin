## Context

当前 Admin 服务凭据治理链路分为三层：

- `service-credential-governance-config`：保存 copy-safe 配置引用、caller policy 和 bounded runtime policy。
- `service-credential-governance-status`：读取 legacy env/config 并叠加 saved config，输出脱敏状态。
- runtime path：`usage_identity_resolver` 和 `gateway_organization_projection` 仍直接读取 legacy env/config。

本 change 只补齐第三层 runtime gate。它不引入新的 secret 解析能力，因此 saved config 只能在明确允许 env/config 时继续读取 legacy secret；其它 source class 必须 fail-closed。

## Decisions

### 1. 用小 helper 统一 saved policy 判定

在 Admin 后端新增小而明确的 runtime policy helper，负责读取 `ServiceCredentialGovernanceConfigService.GetConfig()` 并对指定分组生成 gate 结果。

helper 的职责只包含：

- 判断是否存在显式 saved config。
- 区分 legacy fallback、disabled、env/config allowed、unresolved external/admin reference、metadata missing。
- 输出 copy-safe blocker aliases 和 caller/bounded policy overlay。

helper 不负责：

- 解析 secret。
- 调用外部 provider。
- 保存配置。
- 触发 Gateway projection。

### 2. 无 saved config 时保持 legacy fallback

`ServiceCredentialGovernanceConfigResponse.IsConfigured=false` 表示未保存过治理配置。此时 runtime path 使用现有 env/config 逻辑，避免升级后立即改变部署行为。

### 3. saved config 存在后必须以 saved group 为准

一旦 `IsConfigured=true`：

- `enabled=false` 表示显式禁用，runtime MUST fail closed。
- `sourceClass=env_config` 或 `keepInEnv=true` 表示部署仍把 secret 留在 env/config，runtime MAY 读取 legacy endpoint/token，但 saved caller/bounded policy 覆盖默认值。
- `sourceClass=external_secret_system` 或 `admin_config` 表示 secret 不应从 legacy env/config 偷偷回退；在 Admin 尚无 resolver 时 runtime MUST fail closed。
- 缺少 `credentialReferenceKey`、`callerPolicy` 或必要 bounded runtime policy 时 runtime MUST fail closed，并暴露稳定 blocker。

### 4. bounded runtime policy 只约束低敏运行参数

允许 overlay 的值保持 copy-safe：

- usage resolver：`maxItems`、`timeoutMs`
- Gateway projection：`timeoutMs`、`freshnessTTLSeconds`、`maxRetries`

这些值必须继续经过既有 normalize 边界处理。Endpoint/token/status endpoint 仍只能来自 legacy env/config 或未来 secret resolver，不从 saved copy-safe metadata 直接生成。

## Security

- runtime gate 和 diagnostics 只返回 stable aliases、key names、source class、caller、数值策略。
- 不输出完整 endpoint、token、Authorization header、Cookie、DSN、client secret、raw payload/raw id 或完整私有 URL。
- `credentialReferenceKey` 只作为引用别名，不作为 URL/token 使用。
- saved config 不能绕过 existing global-admin-only config endpoint；runtime 只读取已保存配置。

## Verification

- OpenSpec target strict 和 changes/specs strict。
- RED/GREEN focused Go tests：
  - usage resolver：no saved fallback、disabled fail-closed、unresolved reference fail-closed、env_config overlay。
- Gateway projection：no saved fallback、disabled fail-closed、unresolved reference fail-closed、env_config overlay，以及 readiness/observability 通过统一 gated config。
- status/diagnostic：blocker aliases 脱敏，不泄漏 endpoint/token。
- `git diff --check`。
- 如未改前端，web-admin TypeScript gate/typecheck 标记 N/A。
