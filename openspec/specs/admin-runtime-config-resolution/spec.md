# admin-runtime-config-resolution Specification

## Purpose
定义 Admin 三组 P0 runtime config 的 typed resolution、来源优先级、credential material 边界、稳定 fail-closed blocker，以及状态与诊断的脱敏契约。
## Requirements
### Requirement: P0 runtime config 必须通过 typed resolver 单一解析

Admin SHALL 为 `usage_identity_resolver`、`insight_provider_trust` 和 `gateway_organization_projection` 分别提供唯一 typed runtime config resolver。每个 resolver SHALL 输出 adopted source、owner、copy-safe credential reference、saved policy、诊断、stable blockers 和 ready 状态，运行调用方、状态接口与 Provider Doctor MUST NOT 再分别推导同一配置的采用来源或 fail-closed 结论。

#### Scenario: 三组配置只有一个最终解析入口

- **WHEN** Admin 的 usage resolver、Insight provider trust、Gateway projection publisher/readiness 或 handoff status/diagnostics 需要读取对应 P0 runtime config
- **THEN** 调用方 SHALL 消费对应 typed resolver 的结果
- **AND** 调用方 MUST NOT 再单独组合 saved policy、legacy env/config 和 credential reference 形成另一套最终决策

#### Scenario: resolver 输出可诊断但不泄密

- **WHEN** typed resolver 返回 ready 或 blocked 结果
- **THEN** resolution SHALL 包含 copy-safe `adoptedSource`、`owner`、`credentialReferenceKey`、`diagnostics`、`blockedReasons` 和稳定 `errorCode`
- **AND** resolution 的可序列化部分 MUST NOT 包含 endpoint、token、secret、Authorization、Cookie、raw payload、raw provider response 或完整私有 URL

### Requirement: Saved source policy 必须优先于 legacy fallback

Admin SHALL 将 saved operator intent 作为 runtime config 的最高决策来源。saved config 存在时 SHALL 按 `manual`、`secretRef` 或 `keep-in-env` 的显式 source policy 解析，只有不存在 saved config 时才可采用 legacy env/config；resolver MUST NOT 依次尝试多个来源直到某个成功。

#### Scenario: 无 saved config 时采用 legacy

- **WHEN** service credential governance config 不存在
- **THEN** resolver SHALL 采用 `legacy_env_config`
- **AND** 已有部署 MAY 继续从对应 legacy env/config key 读取 credential material、caller 和 bounded policy

#### Scenario: Saved keep-in-env 应用 saved policy

- **WHEN** saved group 已启用且 `keepInEnv=true` 或 `sourceClass=env_config`
- **THEN** resolver SHALL 采用 `saved_keep_in_env`
- **AND** credential material SHALL 只由 env/config provider 读取
- **AND** saved caller 与 bounded policy SHALL 覆盖 legacy caller/数值策略

#### Scenario: Saved secretRef 不回落 legacy

- **WHEN** saved group 已启用且 `sourceClass=external_secret_system`
- **THEN** resolver SHALL 采用 `saved_secret_ref` 并只把 copy-safe `credentialReferenceKey` 交给 secret provider
- **AND** reference 缺失、provider 不可用或解析失败时 resolver MUST fail closed
- **AND** resolver MUST NOT 把 reference alias 当作 endpoint/token，也 MUST NOT 回落 legacy env/config

#### Scenario: Saved manual 不把治理记录当凭据

- **WHEN** saved group 已启用且 `sourceClass=admin_config`
- **THEN** resolver SHALL 采用 `saved_manual`
- **AND** credential material SHALL 只由受控 material provider 按 copy-safe reference 提供
- **AND** `ServiceCredentialGovernanceConfig` 中的 metadata MUST NOT 被解释为 endpoint、token 或 secret

#### Scenario: Trust 默认 metadata 不构成 saved runtime intent

- **WHEN** saved `insight_provider_trust` group 仅包含默认 owner/source/caller metadata，且没有被禁用，也没有 `allowedAudiences`、`requiredScopes`、`allowedIssuerDigests` 或 `issuerMode` 字段
- **THEN** typed trust resolver SHALL 继续采用 `legacy_env_config`
- **AND** Admin SHALL 保持现有 default required scope 与 legacy issuer/audience 兼容行为
- **AND** 一旦 group 被显式禁用或出现任一可执行 trust policy 字段，saved policy SHALL 优先且 MUST NOT 回落 legacy

### Requirement: Credential material 必须保持在 env 或 secret provider 边界

Admin SHALL 通过窄 credential material provider 为 typed resolver 提供真实 endpoint/token 等运行材料。默认 provider SHALL 只支持现有 env/config；Admin 数据库、handoff API、Provider Doctor、status、日志和 OpenSpec artifact MUST NOT 持久化或回显 credential material。

#### Scenario: 默认 provider 只读取 env/config

- **WHEN** 未注入 external secret provider 且 resolver 采用 legacy 或 saved keep-in-env
- **THEN** default material provider SHALL 只读取目标 group 的既有 env/config keys
- **AND** provider SHALL 只向进程内 typed config 返回 material

#### Scenario: 未提供 secret provider 时 fail closed

- **WHEN** resolver 采用 saved manual 或 saved secretRef 且没有 provider 可以解析 reference
- **THEN** resolver SHALL 返回 `reference_unresolved` 与 `legacy_disabled` 稳定 blocker
- **AND** resolver MUST NOT 查询 legacy credential 作为替代

#### Scenario: 治理配置保持 copy-safe

- **WHEN** operator 保存或读取 `ServiceCredentialGovernanceConfig`
- **THEN** Admin SHALL 只保存或返回 owner、source class、reference alias、reference status、caller、bounded policy、remediation 和 blocker metadata
- **AND** Admin MUST reject endpoint、token、secret、Authorization、Cookie、raw payload 或完整私有 URL，且错误不得回显被拒绝的值

### Requirement: Missing、invalid、saved unavailable 与 legacy disabled 必须稳定 fail closed

Typed resolver SHALL 对必填配置缺失、显式配置非法、saved config 不可读取、group 禁用、reference 不可解析以及 legacy 被禁止提供稳定 blocker/error code。任何上述状态 MUST 在外部 HTTP 调用或 provider trust 放行前 fail closed。

#### Scenario: 必填配置缺失

- **WHEN** adopted source 缺少目标 group 的必填 credential、caller 或 bounded policy
- **THEN** resolver SHALL 返回 `missing` 或更具体的 stable blocker
- **AND** runtime path MUST NOT 发起外部调用或放行 provider bearer trust

#### Scenario: 显式配置非法

- **WHEN** endpoint 不是受支持的 HTTP(S) URL、saved bounded policy 无法解析或超出目标 group 的安全边界，或 saved trust policy 字段类型/值非法
- **THEN** resolver SHALL 返回 `invalid` 稳定 blocker
- **AND** resolver MUST NOT 静默回默认值或回落其它 credential source

#### Scenario: Legacy 数值配置保持既有默认和归一化

- **WHEN** 无 saved config 且 legacy usage resolver 或 Gateway projection 的 caller/timeout/maxItems/retry/freshness/refresh 数值缺失、不可解析或超出既有归一化边界
- **THEN** typed resolver SHALL 保持改造前的默认值和 normalize 行为
- **AND** 内部重构 MUST NOT 因 legacy 数值输入改变既有 runtime readiness 或对外 reason alias

#### Scenario: Saved config unavailable

- **WHEN** governance config store 返回错误或 saved payload 无法校验
- **THEN** resolver SHALL 返回既有 `admin_service_credential_config_unavailable` 稳定 blocker
- **AND** resolver MUST NOT 读取 legacy credential 继续运行

#### Scenario: Group disabled 或 legacy disabled

- **WHEN** saved group 已禁用，或 saved manual/secretRef 明确禁止 legacy 且对应 provider 无法解析
- **THEN** resolver SHALL 返回 `group_disabled` 或 `legacy_disabled` 稳定 blocker
- **AND** runtime path MUST NOT 使用已配置的 legacy endpoint、token 或 caller

### Requirement: 三条 P0 运行路径必须消费同一 resolution

Usage identity resolver、Insight provider trust 与 Gateway projection 的所有最小运行路径 SHALL 使用各自 typed resolution。Gateway manual publish、scheduled refresh、run readiness、ingestion status 与 observability SHALL 从同一 Gateway publisher resolution 得出 readiness 和 blocker。

#### Scenario: Usage resolver 未 ready 时不创建 HTTP resolver

- **WHEN** usage identity runtime resolution 非 ready
- **THEN** Admin SHALL 在 outbound request 之前停止 resolver path
- **AND** provider scope/current-user SHALL 保持现有 fail-closed mapping 语义

#### Scenario: Provider trust 未 ready 时拒绝 bearer

- **WHEN** Insight provider trust resolution 非 ready、saved policy 禁用或 token audience/issuer/scope 与 adopted policy 不匹配
- **THEN** Admin SHALL 拒绝 provider bearer access
- **AND** Admin MUST NOT 使用 legacy trust policy 覆盖 saved policy 结果

#### Scenario: Gateway 所有入口共享 publisher resolution

- **WHEN** Admin 执行 Gateway projection publish、refresh、run readiness、ingestion status 或 observability
- **THEN** 这些路径 SHALL 使用同一 typed Gateway publisher resolution
- **AND** blocked resolution SHALL 阻止 legacy endpoint/token/caller 被任何入口采用

### Requirement: Handoff API、Provider Doctor、状态与日志必须只暴露 copy-safe resolution

Admin handoff status/diagnostics、Provider Doctor 与相关日志 SHALL 解释实际 adopted source、copy-safe reference、diagnostics 和 stable blockers，并 MUST NOT 暴露 credential material 或完整私有 endpoint。

#### Scenario: 状态解释实际采用来源

- **WHEN** global admin 读取 `GET /api/insight-admin-provider/handoff/status`
- **THEN** 每个 P0 group SHALL 在兼容现有字段的前提下返回实际 `adoptedSource`、copy-safe reference、diagnostics 和 blocked reasons
- **AND** status MUST NOT 仅根据 legacy key 是否存在推断 saved manual/secretRef 已 ready

#### Scenario: Provider Doctor 使用相同 fail-closed 结论

- **WHEN** global admin 调用 `POST /api/insight-admin-provider/handoff/diagnostics` 检查 draft 或 saved metadata
- **THEN** diagnostics SHALL 使用与 runtime resolver 相同的 source policy、required metadata 和 blocker 规则
- **AND** diagnostics SHALL 通过 copy-safe `runtimeBlockedReasons`/`errorCode` 表达无法解析的 manual/secretRef
- **AND** 内部 runtime 结论 MUST NOT 改写既有 metadata preflight `status`、`stableAlias`、`blockedReasons` 或 `cannotInfer` 语义

#### Scenario: API 与日志不泄露敏感材料

- **WHEN** resolver、status、diagnostics、provider audit 或 Gateway producer audit 记录结果
- **THEN** 输出 MAY 包含 group、adopted source、reference alias、stable blocker/error code、count、status 和 duration
- **AND** 输出 MUST NOT 包含 endpoint、token、secret、Authorization、Cookie、raw request/response、raw payload 或完整私有 URL

### Requirement: Typed resolution 必须保持用量链路外部契约等价

Typed resolution SHALL 作为 Admin 内部重构边界，不得修改接入包 schema、secure handoff、Insight/Admin Provider DTO、Profile 启用契约或既有 stable reason alias。Projection blocked/partial MUST NOT 参与 Profile 启用、总览或人员用量授权判断。

#### Scenario: Trust 鉴权语义保持等价

- **WHEN** provider trust 分别使用 legacy、saved enabled、saved disabled 或遇到 saved store unavailable
- **THEN** audience、issuer 和 required scope 的 allow/deny 结果 SHALL 与改造前既有规则一致
- **AND** `current-user` 与 `current-user/scope` SHALL 保持既有 envelope、stable error code 和 no-fallback 行为

#### Scenario: Resolver 映射顺序保持等价

- **WHEN** 用户存在本地 confirmed mapping
- **THEN** Admin SHALL 返回本地映射且 MUST NOT 调用 usage identity resolver
- **WHEN** 本地映射缺失且 resolver ready
- **THEN** Admin SHALL 调用 resolver，并对 unresolved、unavailable、invalid 或 ambiguous 结果保持既有 fail-closed 语义

#### Scenario: Gateway stable alias 与隔离边界保持等价

- **WHEN** Gateway projection publish、readiness、status 或 refresh 消费 typed resolution
- **THEN** 它们 SHALL 共享 adopted source 和 blocker 结论
- **AND** 既有 `invalid_config`、`projection_token_missing`、`publisher_disabled` 等 stable alias 和 DTO SHALL 保持兼容
- **AND** projection blocked/partial MUST NOT 阻止 Profile 启用或改变总览/人员用量结果
