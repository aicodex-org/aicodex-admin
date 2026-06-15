## Goals

- 让 operator 能在 action draft 内查看执行前只读预检，明确该 draft 是否适合进入人工复核。
- 用稳定字段表达阻塞原因、安全检查清单、影响计数和脱敏样例，降低跨团队交接时的误解和泄漏风险。
- 始终保留 `executionMode=manual_review_only` 和 `autoExecutionAllowed=false`，避免 P0 被解释为自动修复能力。

## Non-Goals

- 不执行真实修复，不写 PlatformDepartment、PlatformUser、PlatformMembership、PlatformApiUserMapping 或 SourceConnection。
- 不新增修复执行 API、审批流、批量写入、source-system 写回或 Gateway facts 写入。
- 不触发 gateway projection publish，不读取 API/Gateway/Insight 内部库。
- 不修改 Feishu/WeCom 组织同步实现或 projection retention cleanup dry-run。

## Backend Design

新增 `OrganizationDirectoryRemediationPreflightService`：

- 输入 `OrganizationDirectoryRemediationPreflightQuery`：
  - `organization`
  - `draftId`
  - `actionAlias`
  - `reasonCode`
  - `entityType`
  - `qualityStatus`
  - `sourceType`
  - `sourceConnectionIdHash`
  - `keyword`
  - `limit`
  - `topN`
- 当提供 `draftId` 时，preflight 只返回匹配 draft；找不到 draft 时 fail-closed 返回 blocked preflight，而不是默默通过。
- 当未提供 `draftId` 时，使用 `actionAlias/reasonCode/entityType/qualityStatus/sourceType/sourceConnectionIdHash/keyword` 生成候选 action drafts，再对每个 draft 生成 preflight。
- 空 organization 返回空 preflight result，不扫描跨组织数据。
- 显式 `qualityStatus=ready`、空 draft、非法 entity/status/action/limit/topN、内部 read model error 均 fail closed。
- preflight 只读取 Admin-owned directory quality 和 draft metadata；不调用修复、publish 或下游内部库。

响应：

- `organizationId`、`generatedAt`、`filters`、`totalPreflightCount`、`preflights[]`、`exportSummary`、`boundary`
- `preflights[]`：
  - `preflightId`
  - `draftId`
  - `actionAlias`
  - `entityType`
  - `executionMode=manual_review_only`
  - `readyForManualReview`
  - `autoExecutionAllowed=false`
  - `blockedReasons`
  - `preconditions`
  - `safetyChecklist`
  - `affectedCounts`
  - `sampleDigests`
  - `operatorNextSteps`

Ready 规则：

- draft 存在、affectedCount 大于 0、preconditions 非空、sampleDigests 非空时，`readyForManualReview=true`。
- 任何输入空态、draftId 未命中、draft 无样例、draft 无前置条件或 read model error 都 `readyForManualReview=false` 并返回阻塞原因。
- `autoExecutionAllowed` 永远为 false。

脱敏规则：

- `sampleDigests` 仅包含 stable hash、display-safe label、entity type、source type、quality status、reason/status codes、lifecycle status、hashed source connection identifiers、source/org version summaries。
- 不返回真实姓名、手机号、邮箱、完整 external profile、完整组织树、source payload、token、Cookie、私有 URL 或 source-system credentials。

API：

- `GET /api/organization-master-data-quality/remediation-preflight`
- authz 归属与 directory quality/remediation plan/action draft 相同，使用 query `organization` 作为对象 owner。

## Frontend Design

在 `OrganizationDirectoryQualityPage` 的 action draft Drawer 中增加“预检”能力：

- 每个 draft 行提供“预检”按钮，或 Drawer 顶部提供基于当前 draft 查询的预检区域。
- 调用 Admin preflight read API，携带当前 organization、draftId 或 actionAlias/reasonCode/entityType/qualityStatus/sourceType/sourceConnectionIdHash/keyword/limit/topN。
- 展示 ready/blocker、`executionMode=manual_review_only`、`autoExecutionAllowed=false`、preconditions、safetyChecklist、affectedCounts、operatorNextSteps 和脱敏 sampleDigests。
- 支持导出 sanitized preflight JSON。
- 空态、加载态、错误态使用现有页面模式；不提供执行、修复、写入、publish 按钮。

## Verification Strategy

- Go object tests：覆盖 ready manual-review preflight、draftId 过滤、missing draft fail-closed、空 organization、非法参数、store error、脱敏 sampleDigests、autoExecutionAllowed=false。
- Go controller/router tests：覆盖 query helper 和 organization scoped authz path。
- Frontend tests：覆盖 backend wrapper URL、Setting allowlist、从 action draft Drawer 触发 preflight、展示 ready/blocker/安全清单、导出脱敏 JSON。
- 验证命令：target OpenSpec strict、archive 前后 changes/specs strict、Go focused tests/coverage、frontend focused tests/build、`git diff --check`。
