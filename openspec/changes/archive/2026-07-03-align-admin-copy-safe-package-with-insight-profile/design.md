## Context

Admin 的 `用量接入 / Admin Provider` 页面已经对齐为 copy-safe 交接页，默认层展示交接状态、能力状态和 `生成 Admin 交接包` 主动作。现有包 builder `buildServiceCredentialGovernanceHandoffPackage` 已具备脱敏、防 URL/secret/raw 字段输出和 `groups[]` owner evidence 摘要，但 Profile 导入闭环需要更标准的 component 级字段：Insight 要能识别 Admin component、三条固定 wrapper 能力、resolver/Gateway projection 凭据引用状态、manual/secretRef binding 下一步和 fail-closed reason alias。

本 change 只改 Admin 前端可复制包生成结果和测试；不新增后端 endpoint，不修改 Admin secure handoff，不让 Admin 决定 Insight Profile 激活策略。Insight 仍是 Profile、provider registry、capability policy、Dry-run 和全局 Provider Doctor 的 runtime owner。

## Goals / Non-Goals

**Goals:**

- 让 Admin copy-safe package 同时保留既有 `groups[]` 并新增 `insightProfile` 摘要，便于 Insight Profile 草稿直接读取 Admin component metadata。
- 固定三条 wrapper capability 的稳定 alias、route alias 和 readiness，表达 `current-user`、`scope`、`organization-tree` wrapper 已可作为 metadata 交接能力。
- 从现有治理组推导 `resolverCredentialReference`、Gateway projection component、`credentialReferenceStatus`、`credentialReferenceKeySummary`、`boundedRuntimePolicy`、`stableAliases`、`blockedAliases`、`nextAction`、`cannotInferRuntimeTruth` 和 `keepInEnv`。
- 页面生成包时传入已脱敏 config + normalized status，确保 package 包含 manual/secretRef binding 所需摘要。
- 继续保证复制包不包含 token、secret、Authorization、Cookie、DSN、client secret、完整私有 URL、raw payload、raw id、真实账号或完整组织树。

**Non-Goals:**

- 不实现 Admin secure handoff、grant、credential issuer、revoke、receiver registration 或审计生命周期。
- 不新增后端字段或修改 `/api/application-access/service-credential-governance-*` contract。
- 不修改 API/Gateway/Insight contract，不实现 Insight Profile 导入端。
- 不把 Admin UI 改成 API/Gateway 用量 provider 配置中心。

## Decisions

### Decision: 在现有包中新增 `insightProfile` 摘要，而不是替换 `groups[]`

保留 `groups[]` 能避免破坏既有 Admin owner evidence 消费和测试；新增 `insightProfile` 只提供 Profile 草稿导入所需的稳定聚合视图。这样改动小、可回滚，也避免在 Admin 侧引入胖 schema。

### Decision: 使用现有 config/status/diagnostic 推导字段

`insightProfile` 只从 `ServiceCredentialGovernanceConfigResponse`、`ServiceCredentialGovernanceStatusResponse`、`ServiceCredentialGovernanceDiagnosticResponse` 及固定 wrapper 常量推导。页面传入已脱敏 config；builder 再做第二层脱敏。这样不需要后端扩展，也不把 Admin 变成新的 truth source。

### Decision: reason code 使用 blocked/stable alias 的 copy-safe 集合

Insight P0 需要能判断 nextAction，但 Admin 不应输出 raw payload 或内部诊断细节。包内使用 `stableAliases` / `blockedAliases` 作为稳定 reason aliases，并对 missing resolver / Gateway projection 补充明确 alias，例如 `admin_service_credential_reference_missing`、`admin_profile_manual_secret_ref_binding_required`。

### Decision: Base URL 只用 route alias

三条 wrapper 能力在包里只输出固定 route alias/path，不输出完整 Admin private URL 或 base URL。Insight 侧后续通过本地 registry 或已知 Admin owner locator 解析实际访问地址。

## Risks / Trade-offs

- [Risk] 新增 `insightProfile` 字段可能被误读为 runtime success。→ 字段命名和文案保持 `copy_safe_handoff`、`manual/secretRef binding required`、`ownerEvidence`，并保留 `cannotInferRuntimeTruth`。
- [Risk] Admin 侧字段与 Insight 后续实现可能仍有轻微差异。→ 只使用总控 OpenSpec 已确认的通用字段名，不新增未来 Profile 管理复杂字段。
- [Risk] 页面生成包传入 config 后可能输出敏感引用。→ config 已在页面加载时 sanitize，builder 内也继续用 `getSafeHandoffText` / `getSafeHandoffRuntimePolicy` 二次过滤，并补测试覆盖 URL、token、raw id。
