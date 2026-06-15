## Why

组织目录质量控制台已经能定位具体 `PlatformDepartment`、`PlatformUser` 和 `PlatformMembership` 的质量 flags，但 operator 仍需要把这些 flags 转成修复顺序：哪些应先修 SourceConnection 或等待 source refresh，哪些要 review API mapping，哪些属于 identity conflict，哪些是 lifecycle 或 membership 数据问题。没有 plan 聚合时，operator 只能逐条查看明细，难以评估影响面和优先级。

## What Changes

- 新增 Admin 只读组织目录 remediation plan API，基于现有目录质量查询结果生成按 action alias 分组的 plan。
- 返回 plan priority、actionAlias、reasonCodes、affectedCounts、sampleEntityIds/hash、source/org version、safeSummary 和 blockedReason。
- 支持 organization、entityType、qualityStatus、reasonCode、sourceType、sourceConnectionIdHash、keyword、limit/topN 等筛选。
- 在 web-admin 组织目录质量页面增加 remediation plan 面板，展示优先级分组、影响计数、样例、只读导出和刷新。

## Impact

- 后端：新增 plan service/controller/route，并复用 `OrganizationDirectoryQualityService` 的只读分类结果；不新增修复执行接口。
- 前端：扩展组织目录质量页面和 backend wrapper；导出仅使用当前脱敏 plan 数据。
- OpenSpec：同步 Admin 组织主数据规格，明确 remediation plan 是 Admin diagnostics，不是 Gateway authorization facts，也不是 Insight fallback。
- 边界：不执行真实修复、不写 gateway facts、不触发 projection publish、不读取 API/Gateway/Insight 内部库、不修改 Feishu dry-run diff 或 publish attempt history 写集。
