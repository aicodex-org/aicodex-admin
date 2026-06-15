## Why

组织目录 remediation plan 已经能告诉 operator “先修哪类问题”，但还不能把某条 action/reason 转成可交接的修复草案。operator 仍需要手工汇总前置条件、处理步骤和脱敏样例，容易遗漏边界或泄露真实组织/人员信息。

## What Changes

- 新增 Admin 只读组织目录 remediation action draft API，基于 Admin-owned 目录质量 read model 和 remediation plan 规则生成脱敏草案。
- draft 返回 `draftId`、`actionAlias`、`priority`、`entityType`、`affectedCount`、`safeSummary`、`blockedReason`、`preconditions`、`operatorSteps`、`executionMode=manual_review_only` 和脱敏样例。
- 支持按 organization、actionAlias、reasonCode、entityType、sourceType、sourceConnectionIdHash、keyword、qualityStatus、limit/topN 过滤。
- 在组织目录质量页面的“修复计划”面板增加 action draft 抽屉，允许查看、复制和导出脱敏 JSON，但不触发真实修复。

## Capabilities

### New Capabilities

- 无。

### Modified Capabilities

- `admin-organization-master-model`：增加 Admin 组织目录 remediation action drafts 的只读 API/UI 契约和脱敏边界。

## Impact

- 后端：新增 draft service/controller/router/authz path，复用现有 `OrganizationDirectoryQualityService` 和 remediation action 分类规则。
- 前端：扩展 `OrganizationDirectoryQualityPage`、backend wrapper 和 Setting API path allowlist。
- 测试：补 Go object/controller/router tests，以及前端 wrapper/page/Setting tests。
- 边界：不写组织主数据，不执行修复，不触发 projection publish，不写 Gateway facts，不读取 API/Gateway/Insight 内部库，不修改飞书/企微同步实现。
