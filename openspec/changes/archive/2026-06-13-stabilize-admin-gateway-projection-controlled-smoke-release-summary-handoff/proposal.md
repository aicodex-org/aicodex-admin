## Why

Admin gateway projection controlled smoke 路线已经具备 preflight、release runbook、evidence readiness、execution handoff 和 result evidence handoff，但还缺少 Admin owner 的本地 release summary handoff。后续 operator 需要把脱敏 controlled-smoke result/evidence summary 归类为可交接 release summary、blocked、needs-user-action 或 hard-red-line，并拿到稳定 alias、最小解除条件和不能外推边界。

## What Changes

- 新增 Admin-owned controlled smoke release summary handoff，用本地脱敏 result evidence handoff、release summary status、alias、counts、redaction/risk 分类和 operator notes 判断 release summary 是否可交接。
- 对缺少 result evidence、缺少 release summary 字段、未知 alias、计数/alias 不一致、敏感字段、真实环境写入信号、Gateway ingestion、authorization facts 或 full-success 外推执行 fail closed。
- 新增 Node helper/test、Bruno local-only 入口和 operator README 说明。Bruno pre-request 输出本地脱敏 summary 后主动中止网络请求，避免误连真实环境。
- 同步 `admin-gateway-organization-projection-publisher` spec，明确 `ready-for-release-summary-handoff` 只表示本地脱敏 release summary 可交接，不能证明真实 controlled smoke pass、production readiness 或 full-success。

## Non-Goals

- 不修改 API、Insight、Gateway 仓库或跨 owner 契约。
- 不触碰 WeCom 同步、组织树真实 fixture、真实 DB、真实 publish、Gateway ingestion、authorization facts、token 或生产/类生产配置。
- 不运行真实 controlled smoke，不声明 full-success。
- 不把本地脱敏 release summary ready 外推为 API/Gateway/Insight 成功、Gateway allow、authorization facts 生效或生产就绪。

## Impact

- 影响范围限定在 `aicodex-admin` 的 Admin gateway projection Bruno 本地入口、Node helper/test、operator README 和 OpenSpec artifacts。
- 输出仅用于本地脱敏 release summary 交接判断，可作为后续 operator 复核、补证或停止派发的依据。
