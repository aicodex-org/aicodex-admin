## Why

现有 Admin 组织目录质量控制台已经提供 remediation plan、manual review action drafts 和只读 preflight，但 operator 在进入未来真实修复执行前仍缺少一个审批包视图来判断影响范围、审批要求、残余 blocker 和脱敏样例是否足够进入人工审批。

本 change 补齐执行前审批预览，保持 P0 只读和 `manual_review_only`，让 Admin owner 在不触发真实修复、不写下游事实的前提下形成可运营的审批准备闭环。

## What Changes

- 新增 Admin-owned organization directory remediation execution approval preview 只读能力，聚合既有 action draft 与 preflight 结果。
- 新增后端 API/service/controller/router/authz 设置，输出 `approvalPreviewId`、`approvalPreviewHash`、`executionMode=manual_review_only`、`autoExecutionAllowed=false`、`affectedCount`、`riskLevel`、`preconditions`、`blockedReasons`、`requiredApprovals`、`operatorChecklist`、`safeSummary`、`exportSummary` 和脱敏 sample stable hashes。
- 扩展 web-admin 组织目录质量页 action draft / preflight 区域，增加审批预览入口或面板，覆盖 loading、empty、error、disabled、blocked、ready-for-approval 状态，并支持复制/导出脱敏 JSON。
- 补充对象、controller/router、前端测试和 changed-function coverage，覆盖 blocked、ready、no-sample、missing preflight、risk-level、export redaction。
- 保持只读边界：不执行 remediation、不写组织主数据、不修复关系、不触发 projection publish、不写 Gateway facts、不读取 API/Gateway/Insight 内部库。

## Capabilities

### New Capabilities

- 无。

### Modified Capabilities

- `admin-organization-master-model`: 增加 organization directory remediation execution approval preview 的只读 API 和 web-admin 审批预览行为要求。

## Impact

- 后端：`admin/object` remediation draft/preflight 聚合服务与测试、`admin/controllers/platform_api_mapping.go`、`admin/routers/router.go`、`admin/routers/authz_filter.go`。
- 前端：`web-admin/src/OrganizationDirectoryQualityPage.js`、`web-admin/src/backend/PlatformApiMappingBackend.js`、`web-admin/src/Setting.js` 及相关测试。
- OpenSpec：追加 `admin-organization-master-model` delta spec，并在 archive 后同步主规格。
- 不影响 API、Gateway、Insight、Feishu/WeCom 组织同步、projection publish cleanup execute readiness 或真实数据修复链路。
