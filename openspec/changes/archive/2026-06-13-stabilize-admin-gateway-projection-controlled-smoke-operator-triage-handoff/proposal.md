## Why

Admin gateway projection controlled smoke 路线已经具备 release runbook、execution handoff、result evidence handoff 和 release summary handoff，但后续值班 operator 还缺少一个本地、脱敏、可复制的 triage package。当前 release summary/result evidence 已能表达局部状态，但没有统一输出下一步动作、稳定 blocker alias、最小解除条件和不能外推边界，容易被误写成真实 controlled smoke pass、full-success 或跨 owner 成功。

## What Changes

- 新增 Admin-owned controlled smoke operator triage handoff，用本地脱敏 release summary handoff 和 result evidence handoff 生成 operator 可执行 triage package。
- 输出稳定 `status`：`ready-for-operator-triage-handoff`、`blocked`、`needs-user-action` 或 `hard-red-line`，并保留 `blockerAlias`、`remediationAlias`、`nextSteps`、`ownerHandoffLimits`、`minimumUnblockConditions`、`doNotDispatchUntil` 和 `cannotInferBoundaries`。
- 对真实 publish、真实 controlled smoke、Gateway ingestion、authorization facts、fixture/DB、敏感字段、full-success 或跨 owner 成功外推执行 fail closed。
- 新增 Node helper/test、Bruno local-only 入口和 operator README 说明。Bruno pre-request 输出本地脱敏 triage package 后主动中止网络请求，避免误连真实环境。
- 同步 `admin-gateway-organization-projection-publisher` spec，明确 operator triage handoff 只表示 Admin 本地脱敏交接包可用于值班分流，不能证明真实 publish、Gateway ingestion、authorization facts、API/Gateway/Insight 成功、生产就绪或 controlled smoke pass。

## Non-Goals

- 不修改 API、Insight、Gateway 仓库或跨 owner 代码。
- 不触碰 WeCom 同步、组织树真实 fixture、真实 DB、真实 publish、Gateway ingestion、authorization facts、token 或生产/类生产配置。
- 不运行真实 controlled smoke，不写真实 fixture，不声明 full-success。
- 不把本地 operator triage ready 外推为 controlled smoke pass、Gateway allow、API authorization report full-success、Insight success 或生产就绪。

## Impact

- 影响范围限定在 `aicodex-admin` 的 Admin gateway projection Bruno 本地入口、Node helper/test、operator README 和 OpenSpec artifacts。
- 输出用于本地脱敏 operator 分流、补证或停止派发判断，可作为协调层回传的最小 triage package。
