# Design

## Current Code

- `GatewayProjectionManualPublishService.Publish` 负责 operator 手动触发的受控 publish，并返回脱敏 `GatewayProjectionManualPublishResult`。
- `GatewayProjectionService.BuildAndPublishOrganization` 是 WeCom 同步触发和 refresh worker 复用的 build + publish 入口。
- `GatewayProjectionObservabilitySnapshot` 只保留进程内 latest publish 和 refresh summary，不提供历史查询。
- `PlatformApiMappingPage` 已展示 mapping readiness、master data quality、run readiness 和 manual publish console，是最合适的 operator 入口。

## Decisions

### 1. Attempt history 是 Admin producer 诊断台账

新增 `GatewayProjectionPublishAttempt` 只记录脱敏摘要：source、status、accepted/idempotent/retryable、projectionBatchId、orgVersion、sourceVersion、subject counts、skippedByReason、failureCategory、durationMs、createdAt、operator/audit hash 等。它不得包含 projection token、Authorization header、Cookie、私有 URL、完整 payload、完整组织树、手机号、邮箱或真实个人明细。

### 2. 记录点覆盖 manual 与 scheduled

- manual publish：包括 preflight fail-closed、publisher success、publisher failure，都写入 attempt history。
- scheduled / sync / refresh：优先在 `GatewayProjectionService.BuildAndPublishOrganization` 中集中记录 `source=scheduled`，覆盖 refresh worker 与同步后触发路径。
- 共享 publish 流需要显式传递或覆盖 attempt source，manual path 不能因为复用 `GatewayProjectionService` 被误标为 `scheduled`，也不能产生重复 history record。
- 记录失败不得反向改变 publish 结果；history 写入失败只作为 Admin 诊断 warning 或返回附带失败原因，不能影响 gateway authorization facts。

### 3. 查询 API 只读且可筛选

新增 admin-only API：

- `GET /api/gateway-projection/publish-attempts`
- `GET /api/gateway-projection/publish-attempts/:attemptId`

列表支持 organization、source、status、from/to、limit；详情使用 attemptId。响应只返回脱敏摘要，不返回 raw gateway response 或完整 projection payload。

API 需要沿用现有 admin-only 鉴权边界，并在 `authz` 规则中补充只读查询权限；manual publish 写入口保持既有受控操作权限，不因新增 history 查询放宽。

### 4. UI 复用 projection 操作区

在 `PlatformApiMappingPage` manual publish console 附近增加最近 attempts 表格：

- 展示 source、status、failureCategory、accepted/idempotent/retryable、subject counts、duration 和 createdAt。
- 支持 source/status/time 简单筛选与刷新。
- 详情抽屉展示脱敏 skippedByReason、sourceVersion、projectionBatchId、traceId、operatorHash 等。
- 手动 publish 完成后刷新 attempts，便于 operator 连续排障。

### 5. 存储实现保持小范围

优先使用项目现有 XORM model/store 风格，按 organization + createdAt 倒序查询。若数据库未初始化或测试 store 不可用，service 应 fail closed 返回稳定错误，不用内存记录伪装持久历史。

历史台账保留最近可查询记录即可，本 change 不引入跨环境迁移脚本或清理 worker；如后续需要 retention policy，可另开 change。

## 安全与边界

- Attempt history 不写 gateway authorization facts，不扩大授权范围。
- 不读取 API/Gateway/Insight 内部库，不让下游消费 Admin UI/diagnostics JSON。
- displayName、手机号、邮箱、legacy identity 只能是诊断来源，不能作为 runtime join key；history 默认不保存这些字段。
- verification 和 runbook 不记录真实 IP、私有 URL、token、Cookie、真实账号、手机号、邮箱、完整组织明细或完整响应体。

## Testing

- 后端：覆盖 manual blocked、manual success/failure、scheduled service result 记录、列表筛选、详情查询、脱敏字段、history 写入失败不制造授权事实。
- 前端：覆盖 API backend 封装、attempts 表格/筛选/详情、manual publish 后刷新。
- OpenSpec：change、changes、specs strict validate。
- 覆盖率：生产代码改动后统计受影响 Go package 或关键函数覆盖率，目标 85%；如大型共享 package 平均值不代表本 change，记录函数级覆盖率。
