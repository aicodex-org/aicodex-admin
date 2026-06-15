## Why

Admin gateway projection controlled smoke 路线已经具备 execution handoff、result evidence handoff、release summary handoff 和 operator triage handoff，但 operator 仍缺少一份最终、紧凑、只读的 decision package。没有该 package 时，协调层容易把 triage ready 或 release summary ready 误写成真实 controlled smoke pass、full-success、Gateway ingestion、authorization facts 或跨 owner 成功。

## What Changes

- 新增 Admin-owned controlled smoke operator decision handoff，用本地脱敏 triage/result/execution/release-summary handoff summary 生成 operator decision package。
- 输出稳定 `status`：`ready-for-operator-decision-handoff`、`blocked`、`needs-user-action` 或 `hard-red-line`，并给出 `nextAdminAction`、stable blocker/remediation alias、owner handoff limit、最小解除条件和不能外推边界。
- 对真实 publish、真实 controlled smoke、Gateway ingestion、authorization facts、fixture/DB、敏感字段、full-success 或跨 owner 成功外推 fail closed。
- 新增 Node helper/test、Bruno local-only 入口和 operator README 说明。Bruno pre-request 输出本地脱敏 decision package 后主动中止网络请求，避免误连真实环境。
- 同步 `admin-gateway-organization-projection-publisher` spec，明确 operator decision handoff 只表示 Admin 本地脱敏决策包可用于值班判断，不能证明真实 publish、Gateway ingestion、authorization facts、API/Gateway/Insight 成功、生产就绪或 controlled smoke pass。

## Non-Goals

- 不修改 API、Insight、Gateway 仓库或跨 owner 代码。
- 不触碰 WeCom 同步、组织树真实 fixture、真实 DB、真实 publish、Gateway ingestion、authorization facts、token 或生产/类生产配置。
- 不运行真实 controlled smoke，不写真实 fixture，不声明 full-success。
- 不把本地 operator decision ready 外推为 controlled smoke pass、Gateway allow、API authorization report full-success、Insight success 或生产就绪。

## Impact

- 影响范围限定在 `aicodex-admin` 的 Admin gateway projection Bruno 本地入口、Node helper/test、operator README 和 OpenSpec artifacts。
- 输出用于本地脱敏 operator 决策、补证、停止派发或继续交接判断，可作为协调层回传的最小 decision package。
