## Context

当前 cleanup 链路的只读能力如下：

- cleanup dry-run 输出 candidate/blocked 计数、retention window、diagnostic completeness、receipt hint coverage 和 execute guardrail。
- cleanup execute readiness 判断 dry-run 是否新鲜、是否有 blocked/missing diagnostics、是否缺少 approval evidence。
- cleanup approval audit trail 记录 approve/reject/copy/export/refresh 等安全 operator action。
- cleanup approval policy readiness 结合 execute readiness 和 audit trail，输出 manual review、policy gates、cannotInfer 和 safeNextAction。

decision draft/readiness 应站在这些只读证据之上，为 operator 生成执行前审批草案，但不能越过 Admin producer 边界。

## Decisions

- **只读派生**：decision draft 由 approval policy readiness 派生，不新增持久化 decision 表，不保存真实审批材料。
- **状态值收敛**：`decisionReadiness` 使用 `draft_ready`、`manual_review_required`、`blocked`、`cannot_infer`，分别对应策略 ready、待补人工审阅、阻断和证据不可推断。
- **执行默认关闭**：所有响应必须包含 `executionMode=manual_review_only`、`cleanupExecutionAllowed=false`，并保留现有 `executeGuardrail.enabled=false`。
- **脱敏输出**：`copySafeLabels`、`policySummary`、`retentionSummary`、`auditSummary`、`redactionSummary` 和 `export` 只包含 alias/hash/count/status，不包含 token、Cookie、私有 URL、raw Gateway response、完整组织树、完整 subject 明细或授权事实。
- **cannotInfer 保守传播**：policy readiness 中的 cannotInfer reason aliases 必须进入 decision draft；当 policy blocked/cannot_infer 或 manual review 缺失时，decision draft 不得返回可执行语义。

## API Shape

新增 GET：

`/api/gateway-projection/publish-attempt-retention-cleanup-approval-decision-draft-readiness`

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

- `decisionDraftId`
- `decisionDraftHash`
- `decisionReadiness`
- `decisionState`
- `decisionSummary`
- `executionMode`
- `cleanupExecutionAllowed`
- `policyVersion`
- `policyStatus`
- `readinessHash`
- `dryRunId`
- `manualReviewChecklist`
- `cannotInfer`
- `blockingReasons`
- `copySafeLabels`
- `retentionSummary`
- `auditSummary`
- `redactionSummary`
- `operatorNextAction`
- `executeGuardrail`
- `export`

## Failure Handling

- organization 为空时 fail closed 返回错误。
- policy readiness 不可用时 fail closed，不返回 ready 草案。
- policy blocked/cannot_infer/manual_review_required 时，decision draft 仍返回脱敏草案，但 `cleanupExecutionAllowed=false`，并输出 blocked/cannotInfer/manual checklist。
- 任何复制/导出都只复制脱敏 JSON，不执行 cleanup 或写下游 facts。

## Verification Strategy

- 后端 service 测试覆盖 ready draft、manual review missing、rejected/blocked、hash mismatch/cannotInfer、脱敏和只读不变性。
- controller/router/authz 测试覆盖 query parse 和新增路由权限。
- 前端 backend 测试覆盖 query 参数。
- 前端页面测试覆盖面板展示、copy/export、安全说明和空态。
- OpenSpec strict、`git diff --check`、Go 聚焦测试、前端聚焦测试和必要 build。
