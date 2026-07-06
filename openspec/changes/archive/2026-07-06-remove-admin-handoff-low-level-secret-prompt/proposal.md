## Why

60 环境 post-deploy spot 显示 Admin `Insight Admin Provider 交接` 默认层仍出现 `部署 Secret 或外部 secret system`。这类底层落点提示容易把实施人员带回 `.env`、K8s Secret、Vault/KMS 或外部 secret system 运维路径，不符合当前 Profile / 凭据交接主线“导入、绑定、验证、激活”的低运维默认路径。

Admin P0 边界不变：Admin 只生成 copy-safe metadata，不保存 raw secret，不实现 Admin secure handoff，也不成为 Admin secret 管理中心。默认 UI 只需要清楚表达：生成 Admin 交接包后导入 Insight Profile，并在 Insight 通过 manual/secretRef binding 绑定 resolver 凭据。

## What Changes

- 收敛 Admin handoff partial/missing 默认层文案，移除 `部署 Secret`、`外部 secret system`、`.env`、`K8s Secret`、`Vault/KMS` 等底层落点主叙事。
- 默认层保留唯一主 CTA `生成 Admin 交接包`，并将下一步指向 `导入 Insight Profile` 与 Insight manual/secretRef binding。
- 诊断或技术说明如需保留底层 secret 落点解释，也必须默认隐藏，不作为首屏主提示。
- 不改后端 contract，不新增 API，不改 API/Gateway/Insight。

## Capabilities

### Modified Capabilities

- `admin-enterprise-identity-usage-access-entry`: 收敛 `用量接入 / Admin Provider` 默认层缺凭据引用提示，使其只表达 copy-safe handoff 和 Insight binding 主路径。

## Impact

- 影响 `web-admin/src/ApplicationAccessServiceCredentialGovernancePanel.tsx` 默认层 fallback 文案。
- 影响 zh/en locale 和 `ApplicationUsageAccessPage.test.tsx` 断言。
- 不改变 copy-safe package schema、owner evidence、wrapper route、后端接口或任何真实凭据生命周期。
