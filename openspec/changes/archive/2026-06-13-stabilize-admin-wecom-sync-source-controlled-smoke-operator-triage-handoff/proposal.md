## Why

Admin WeCom source 路线已经具备 controlled smoke execution handoff、result evidence handoff 和 operator remediation handoff，但值班 operator 仍缺少一个本地、脱敏、可复制的 triage package。当前材料分散在 result/remediation evidence 中，容易被误写成真实 WeCom 同步成功、组织树非空、Gateway/API/Insight 成功或 full-success。

## What Changes

- 新增 Admin-owned WeCom source controlled smoke operator triage handoff，用本地脱敏 result evidence handoff 与 operator remediation handoff 生成 operator 可执行 package。
- 输出稳定 `status`：`ready-for-operator-triage-handoff`、`blocked`、`needs-user-action` 或 `hard-red-line`，并保留 `blockerAlias`、`remediationAlias`、`nextSteps`、`ownerHandoffLimits`、`minimumUnblockConditions`、`doNotDispatchUntil` 和 `cannotInferBoundaries`。
- 对真实 WeCom 同步、真实 fixture/DB、Gateway/API/Insight 成功、authorization facts、生产就绪、敏感字段、真实密钥、full-success 或跨 owner 成功外推执行 fail closed。
- 新增 Node helper/test、Bruno local-only 入口和 operator README 说明。Bruno pre-request 输出本地脱敏 triage package 后主动中止网络请求，避免误连真实环境。
- 同步 `wecom-organization-sync` spec，明确 operator triage handoff 只表示 Admin 本地脱敏交接包可用于值班分流，不能证明真实同步、组织树非空、下游成功、生产就绪或 full-success。

## Capabilities

### New Capabilities

### Modified Capabilities
- `wecom-organization-sync`: 增加 Admin WeCom source controlled smoke operator triage handoff 的本地脱敏交接要求。

## Impact

- 影响范围限定在 `aicodex-admin` 的 WeCom Bruno 本地入口、Node helper/test、operator README 和 OpenSpec artifacts。
- 不修改 API、Insight、Gateway 仓库或跨 owner 代码。
- 不触发真实 WeCom 同步、不写真实 fixture、不查询或写真实 DB、不启用真实 gate、不提交真实密钥或生产/类生产配置。
