# Design

## Current Code

- `GatewayProjectionPublishAttemptHistoryService` 已支持 record/list/detail，并返回 manual / scheduled attempt 的脱敏摘要。
- `GatewayProjectionIngestionStatusService` 已能按 organization、latest、projectionBatchId、orgVersion、sourceVersion 查询 Gateway owner ingestion status。
- `PlatformApiMappingPage` 已同时展示 run readiness、ingestion status、manual publish console 和 publish attempt history，是最合适的 operator 联动入口。

## Decisions

### 1. Retention metadata 只读派生

P0 不修改历史记录生命周期，也不做删除。Retention metadata 从 attempt 的 `createdAt` 派生，默认 retention window 为 30 天。返回字段包含：

- `retention.windowSeconds`
- `retention.expiresAt`
- `retention.cleanupEligible`
- `retention.cleanupReason`

cleanup eligibility 只表示“可清理候选”，不是执行删除。规则保持保守：

- `createdAt` 缺失时 `cleanupEligible=false`，reason 为 `created_at_missing`。
- 未超过 retention window 时 `cleanupEligible=false`，reason 为 `within_retention_window`。
- 已超过 retention window 且 attempt 已有稳定 receipt query hint 或失败分类时可标记为 `cleanupEligible=true`，reason 为 `retention_expired_with_diagnostic_summary`。

### 2. Retention readiness 汇总按组织 fail closed

新增只读 API：

- `GET /api/gateway-projection/publish-attempt-retention-readiness`

参数：`organization` 必填，`source/status/from/to/limit` 可选复用 history 查询口径。响应只返回聚合计数、reason aliases、oldest/newest 和最多少量脱敏样例，不返回 raw payload、完整 subject 明细或下游凭据。

### 3. Receipt query hint 不等于 Gateway 成功

Attempt detail/list 派生 `receiptQueryHint`，用于 UI 预填 Gateway ingestion status 查询条件：

- `organizationId`
- `latest`
- `projectionBatchId`
- `orgVersion`
- `sourceVersion`

如果 attempt 缺少 batch/version/sourceVersion，hint 仍可存在，但 `available=false` 并给出 `unavailableReason`。UI 只能把它展示为查询提示或触发已存在的只读 ingestion status 查询；不能把 receipt hint 或查询结果解释为 runtime authorization success。

### 4. UI 聚合展示，不扩大页面范围

在现有 attempt history 区域补：

- Retention readiness 摘要卡片/Alert，显示 total、eligible、blocked、window 和 reason aliases。
- Attempt 表格增加 cleanup 状态和 expiresAt。
- Detail Drawer 增加 retention 与 receipt query hint；有可用 hint 时提供“查询 Gateway receipt”按钮，调用现有 `getGatewayProjectionIngestionStatus` 并刷新同页 ingestion status 区域。

## 安全与边界

- 不执行 cleanup，不删除 DB，不触发 publish。
- 不读取 API/Gateway/Insight 内部库；Gateway receipt 只通过既有 ingestion-status owner contract 只读查询。
- 不写 gateway authorization facts，不让下游消费 Admin UI/diagnostics JSON。
- 不保存或展示 token、Cookie、私有 URL、raw Gateway response、完整 payload、完整组织树、手机号、邮箱或 subject 明细。

## Testing

- 后端：覆盖 retention 派生、cleanup eligibility、missing createdAt、receipt hint available/unavailable、summary counts、organization 必填和脱敏边界。
- 前端：覆盖 readiness 加载、attempt retention 字段展示、detail receipt hint、点击 receipt 查询调用既有 ingestion status API。
- OpenSpec：target/changes/specs strict validate。
- 覆盖率：新增/修改 Go 实施函数达到 85% 函数级或等价 changed-function 覆盖；前端运行相关 Jest 和 build。
