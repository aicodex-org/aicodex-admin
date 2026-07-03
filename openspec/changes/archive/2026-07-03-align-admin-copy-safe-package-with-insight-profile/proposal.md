## Why

Admin 侧 `生成 Admin 交接包` 当前已经是 copy-safe metadata，但包内容主要停留在 owner evidence `groups[]`，Insight Connection Profile 导入时仍需要从非标准字段推断 Admin component、wrapper 能力、凭据引用状态和下一步动作。当前 P0 要把“部分缺失 / 补充 resolver 凭据引用 / Gateway 组织投影不可用”等状态用稳定字段交给 Insight，而不是继续做 UI 小修或 Admin secure handoff。

## What Changes

- 扩展 Admin copy-safe handoff package 的前端生成结果，保留既有 `groups[]`，新增 Insight Profile 可消费的 Admin component / wrapper capability / credential binding guidance 摘要字段。
- 让包显式携带 `schema`、`version`、`source`、`generatedAt`、`targetConsumerAlias`、`adminOwnerAlias`、固定 wrapper capability readiness、`credentialReferenceStatus`、`credentialReferenceKeySummary`、`resolverCredentialReference`、`boundedRuntimePolicy`、`stableAliases`、`blockedAliases`、`nextAction`、`cannotInferRuntimeTruth` 和 `keepInEnv` 等 copy-safe 字段。
- 页面点击 `生成 Admin 交接包` 时使用已脱敏配置和状态一起生成包，避免交接包缺少 secretRef/manual binding 所需的凭据引用摘要。
- 补充 ready / partial / missing、脱敏和复制包测试，确保包不含 token、secret、Authorization、Cookie、DSN、client secret、完整私有 URL、raw payload、raw id、真实账号或完整组织树。
- 不实现 Admin secure handoff，不新增凭据签发/撤销生命周期，不修改 API/Gateway/Insight contract，也不把 Admin 页面变成用量 provider 配置中心。

## Capabilities

### New Capabilities

无。

### Modified Capabilities

- `admin-enterprise-identity-usage-access-entry`: 固定 Admin copy-safe handoff package 与 Insight Connection Profile 草稿导入所需字段、脱敏边界和 nextAction/reason code 语义。

## Impact

- Affected UI/frontend logic: `web-admin/src/ApplicationAccessServiceCredentialGovernancePanel.tsx`、`web-admin/src/backend/ApplicationAccessServiceCredentialGovernanceBackend.ts`。
- Affected tests: `web-admin/src/ApplicationUsageAccessPage.test.tsx`、`web-admin/src/ApplicationAccessCenter.test.tsx`。
- Affected OpenSpec: `admin-enterprise-identity-usage-access-entry` delta。
- No backend route, database, API/Gateway, Insight, secure handoff, secret store, or credential lifecycle changes.
