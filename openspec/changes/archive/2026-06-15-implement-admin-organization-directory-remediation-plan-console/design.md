## Goals

- 把目录质量明细聚合成 operator 可执行的只读 remediation plan。
- 明确修复优先级和影响计数，帮助 operator 判断先处理 source、mapping、identity conflict、lifecycle 还是 membership。
- 导出摘要保持脱敏，适合跨团队协作但不能泄露真实外部身份或完整组织树。

## Non-Goals

- 不执行修复动作，不写 Admin 主数据、Gateway facts、API mapping 或同步状态。
- 不触发 gateway projection publish，不调用 Gateway ingestion 写接口。
- 不读取 API、Gateway、Insight 内部库。
- 不实现 Feishu dry-run diff 或 publish attempt history。

## Backend Design

新增 `OrganizationDirectoryRemediationPlanService`，默认复用 `OrganizationDirectoryQualityService`：

- 输入 `OrganizationDirectoryRemediationPlanQuery`：`organization`、`entityType`、`qualityStatus`、`reasonCode`、`sourceType`、`sourceConnectionIdHash`、`keyword`、`limit`、`topN`。
- 默认只聚合 `blocked` 和 `warning` 质量记录；显式传入 `qualityStatus=ready` 时返回空 plan，避免把健康目录数据误标为待修复项。
- service 逐类读取目录质量结果。若指定 `entityType`，只读取该实体；未指定时读取 department/user/membership 三类，并对相同 action alias 聚合。
- 每个 quality item 的 reason codes 映射到稳定 action alias：
  - `source_refresh`：`source_freshness_untrusted`、`sync_lineage_missing`、`lineage_freshness_unavailable`
  - `blocked_by_credentials`：`source_connection_missing`、`source_connection_disabled`
  - `mapping_review`：`mapping_missing`、`mapping_untrusted`
  - `identity_conflict_review`：`duplicate_admin_subject`、`duplicate_department_source_key`、`duplicate_source_connection`
  - `lifecycle_cleanup`：`subject_not_active`
  - `membership_repair`：`membership_missing_user`、`membership_missing_department`、`orphan_department`
  - `manual_investigation`：未匹配的 blocked/warning reason
- priority 取 `P0/P1/P2/P3`：凭据/source connection 和 identity conflict 为 P0；mapping、membership active blocker、unavailable lineage/source refresh 为 P1；stale/unknown source refresh 和 lifecycle cleanup 为 P2；manual investigation 为 P3。

响应字段：

- `organizationId`、`generatedAt`、`filters`、`totalPlanCount`
- `plans[]`：`planId`、`planKey`、`priority`、`actionAlias`、`reasonCodes`、`affectedCounts`、`sampleEntityIds`、`sampleEntityHashes`、`sourceVersions`、`orgVersions`、`safeSummary`、`operatorActions`、`blockedReason`
- `exportSummary`：仅包含脱敏 plan 摘要，供前端下载 JSON/CSV。
- `boundary`：明确只读诊断，不执行修复。

非法参数 fail closed：不支持的 entityType、qualityStatus、limit/topN 越界返回 error；空 organization 返回空 plan，不跨组织扫描。`limit/topN` 默认 20，最大 100。

## Frontend Design

在 `OrganizationDirectoryQualityPage` 中增加 remediation plan 面板：

- 与当前组织和筛选条件联动，提供刷新按钮。
- 表格或紧凑列表展示 priority、actionAlias、affected count、reason codes、sample entity、safe summary。
- 导出按钮在浏览器端基于 API 返回的脱敏 `exportSummary` 下载 JSON；不请求写入端点。
- 空态、加载态、错误态和只读边界提示与目录质量列表一致。

## Verification Strategy

- Go：service tests 覆盖 plan 分类、优先级、聚合、过滤、样例脱敏、空态和 store error；controller/router tests 覆盖 API 查询和 organization scoped authz。
- Frontend：backend wrapper URL 参数测试；页面测试覆盖 plan 展示、刷新、导出和空态。
- OpenSpec：target change strict、all changes strict、all specs strict。
- Build：`yarn build`；记录既有 warning。
- 覆盖率：统计受影响 Go production file changed-file coverage，目标 >=85%。
