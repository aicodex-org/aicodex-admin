# Proposal

## Why

Admin 已提供 gateway projection publish attempt retention cleanup dry-run/guardrails。当前 operator 能看到候选和阻断原因，但还缺少“进入人工批准执行阶段之前”的只读 readiness：dry-run 是否仍新鲜、候选是否完整可诊断、receipt hint 是否足够、需要哪些审批材料，以及当前是否仍应禁止执行。

没有 execute readiness 时，后续真实 cleanup gate 很容易直接复用 dry-run 数字，忽略 dry-run 过期、阻断记录、缺少 receipt 线索或审批材料不足等问题。P0 先补只读执行前门禁，让 operator 在不改 DB、不触发删除、不声明下游授权成功的前提下，得到稳定、脱敏、可导出的 readiness envelope。

## What Changes

- 增加 Admin-owned cleanup execute readiness service/API，基于现有 cleanup dry-run plan 生成执行前只读门禁。
- readiness 返回 `readiness`、`safeNextAction`、`disabledReasons`、`dryRunId`、`dryRunHash`、`retentionPolicyVersion`、`lastDryRunGeneratedAt`、`lastDryRunFreshness`、candidate/blocked counts、diagnostic completeness、receipt hint availability、operator approval requirements 和脱敏 export。
- `organization` 必填，默认不跨组织；支持复用 `source/status/failureCategory/olderThan/limit` 等安全过滤。
- Web Admin 在 publish attempt retention 区域展示执行前就绪/审批门禁，只读展示 loading/empty/error/disabled 状态，并支持复制或导出脱敏 readiness JSON。
- 保持 Admin owner 边界：不执行真实 cleanup/delete/update，不改 DB 记录，不触发 projection publish，不写 Gateway facts，不读取 API/Gateway/Insight 内部库。

## 非目标

- 不实现真实 cleanup 执行，不删除或更新 `GatewayProjectionPublishAttempt`。
- 不做 60 写入、生产/类生产操作或 DB 清理。
- 不改 API/Insight，不让下游消费 Admin UI/diagnostics JSON 作为授权事实。
- 不读取 Gateway/API/Insight 内部库；receipt hint 仅作为 Gateway owner 诊断线索。
- 不触碰 directory remediation preflight、Feishu user binding conflict、飞书/企微同步写集。

## 影响范围

- 后端：扩展 publish attempt history service，新增 execute readiness DTO/service、只读 controller/router/authz。
- 前端：扩展 `PlatformApiMappingPage` 和 backend wrapper，增加 execute readiness panel/drawer 与 JSON 脱敏导出。
- OpenSpec：更新 `admin-gateway-organization-projection-publisher` 规格，固化 cleanup execute readiness 和只读审批门禁。
- 测试：补 object/controller/router/frontend 聚焦测试、changed-function coverage、OpenSpec strict validate 和 build 验证。
