# Proposal

## Why

Admin 已能在 publish attempt history 中展示 retention metadata、cleanup readiness 和 Gateway receipt query hint。当前缺口是 operator 只能看到“哪些记录可能可清理”，但无法在执行前得到一份稳定、脱敏、可复核的 cleanup dry-run 计划。

如果没有 dry-run/guardrails，后续真实 cleanup 只能依赖人工理解 history/readiness，容易误清缺少 receipt 线索或仍需排障的 attempt。P0 先收口只读 dry-run：让 operator 看见候选数量、阻断原因、排障摘要完整性、receipt hint 覆盖率和需要的确认项，但不执行任何 DB delete/update。

## What Changes

- 增加 Admin-owned publish attempt retention cleanup dry-run service/API，基于现有 attempt history 和 retention readiness 生成脱敏 cleanup plan。
- dry-run 支持 `organization`、`status`、`failureCategory`、`olderThan`、`limit` 等安全过滤；`organization` 必填，禁止跨组织空查询。
- 返回 candidate/blocked counts、reason aliases、oldest/newest attempt time、retention window、diagnostic completeness、receipt query hint coverage、operator action summary 和 safety checklist。
- 增加执行 guardrails envelope。P0 不真实删除；如提供 execute/cleanup endpoint，只能 fail closed / dryRunOnly，并返回 `disabledReason`、`requiredConfirmation`、`irreversible=false` 等字段。
- Web Admin projection 操作区增加 cleanup dry-run 面板，展示候选数、blocked reason、guardrail 和下一步 operator action。
- 保持 Admin owner 边界：不改 API/Insight，不读取 API/Gateway/Insight 内部库，不写 gateway authorization facts，不声明 runtime authorization success。

## 非目标

- 不执行真实 cleanup、DB delete/update、60 fixture 写入或生产/类生产操作。
- 不新增 gateway authorization facts，不修改 gateway projection ingestion contract。
- 不打开 publish gate，不触发 projection publish。
- 不改飞书/企微组织同步实现，不触碰 organization directory remediation action drafts 或 Feishu dry-run history 写集。
- 不让 API/Insight 消费 Admin UI/diagnostics JSON。

## 影响范围

- 后端：扩展 publish attempt history service，新增 cleanup dry-run plan 和 execute guardrail；新增 admin-only controller/router/authz。
- 前端：扩展 `PlatformApiMappingPage` 的 attempt history/operator 区域，新增 cleanup dry-run panel。
- OpenSpec：更新 `admin-gateway-organization-projection-publisher` 规格，明确 cleanup dry-run 和 fail-closed execution guardrail。
- 测试：补 object/controller/backend/frontend 聚焦测试、changed-function coverage 和构建验证。
