## Why

`/application-usage-access` 已经完成三轮收敛：默认层表达为 `Insight Admin Provider 交接`，交接包包含 Insight Profile 可消费的 copy-safe 字段。但仓库里仍有旧“服务凭据治理 / 旧用量接入配置 / 旧 handoff”用户可见文案、旧 API path 和主规格要求，会把操作者带回“Admin 是用量 provider 配置中心”的旧模型。

本 change 按用户最新口径做 cleanup：Admin 侧以新的 Insight Admin Provider copy-safe handoff / Profile 对齐方案为准，不保留旧 UI 入口和过时后端 surface。

## What Changes

- 将 `/application-usage-access` 默认层和状态/空态文案统一为 `Insight Admin Provider 交接`、copy-safe metadata package、manual/secretRef binding，不再把“服务凭据治理”作为产品入口或默认提示。
- 前端改用新语义 Admin handoff endpoint path；旧 `/api/application-access/service-credential-governance-*` path 稳定拒绝，避免新页面继续依赖旧 Application Access 配置面。
- 保留必要的 Admin owner evidence / copy-safe metadata 数据结构和内部校验逻辑，用于生成 Insight Profile 可消费 package；不删除仍被新 handoff 必需的数据源。
- 更新测试，覆盖旧入口不可见、旧 endpoint 拒绝、新 endpoint 仍返回/保存/诊断 copy-safe 数据、新 package 仍脱敏并包含 Insight Profile 字段。
- 同步 OpenSpec 主规格方向：`应用接入中心` 不再消费服务凭据治理 UI/API；`用量接入` 仅作为 Insight Admin Provider 交接页。

## Capabilities

### New Capabilities

无。

### Modified Capabilities

- `admin-enterprise-identity-usage-access-entry`: 移除旧“服务凭据治理”默认层，固定新页面唯一产品入口和 package 行为。
- `admin-service-credential-owner-boundary`: 将旧 Application Access service-credential-governance API 标记为 deprecated/rejected，并定义新 Insight Admin Provider handoff API surface。
- `admin-enterprise-identity-application-access-center`: 明确 `/applications` 不请求、不渲染旧用量链路治理 UI/API。

## Impact

- Affected frontend: `web-admin/src/ApplicationAccessServiceCredentialGovernancePanel.tsx`、`web-admin/src/backend/ApplicationAccessServiceCredentialGovernanceBackend.ts`、相关测试。
- Affected backend: Admin router/authz/controller 对新旧 handoff/status/config/diagnostic endpoint 的路由和稳定拒绝。
- Affected OpenSpec: usage access、service credential owner boundary、application access center 规格。
- No Admin secure handoff, credential issuer/revoke lifecycle, API/Gateway/Insight contract, secret store, DB migration, or runtime credential value handling changes.
