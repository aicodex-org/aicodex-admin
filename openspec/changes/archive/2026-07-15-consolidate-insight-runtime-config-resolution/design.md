## Context

最新基线中，Admin 有 47 个 Go 文件直接读取 `conf.GetConfig*`，但本 change 只治理当前 P0 的三组配置。现有 `ServiceCredentialRuntimePolicyDecision` 已能读取 saved governance metadata 并阻止部分 legacy fallback，不过最终 endpoint/token/caller/数值策略仍由 usage resolver、Gateway publisher 和 Insight provider trust 各自解析；handoff status/diagnostics 又分别重建一次 legacy/saved 状态。结果是同一配置在运行路径、Provider Doctor 和状态接口中可能采用不同来源或 blocker。

`ServiceCredentialGovernanceConfig` 的安全边界已经明确：数据库只保存 owner、source class、credential reference alias、caller 和 bounded policy 等 copy-safe metadata，不保存 endpoint、token、secret、完整私有 URL 或 raw payload。真实 credential material 仍必须来自 env/config 或受控 secret provider。

## Goals / Non-Goals

**Goals:**

- 为 `usage_identity_resolver`、`insight_provider_trust`、`gateway_organization_projection` 各提供一个 typed resolution 入口。
- 统一输出 ready、adopted source、owner、copy-safe reference、saved policy、diagnostics、blockers 与稳定 error code。
- 明确 saved manual、saved secretRef、saved keep-in-env 和无 saved config 时 legacy 的采用规则，任何无法确定的状态均 fail closed。
- 让运行路径、handoff status 和 diagnostics 使用相同解析结果，并保持对外输出脱敏。
- 保留未保存治理配置的现有部署兼容；legacy caller、timeout、maxItems 和 Gateway 数值策略继续沿用既有默认/归一化，仅 saved bounded policy 或不可执行 material 的非法状态 fail closed。

**Non-Goals:**

- 不建设全仓配置中心，不迁移其余 `conf.GetConfig*` 调用。
- 不建设 Admin secret CRUD、secret 加密存储、轮换或跨 repo credential contract。
- 不修改数据库 schema、Go fixture、前端构建工具、真实认证链路或测试/生产环境配置。
- 不改变 Gateway/API/Insight truth owner，也不把 Admin producer diagnostics 当作下游授权事实。

## Decisions

### 1. 采用“共享 resolution metadata + 三个 typed config”边界

在 `admin/object` 建立共享 `ServiceCredentialRuntimeResolution`，只保存 group key、ready、adopted source、owner、copy-safe reference、diagnostics、blockers 和 error code；credential material 字段位于三组 typed config 中并标记为不可 JSON 序列化。三组 resolver 分别负责自身必填字段、数值范围和默认值，调用方不再二次读取或解析同一配置。

选择该方案而不是只扩展现有 boolean gate，是因为 boolean 无法解释实际来源、invalid/missing 差异或稳定 blocker；也不选择全仓 config registry，因为本 change 的验收只覆盖三个 P0 路径，扩展到全仓会引入大面积兼容风险。

### 2. saved intent 优先，legacy 只在明确允许时采用

解析顺序按下列规则执行：

1. saved config store 错误或持久化内容非法：返回既有稳定码 `admin_service_credential_config_unavailable`，不读取 legacy。
2. saved config 存在时，目标 group 必须存在且 enabled；否则 fail closed。
3. `keepInEnv=true` 或 `sourceClass=env_config`：采用 `saved_keep_in_env`，credential material 由 env provider 读取，同时应用 saved caller/bounded policy。
4. `sourceClass=external_secret_system`：采用 `saved_secret_ref`，只把 `credentialReferenceKey` 传给注入的 secret provider；未提供或解析失败时返回 `reference_unresolved`，不回落 legacy。
5. `sourceClass=admin_config`：采用 `saved_manual`，同样只能由注入的 material provider 按 copy-safe reference 解析；Admin 数据库记录本身绝不作为 credential material。
6. 仅当没有 saved config 时采用 `legacy_env_config`。缺失必填值、显式非法值或显式禁止 legacy 时 fail closed。

这里的“优先级”是 saved operator intent 对 legacy 的优先级，不允许同时尝试多种来源直到某个成功；这避免错误配置被隐式 legacy fallback 掩盖。

`insight_provider_trust` 保留既有兼容例外：默认 governance group metadata 不等于可执行 trust policy。只有 group 被显式 disabled，或 `boundedRuntimePolicy` 出现 `allowedAudiences`、`requiredScopes`、`allowedIssuerDigests`、`issuerMode` 中至少一个字段时，才形成 saved trust intent；否则 typed trust resolver 继续采用 legacy trust 配置。

### 2.1 影响等级与外部契约等价门禁

- `insight_provider_trust` 为高影响：legacy/saved enabled/saved disabled/store unavailable 均需回归 audience、issuer、required scope；`current-user` 与 `current-user/scope` 的鉴权 envelope 和 stable error code 不变。
- `usage_identity_resolver` 为中高影响：本地 confirmed mapping 永远优先，只有缺本地映射才调用 resolver；unresolved、transport 或非确定映射继续 fail closed，timeout/maxItems/caller 默认与归一化不变。
- `gateway_organization_projection` 为中影响：publish、readiness、ingestion status、refresh 与 observability 共享 resolution，但既有 `invalid_config`、`projection_token_missing`、`publisher_disabled` 等 stable alias 和 DTO 字段继续保留；新增 resolution 只能作为 optional copy-safe 诊断。
- projection blocked/partial 只影响 Admin projection producer 路径，不得参与 Profile 启用、总览或人员用量授权判断。

### 3. credential material provider 是窄接口，默认只实现 env/config

resolver 依赖可注入的 material provider。默认实现只读取三个 P0 group 已有的 env/config keys；manual/secretRef provider 作为运行时注入边界存在，但本 change 不实现 secret 存储或外部 Vault/KMS 客户端。默认部署遇到 saved manual/secretRef 时稳定返回 unresolved blocker。

测试使用内存 provider 验证 manual/secretRef 成功与失败路径，证明接口可以承载真实 material，而不把 secret 写入治理配置、响应、日志或 fixture。

### 4. 稳定 blocker/error code 由 resolver 产生，调用方只消费

共享 blocker 至少覆盖：`admin_runtime_config_missing`、`admin_runtime_config_invalid`、既有 `admin_service_credential_config_unavailable`、group disabled、reference missing/unresolved、`admin_runtime_config_legacy_disabled`、caller policy missing 和 bounded policy missing。每次 resolution 的 `ErrorCode` 取第一个稳定 blocker，`BlockedReasons` 保留去重后的完整原因；运行路径不得用原始错误文本替代稳定 code。

usage resolver 在未 ready 时不创建 HTTP resolver；Insight provider trust 在未 ready 时拒绝 bearer trust；Gateway publisher、manual publish、scheduled refresh、run readiness 和 ingestion status 继续通过同一个 publisher config 获得 blocker。

### 5. 状态和 Provider Doctor 只投影 copy-safe resolution

handoff status group 增加兼容性的 `adoptedSource`、`credentialReferenceKey` 和 `diagnostics` 等可选字段，并从 typed resolution 生成 configured/missing/blocked 摘要。diagnostics 对 draft/saved config 执行同一 policy resolution，但只返回 source、reference alias、stable blocker 和 remediation，不返回 material provider 读取到的任何值。

日志只允许记录 group、source、ready、stable error code、计数和耗时。endpoint、token、secret、Authorization、raw request/response 与完整私有 URL 在任何状态、错误和审计结构中均无字段承载。

## Risks / Trade-offs

- [默认实现无法解析 saved manual/secretRef] → 明确返回 `reference_unresolved` 和 `legacy_disabled`，由后续受控 secret provider 注入解除；不以 legacy fallback 伪装成功。
- [typed parser 可能改变 legacy 默认/归一化] → legacy caller、timeout、maxItems、retry、freshness 与 refresh 数值保持原 fallback/normalize；仅 saved bounded policy 类型错误或越界返回 invalid blocker，并用迁移前后等价测试锁定。
- [object 与 controller 间已有常量/辅助函数] → 只迁移三组配置解析职责，HTTP 调用与 provider 授权业务仍留在原模块，避免无关重构。
- [status response 增加字段可能影响旧 consumer] → 仅增加 optional copy-safe 字段，不删除或改名现有字段；原有 key/status 语义继续保留。
- [object/controller package 较大导致 package 平均覆盖率低] → 运行受影响 package 测试，并通过 coverprofile 单独核算本 change 实施文件的 changed-file coverage，目标不低于 85%。

## Migration Plan

1. 先新增 resolver contract、默认 provider 与单元测试，不改调用方。
2. 逐组迁移 usage resolver、Insight provider trust、Gateway publisher，再迁移 status/diagnostics；每组保持 RED/GREEN 验证。
3. 在本地使用 legacy env fixture 验证无 saved config 兼容，并用内存 provider 验证 manual/secretRef；不调用真实外部链路。
4. 发布时不需要 schema migration。回滚可恢复到原调用方实现；新增 saved metadata 仍为 copy-safe 且不会包含 credential material。
5. RC 只记录部署后 60 验收清单，不在本地伪造真实链路；合入/部署后再验证 `current-user`、`current-user/scope` 和 Insight 五类用量请求，并使用脱敏证据回传。

## Open Questions

无。本 change 不决定具体 Vault/KMS/secretRef 实现；该实现必须在独立 change 中绑定明确 provider 和运行环境后再设计。
