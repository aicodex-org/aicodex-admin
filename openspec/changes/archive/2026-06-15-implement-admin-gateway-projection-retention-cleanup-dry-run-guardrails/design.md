# Design

## Current Code

- `GatewayProjectionPublishAttemptHistoryService.RetentionReadiness` 已按 organization/source/status/time/limit 聚合 retention readiness。
- `GatewayProjectionPublishAttempt.Retention` 已包含 `cleanupEligible`、`cleanupReason`、`expiresAt`。
- `GatewayProjectionReceiptQueryHint` 已能描述 Gateway ingestion status 的只读查询线索。
- `PlatformApiMappingPage` 已展示 attempt history、retention readiness、receipt query hint 和 manual publish console，是 cleanup dry-run 的合适入口。

## Decisions

### 1. Dry-run plan 只读生成，不改记录

新增 `CleanupDryRun` service 方法。它复用 attempt history 查询和 retention 派生逻辑，仅生成计划，不删除、不更新 attempt。

响应字段建议：

- `generatedAt`
- `filters`
- `retentionWindowSeconds`
- `total`
- `candidateCount`
- `blockedCount`
- `reasonCounts`
- `oldestAttemptAt`
- `newestAttemptAt`
- `diagnosticCompleteness`
- `receiptHintCoverage`
- `operatorActionSummary`
- `safetyChecklist`
- `samples`
- `executeGuardrail`

### 2. 安全过滤和 fail-closed

`organization` 必填。`olderThan` 如果缺省，则使用当前 retention window 推导 cutoff；如果提供，必须是 RFC3339 时间，且不能晚于当前时间。`limit` 复用 history 上限，避免一次返回过多样例。

Dry-run 只把满足现有 retention `cleanupEligible=true` 的 attempt 计入 candidate。超过保留期但缺少排障摘要的 attempt 继续 blocked，reason 由 retention 层给出。

### 3. Diagnostic completeness 与 receipt hint coverage

`diagnosticCompleteness` 汇总 dry-run 范围内是否具备以下排障线索：

- projection batch / version / source version
- failure category / error code
- skipped reason summary
- retention reason

`receiptHintCoverage` 统计可用于 Gateway ingestion-status 只读查询的 hint 覆盖率。该覆盖率只说明“可查下游 receipt”，不说明 Gateway 已成功应用或授权成功。

### 4. Execute guardrail P0 fail closed

P0 可以提供 `POST /api/gateway-projection/publish-attempt-retention-cleanup`，但必须始终 fail closed，不改 DB，并返回：

- `dryRunOnly=true`
- `enabled=false`
- `irreversible=false`
- `disabledReason=cleanup_execution_not_enabled`
- `requiredConfirmation`
- `safetyChecklist`

这样 UI 可以提前接入执行 guardrail 的 operator 体验，但不会产生破坏性行为。

### 5. UI 低风险承载

在 publish attempt history 区域增加 cleanup dry-run 面板：

- 展示 candidate/blocked/total、retention window、oldest/newest、reason aliases。
- 展示 diagnostic completeness、receipt hint coverage 和 safety checklist。
- 展示 execute guardrail disabled 状态和 operator action summary。
- 不显示 raw gateway response、token、Cookie、私有 URL、完整组织树或完整 subject 明细。

## 安全与边界

- 不执行真实 cleanup，不删除或更新 DB。
- 不触发 publish，不打开真实 gate，不写 60 fixture。
- 不读取 API/Gateway/Insight 内部库；receipt hint 只作为 Gateway owner 只读查询线索。
- 不写 gateway authorization facts，不把 Admin diagnostics 当下游授权事实。

## Testing

- 后端：覆盖 candidate/blocked 分类、organization 必填、olderThan 过滤、diagnostic completeness、receipt coverage、execute guardrail fail-closed、脱敏响应。
- 前端：覆盖 dry-run loading、空态、blocked、candidate、长 reason aliases、execute disabled guardrail 和后端调用参数。
- OpenSpec：target/changes/specs strict validate。
- 覆盖率：受影响 Go 实施函数达到 changed-function 85%；前端运行相关 Jest 和 build。
