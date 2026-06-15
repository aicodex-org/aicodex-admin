## Why

Admin 已经能把 organization directory remediation plan 转成只读 action drafts，但 operator 在未来执行真实修复前仍缺少一层“执行前预检”。没有 preflight 时，operator 只能从 draft 文案自行判断前置条件、阻塞原因、影响范围和为什么仍禁止自动执行，容易误把草案当成可执行修复入口。

## What Changes

- 新增 Admin-owned 只读 remediation preflight API，基于 action drafts 和 Admin directory quality read model 生成执行前检查摘要。
- preflight 返回 `preflightId`、`draftId`、`actionAlias`、`executionMode=manual_review_only`、`readyForManualReview`、`autoExecutionAllowed=false`、`blockedReasons`、`preconditions`、`safetyChecklist`、`affectedCounts`、`sampleDigests`、`exportSummary` 和 `operatorNextSteps`。
- 支持按 `organization`、`draftId` 或 `actionAlias/reasonCode/entityType/qualityStatus/sourceType/sourceConnectionIdHash/keyword/limit/topN` 查询。
- 在组织目录质量页 action draft Drawer 增加“预检”区域，展示 ready/blocker、安全清单、影响范围和脱敏样例，允许导出预检 JSON，但不提供执行/修复按钮。

## Capabilities

### New Capabilities

- 无。

### Modified Capabilities

- `admin-organization-master-model`：增加 Admin 组织目录 remediation preflight 的只读 API/UI 契约、fail-closed 行为和脱敏边界。

## Impact

- 后端：新增 preflight service/controller/router/authz path，复用 `OrganizationDirectoryRemediationActionDraftService` 和 directory quality read model。
- 前端：扩展 `OrganizationDirectoryQualityPage`、backend wrapper 和 Setting API path allowlist。
- 测试：补 Go object/controller/router tests，以及前端 wrapper/page/Setting tests。
- 边界：不写组织主数据，不执行修复，不触发 projection publish，不写 Gateway facts，不读取 API/Gateway/Insight 内部库，不修改 Feishu/WeCom 同步实现。
