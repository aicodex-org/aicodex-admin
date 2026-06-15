## Goals

- 让 operator 从 remediation plan 的某个 action/reason 进入更细的只读修复草案。
- 草案只提供可人工执行的前置条件、步骤和脱敏样例，帮助跨团队协作。
- 对 P0 禁止执行的动作统一标记 `executionMode=manual_review_only`，避免 UI 或 API 被误解为自动修复入口。

## Non-Goals

- 不执行真实修复，不写 PlatformDepartment、PlatformUser、PlatformMembership、PlatformApiUserMapping 或 SourceConnection。
- 不新增修复执行 API、审批流、批量写入、source-system 写回或 Gateway facts 写入。
- 不触发 gateway projection publish，不读取 API/Gateway/Insight 内部库。
- 不修改 Feishu/WeCom 组织同步实现或 publish attempt history。

## Backend Design

新增 `OrganizationDirectoryRemediationActionDraftService`：

- 输入 `OrganizationDirectoryRemediationActionDraftQuery`：
  - `organization`
  - `actionAlias`
  - `reasonCode`
  - `entityType`
  - `qualityStatus`
  - `sourceType`
  - `sourceConnectionIdHash`
  - `keyword`
  - `limit`
  - `topN`
- 默认只读取 blocked/warning；显式 `qualityStatus=ready` 返回空 draft。
- 空 organization 返回空结果，不扫描跨组织数据。
- 非法 entityType、qualityStatus、actionAlias、limit/topN fail closed，返回 operator-readable error。
- service 复用 `OrganizationDirectoryQualityService` 获取 Admin-owned directory quality items，再复用 remediation plan action alias/priority/operator text 规则生成 draft。
- 当 `actionAlias` 和 `reasonCode` 同时提供时，draft 只保留两者同时命中的 items；当只提供 actionAlias 时，使用该 action 下所有匹配 reason；当只提供 reasonCode 时按 reason 推导 action。

响应：

- `organizationId`、`generatedAt`、`filters`、`totalDraftCount`、`drafts[]`、`exportSummary`、`boundary`
- `drafts[]`：
  - `draftId`
  - `actionAlias`
  - `priority`
  - `entityType`
  - `affectedCount`
  - `safeSummary`
  - `blockedReason`
  - `preconditions`
  - `operatorSteps`
  - `executionMode=manual_review_only`
  - `samples[]`
- `samples[]`：
  - `entityHash`
  - `displaySafeLabel`
  - `entityType`
  - `sourceType`
  - `qualityStatus`
  - `reasonCodes`
  - `lifecycleStatus`
  - `sourceConnectionIdHash`
  - `orgVersion`
  - `sourceVersion`

脱敏规则：

- `entityHash` 以 Admin 内部 entity identity 计算 hash。
- `displaySafeLabel` 只使用实体类型和 hash 片段，不使用真实姓名、手机号、邮箱、完整外部 ID、完整组织路径或 source payload。
- exportSummary 只包含 draft 安全字段和 sample 安全字段。

API：

- `GET /api/organization-master-data-quality/remediation-action-drafts`
- authz 归属与 directory quality/remediation plan 相同，使用 query `organization` 作为对象 owner。

## Frontend Design

在 `OrganizationDirectoryQualityPage` 的 remediation plan 表格中新增“草案”操作：

- 点击后打开 Drawer。
- Drawer 调用 action draft API，带上当前 organization、plan actionAlias、当前筛选条件和 limit/topN。
- 展示 `executionMode=manual_review_only`、priority、affected count、blocked reason、preconditions、operator steps、脱敏 samples。
- 支持复制 JSON 和下载 JSON，均基于 API 返回的 `exportSummary` 或当前 draft 安全字段。
- 空态、加载态、错误态使用现有页面模式；不提供执行、修复、写入、publish 按钮。

## Verification Strategy

- Go object tests：覆盖 actionAlias/reasonCode 分类、manual_review_only、preconditions/operator steps、ready 空态、无 organization 空态、非法参数、store error、样例脱敏。
- Go controller/router tests：覆盖 query helper 和 organization scoped authz path。
- Frontend tests：覆盖 backend wrapper URL、Setting allowlist、从 plan 行打开 draft drawer、展示 manual review only、复制/导出脱敏 JSON。
- 验证命令：target OpenSpec strict、archive 前后 changes/specs strict、Go focused tests/coverage、frontend focused tests/build、`git diff --check`。
