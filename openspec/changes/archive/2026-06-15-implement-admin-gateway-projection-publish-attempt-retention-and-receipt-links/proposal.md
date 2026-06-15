# Proposal

## Why

Admin 已具备 gateway projection publish attempt history，可以追踪 manual / scheduled producer attempt 的脱敏摘要。当前缺口是 operator 还不能判断这些 attempt 记录的保留状态，也不能从某条 attempt 稳定定位到 Gateway owner 的 ingestion receipt/status 查询条件。

如果没有 retention/readiness，attempt history 会变成只增不清的诊断台账，后续无法明确哪些记录可清理、哪些因仍需排障或缺少 receipt 线索而应保留。如果没有 receipt query hint，operator 需要手工复制 `projectionBatchId`、`orgVersion`、`sourceVersion` 等字段去 Gateway ingestion status 区域，容易遗漏查询条件或误把 Admin producer attempt 当成下游授权成功事实。

## What Changes

- 为 publish attempt 列表/详情增加只读 retention metadata，包括 retention window、expiresAt、cleanupEligible 和 cleanupReason。
- 增加 Admin-only publish attempt retention readiness API，按组织汇总 total/eligible/blocked counts 和 reason aliases；P0 只读，不删除记录。
- 为 attempt 派生脱敏 receipt query hint，包含 organization、projectionBatchId、orgVersion、sourceVersion、latest 等 Gateway ingestion status 查询条件。
- 在 Platform API mapping / projection 操作区展示 retention readiness、attempt retention 状态和 receipt query hint，并提供只读联动到 Gateway ingestion status 查询。
- 保持 Admin owner 边界：不改 API/Insight，不读取 Gateway/API/Insight 内部库，不把 Gateway receipt 当 Admin 权威事实，不本地声明 runtime authorization success。

## 非目标

- 不执行真实 cleanup、DB 删除、60 fixture 写入或生产/类生产操作。
- 不新增 gateway authorization facts，不改变 gateway projection ingestion contract。
- 不实现 API/Gateway/Insight provider fallback。
- 不改飞书/企微组织同步实现，不触碰 organization directory remediation 或 Feishu dry-run diff 写集。
- 不把 Admin 页面 JSON、observability JSON、attempt history 或 receipt hint 变成跨服务授权来源。

## 影响范围

- 后端：扩展 publish attempt history service 的派生 response metadata；新增 retention readiness service/controller/router/authz。
- 前端：扩展 `PlatformApiMappingPage` 的 attempt history、detail Drawer 和 retention readiness 展示。
- OpenSpec：更新 `admin-gateway-organization-projection-publisher` 规格，明确 retention/readiness/receipt hint 的只读边界。
- 测试：补 object/controller/frontend 聚焦测试、覆盖率和构建验证。
