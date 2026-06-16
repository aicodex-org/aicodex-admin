# Design

## 目标

提供 `GatewayProjectionCleanupApprovalPolicyReadiness` 只读能力，让 operator 能从 Admin producer 侧看到 cleanup 审批策略是否具备进入人工评审的前置条件，并明确哪些信息不能推断。P0 不提供真实执行按钮、不接受真实签名、不变更 DB 清理状态。

## 当前代码

- `CleanupDryRun` 已提供 retention cleanup dry-run 和 guardrails。
- `CleanupExecuteReadiness` 已基于 dry-run 派生执行前只读门禁。
- `RecordCleanupApprovalAuditTrail` / `ListCleanupApprovalAuditTrail` 已记录 `approve/reject/copy/export/refresh` 等安全动作审计。
- `PlatformApiMappingPage` 已展示 dry-run、execute readiness 和 approval audit trail，是新增 policy readiness 的自然入口。

## 决策

### 1. Policy readiness 只读派生

新增 `CleanupApprovalPolicyReadiness` service 方法。它只调用现有 execute readiness 和 approval audit trail，不执行 cleanup，不修改 publish attempt，不打开 gate。

接口：

- `GET /api/gateway-projection/publish-attempt-retention-cleanup-approval-policy-readiness`
- required：`organization`
- optional：`source`、`status`、`failureCategory`、`olderThan`、`dryRunGeneratedAt`、`maxDryRunAgeSeconds`、`approvalEvidence`、`readinessHash`、`limit`

### 2. 稳定 policy 状态

P0 使用稳定 alias：

- `manual_review_ready`：execute readiness 满足进入人工评审的诊断条件，且 audit trail 有 approve/copy/export 等可交接证据；仍不可执行 cleanup。
- `manual_review_required`：execute readiness 需要人工审批材料或 audit trail 不完整；operator 需要补齐 review/export/action 记录。
- `blocked`：execute readiness 本身 blocked，或 audit trail 存在 reject。
- `cannot_infer`：缺少 readiness hash、approval audit trail 为空、audit 与当前 dry-run hash 不匹配，或 policy 输入不足，无法从 Admin-owned 证据推断人工审批状态。

### 3. cannotInfer 和 policy gates

响应必须显式返回 `cannotInfer`，避免把未知状态伪装成 ready。典型 reason aliases：

- `readiness_hash_missing`
- `approval_audit_trail_empty`
- `approval_audit_hash_mismatch`
- `manual_review_action_missing`
- `approval_rejected`
- `execute_readiness_blocked`
- `cleanup_execution_not_enabled`

policy gates 使用稳定结构表达 `alias/status/reason`，例如 readiness gate、manual review gate、audit trail gate、retention policy gate、execution guardrail gate。

### 4. 保留期和审计语义

policy readiness 固定返回：

- `policyVersion=gateway_projection_cleanup_approval_policy.v1`
- `retentionPolicyVersion=gateway_projection_publish_attempt_retention.v1`
- `approvalAuditStorageScope=admin_cleanup_approval_audit_trail.v1`
- `storageScope=derived_policy_readiness_not_persisted`

这说明 P0 policy readiness 是派生诊断，不是持久审批记录。真实审批记录仍只来自 approval audit trail；即使 audit 有 approve，也只代表安全 preview action，不代表 cleanup execution approval。

### 5. 脱敏 export 和 UI

导出只包含 policy status、hash、计数、reason aliases、manual review summary、storage scope、policy version 和 safe next action。不得包含 raw Gateway response、token、Cookie、私有 URL、完整组织树或真实 subject/resource 明细。

UI 在 approval audit trail 附近增加 approval policy readiness 面板：

- 展示 policy status、safe next action、manual review 状态、cannotInfer、policy gates、audit summary 和 storage scope。
- 提供刷新和复制/导出脱敏 JSON。
- 不提供真实 cleanup/delete/update 或 publish 按钮。

## 测试策略

- Go object tests 覆盖 manual review ready、manual review required、cannotInfer、rejected/blocked、redaction/storage scope、organization required 和 no mutation。
- Controller/router/authz 覆盖只读 endpoint 接入和组织必填。
- Frontend Jest 覆盖 API 参数、loading/error/empty/disabled、复制脱敏 JSON、长 reason alias。
- changed-function coverage 目标 >=85%；若本地 Go runner 无输出/超时，按任务要求记录命令、时长、stdout/stderr 和风险，不伪造通过。
