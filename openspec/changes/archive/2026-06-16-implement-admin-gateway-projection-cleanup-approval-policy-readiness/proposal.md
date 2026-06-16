# Proposal

## Why

Admin gateway projection cleanup 已具备 dry-run guardrails、execute readiness 和 approval audit trail。operator 现在能看到 dry-run、执行前门禁和安全动作审计，但仍缺少一层稳定的 approval policy/readiness 判断，用于回答：当前是否满足进入人工审批策略评审、哪些证据不能推断、保留期和审计记录是否足以支持后续人工批准。

没有 policy readiness 时，后续真实 cleanup gate 容易把单次 `approve` preview 或 dry-run hash 误解为可执行批准。本 change 在 Admin owner 范围内补齐只读 approval policy readiness，明确 P0 仍然 manual review only，不执行 cleanup、不删除或更新记录、不写 Gateway facts。

## What Changes

- 新增 Admin-owned cleanup approval policy/readiness service 和只读 API，基于现有 cleanup execute readiness 与 approval audit trail 派生 policy gates。
- 响应返回 `policyVersion`、`policyStatus`、`manualReview`、`cannotInfer`、`policyGates`、`auditSummary`、`retentionPolicyVersion`、`approvalAuditStorageScope`、`safeNextAction` 和脱敏 export。
- policy readiness 只给出人工评审准入和 operator guidance，不产生真实审批、清理执行或授权事实。
- Web Admin 在 gateway projection cleanup readiness 区域展示 approval policy readiness，支持刷新和复制/导出脱敏 JSON，覆盖 loading、empty、error、disabled 和长 reason alias。
- OpenSpec 主规格补充 approval policy readiness 的边界、cannotInfer、manual review、保留期和审计语义。

## Non-Goals

- 不执行真实 cleanup、delete、update 或 DB 清理。
- 不触发 projection publish，不写 Gateway authorization facts。
- 不读取 API/Gateway/Insight 内部库，不改变 API/Insight 逻辑。
- 不打开生产或类生产 cleanup gate，不写 60 fixture。
- 不把 approval policy readiness、Gateway receipt hint 或 approval audit trail 表述为 runtime authorization success。
- 不触碰 OIDC gateway routing、auth center shell、WeCom login config 或 organization directory remediation operator notes 写集。
