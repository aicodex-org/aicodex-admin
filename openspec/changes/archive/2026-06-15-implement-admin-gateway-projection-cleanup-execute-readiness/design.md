# Design

## Current Code

- `GatewayProjectionPublishAttemptHistoryService.CleanupDryRun` 已按 organization/source/status/failureCategory/olderThan/limit 生成 cleanup plan。
- dry-run plan 已包含 candidate/blocked counts、reasonCounts、diagnostic completeness、receipt hint coverage、samples、safetyChecklist 和 executeGuardrail。
- `PlatformApiMappingPage` 已展示 cleanup dry-run guardrails，是 execute readiness 的自然入口。

## Decisions

### 1. Execute readiness 复用 dry-run，不执行 cleanup

新增 `CleanupExecuteReadiness` service 方法。它只调用现有 `CleanupDryRun` 并派生执行前门禁，不删除、不更新、不触发 publish。

响应字段建议：

- `generatedAt`
- `readiness`
- `safeNextAction`
- `disabledReasons`
- `dryRunId`
- `dryRunHash`
- `retentionPolicyVersion`
- `filters`
- `candidateCount`
- `blockedCount`
- `missingDiagnosticSummaryCount`
- `receiptHintAvailableCount`
- `receiptHintMissingCount`
- `lastDryRunGeneratedAt`
- `lastDryRunFreshness`
- `operatorApproval`
- `executeGuardrail`
- `export`

### 2. 稳定 readiness 规则

P0 readiness 使用稳定 alias：

- `ready_for_approval`：dry-run 新鲜、candidate 大于 0、blocked 为 0、排障摘要完整、receipt hint 覆盖所有 candidate，仍只允许进入人工批准阶段。
- `approval_required`：满足执行前质量条件，但缺少 operator approval 材料；P0 默认落在该状态，`safeNextAction=collect_approval_package`。
- `blocked`：缺少组织、dry-run stale、没有 candidate、存在 blocked、缺少 diagnostic summary、receipt hint 不完整或 execute guardrail 禁止。

即使 quality 条件满足，P0 也不返回可执行真实 cleanup 的状态；`executeGuardrail.enabled=false`、`dryRunOnly=true`。

### 3. Dry-run identity 和 freshness

readiness 需要生成可审计 dry-run marker：

- `dryRunId` 使用 organization、filters、candidate/blocked counts、reasonCounts 和 generatedAt 的稳定摘要。
- `dryRunHash` 使用同一脱敏输入生成，不能包含 raw gateway response、token、Cookie、私有 URL 或完整 subject/resource 明细。
- `retentionPolicyVersion` 使用稳定值 `gateway_projection_publish_attempt_retention.v1`。
- `lastDryRunFreshness` 包含 `status`、`generatedAt`、`maxAgeSeconds`、`ageSeconds`、`expiresAt`。

默认 freshness max age 使用 15 分钟，避免 operator 拿过期 dry-run 进入审批。

### 4. Approval requirements

readiness 返回只读审批要求：

- `required=true`
- `status=missing` 或 `status=ready`
- `requiredEvidenceAliases`：`dry_run_export_reviewed`、`candidate_count_reviewed`、`receipt_hint_coverage_reviewed`、`no_blocked_attempts_confirmed`
- `missingEvidenceAliases`

P0 不接收真实审批人、票据或签名，不写审批记录。

### 5. UI 低风险承载

在 cleanup dry-run 面板附近增加 execute readiness 面板：

- 展示 readiness、safe next action、disabled reasons、dry-run id/hash、freshness、candidate/blocked、diagnostic/receipt 覆盖、approval requirements。
- 提供复制/导出脱敏 JSON 的按钮；导出内容来自服务端 `export` 字段或前端对 readiness envelope 的安全子集。
- 不提供真实删除按钮，不显示 raw payload、raw gateway response、token、Cookie、私有 URL、完整组织树或完整 subject/resource 明细。

## 安全与边界

- 不执行真实 cleanup，不删除或更新 DB。
- 不触发 projection publish，不打开真实 gate，不写 Gateway facts。
- 不读取 API/Gateway/Insight 内部库；receipt hint 只作为 Gateway owner 诊断线索。
- 不把 Admin diagnostics 当下游授权事实。

## Testing

- 后端：覆盖 ready/approval required、stale dry-run、missing diagnostic summary、receipt hint missing、blocked attempts、empty candidates、organization required、export redaction。
- 前端：覆盖 readiness loading/empty/error/disabled、复制脱敏 JSON、参数调用、长 reason aliases。
- OpenSpec：target/changes/specs strict validate。
- 覆盖率：受影响 Go 新增函数 changed-function coverage 达到 85%；前端运行相关 Jest 和 build。
