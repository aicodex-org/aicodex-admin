## Why

Admin 已具备 gateway projection publisher、refresh worker、observability、source freshness diagnostics 和 mapping readiness 诊断，但 operator 仍缺少一个一等的受控手动 publish 入口。当前 operator 在确认组织源、mapping readiness 和 source freshness 已达标后，无法在 Admin 控制台直接触发一次脱敏、可审计、admin-only 的 refresh/publish attempt，也无法在同一页面看到本次 attempt 的稳定结果 envelope。

本 change 目标是把 Admin 侧 projection producer 从“可观察、可诊断”推进到“可操作、可交接”：提供 admin-only 手动 publish API 与 web-admin 操作区，复用既有 `GatewayProjectionService`，不写 gateway authorization facts，不让 API/Insight 消费 Admin 诊断 JSON，不执行真实 60 fixture 写入或生产/类生产 gate。

## What Changes

- 新增 Admin-only gateway projection manual publish API，用于 operator 对当前组织发起一次受控 `BuildAndPublishOrganization` attempt。
- 返回稳定、脱敏 result envelope，包含 readiness 摘要、accepted/idempotent/retryable、projectionBatchId、orgVersion、sourceVersion、subject counts、skippedByReason、failureCategory、durationMs 和 sourceConnection readiness summary。
- 在 web-admin 现有 Platform API mapping / projection readiness 相关页面增加 operator 操作区：展示 readiness、禁用原因、手动 publish 按钮、最近 attempt 结果和错误分类。
- 补后端/前端聚焦测试、OpenSpec delta、verification 和必要 runbook/Bruno 说明。

## Non-Goals

- 不改 API/Insight 代码或 owner 边界。
- 不写 gateway resource authorization facts、权限矩阵或 runtime authorization audit。
- 不把 Admin observability JSON、管理页面组织树 JSON 或 readiness JSON 作为 API/gateway 授权输入。
- 不执行 60 fixture 写入、DB 明细写入/清理、真实 gate 或生产/类生产操作。
- 不把 displayName、手机号、邮箱、旧 lineage 或旧 `User.Properties.*apiUserId` 当 projection join key。

## Impact

- Admin operator 可在同一控制台完成 readiness 查看与受控 publish attempt。
- publisher 行为仍由既有 gateway projection endpoint/token/config 控制；配置缺失、source 不可信、mapping 不可信、lineage 不完整时 fail closed 并返回稳定分类。
- 真实环境 `subjectCount>=1` 或 gateway ingestion 成功仍需另行授权的受控 smoke 验证。
