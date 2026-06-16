## Context

当前 cleanup 链路的只读能力如下：

- cleanup dry-run guardrails 输出候选/阻断计数和 P0 disabled execution guardrail。
- cleanup execute readiness 判断 dry-run 新鲜度、blocked/missing diagnostics、receipt hint 和 approval evidence。
- cleanup approval audit trail 记录 approve/reject/copy/export/refresh 等安全 action。
- cleanup approval policy readiness 输出 manual review、policy gates、cannotInfer 和 safe next action。
- cleanup approval decision draft/readiness 生成 copy-safe 人工审阅草案，但明确不代表真实 approval decision 或 cleanup execution approval。

execution gate owner-boundary preflight 应站在这些只读证据之上，告诉 operator “当前是否可以进入主控人工决策/后续真实 gate 设计评审”，而不是打开真实 gate。

## Decisions

- **只读派生**：execution gate preflight 由 decision draft/readiness 派生，不新增持久化表，不保存真实批准或执行意图。
- **状态值收敛**：`gateReadiness` 使用 `owner_boundary_ready`、`manual_review_required`、`blocked`、`cannot_infer`，分别表示可进入 owner-boundary 人工评审、缺少人工审阅、阻断和证据不可推断。
- **执行默认关闭**：所有响应必须包含 `executionMode=manual_review_only`、`cleanupExecutionAllowed=false`、`ownerBoundary.adminAuthorityOnly=true`、`noFallback.enforced=true`，并保留 `executeGuardrail.enabled=false`。
- **owner boundary 明示**：响应必须说明 Admin 只提供 producer 侧预检，不能读取 API/Gateway/Insight 内部库，不能写 Gateway facts，不能把 receipt hint 或 draft_ready 当成 runtime authorization success。
- **脱敏输出**：`copySafeLabels`、`ownerBoundary`、`manualReviewBlockers`、`cannotInfer`、`retentionSummary`、`redactionSummary` 和 `export` 只包含 alias/hash/count/status，不包含 token、Cookie、私有 URL、raw Gateway response、完整组织树、完整 subject 明细或授权事实。
- **cannotInfer 保守传播**：decision draft 中的 cannotInfer 和 blockingReasons 必须进入 preflight；当 decision draft blocked/cannot_infer/manual_review_required 时，preflight 不得返回可执行语义。

## API Shape

新增 GET：

`/api/gateway-projection/publish-attempt-retention-cleanup-execution-gate-owner-boundary-preflight`

支持安全过滤：

- `organization` 必填
- `source`
- `status`
- `failureCategory`
- `olderThan`
- `readinessHash`
- `dryRunGeneratedAt`
- `maxDryRunAgeSeconds`
- `approvalEvidence`
- `limit`

响应核心字段：

- `gatePreflightId`
- `gatePreflightHash`
- `gateReadiness`
- `gateState`
- `gateSummary`
- `executionMode`
- `cleanupExecutionAllowed`
- `ownerBoundary`
- `manualReviewBlockers`
- `cannotInfer`
- `noFallback`
- `retentionSummary`
- `redactionSummary`
- `operatorNextAction`
- `executeGuardrail`
- `copySafeLabels`
- `export`

## Failure Handling

- organization 为空时 fail closed 返回错误。
- decision draft 不可用时 fail closed，不返回 ready preflight。
- decision draft blocked/cannot_infer/manual_review_required 时，preflight 仍返回脱敏预检包，但 `cleanupExecutionAllowed=false`，并输出 blockers/cannotInfer/manual checklist。
- 任何复制/导出都只复制脱敏 JSON，不执行 cleanup 或写下游 facts。

## Verification Strategy

- 后端 service 测试覆盖 owner-boundary ready、manual review required、blocked、cannotInfer、noFallback、脱敏和 publish attempt 不变性。
- controller/router/authz 测试覆盖新增只读 endpoint、organization required 和 service error fail-closed。
- 前端 backend 测试覆盖 query 参数。
- 前端页面测试覆盖面板展示、copy/export、安全说明、错误禁用和空态。
- OpenSpec strict、`git diff --check`、Go 聚焦测试、前端聚焦测试和必要 build。
