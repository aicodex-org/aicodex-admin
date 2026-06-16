## Context

Admin 组织目录 remediation 链路已经具备 action draft、preflight、execution approval preview、approval packet audit、operator notes 和 operator note persistence readiness。前两阶段明确 operator notes 是 `derived_note_draft` / `not_persisted`，persistence readiness 是 `readiness_only` / `persistenceAllowed=false` / `storeDecisionRequired=true`，因此当前仓库没有也不应在本 change 新增真实 notes store。

Operator 需要在人工审批交接时按安全字段检索这些已派生摘要，快速复核 packet、note、readiness、manual review blockers 和 cannotInfer 边界。本 change 复用既有 Admin-owned service/controller/router/authz 和 web-admin 组织目录质量页模式，只做当前可派生范围内的 readonly audit search。

## Goals / Non-Goals

**Goals:**

- 提供 organization-scoped、只读、Admin-owned 的 operator note / approval handoff audit search。
- 基于现有 approval packet audit、operator notes、persistence readiness、approval preview、preflight 和 action draft metadata 派生搜索结果。
- 支持 packet/note/readiness/preview/draft/action/risk/status/checklist/reason/keyword/limit/topN 等安全过滤。
- 输出 stable hash、display-safe label、risk/status/checklist/reason/version/manual-review-only、cannotInfer、redacted fields、readiness-only 和 historical persistence boundary。
- 在 web-admin 组织目录质量页 operator notes / persistence readiness 附近提供检索入口、详情、复制和导出脱敏 JSON/Markdown。
- 测试覆盖有结果、无结果、blocked/readiness-only、cannotInfer、脱敏导出、权限 object scope、历史检索需要持久 store 时 fail-closed。

**Non-Goals:**

- 不新增真实 persistent operator notes store、schema、retention job、audit write path、评论系统或工单系统。
- 不执行 remediation，不写组织主数据，不修复 membership/user/department 关系。
- 不触发 gateway projection publish，不写 Gateway facts，不查询 API/Gateway/Insight 内部库。
- 不修改 Feishu/WeCom sync、OIDC/auth center shell、WeCom login config 或主 Admin cleanup execution gate。
- 不提供跨历史持久检索承诺；缺少持久 store 时只能返回当前派生范围和 `persistenceRequiredForHistoricalSearch=true`。

## Decisions

1. **只读搜索服务组合既有派生服务，不新增存储。**
   - 方案：新增 `OrganizationDirectoryRemediationOperatorNoteReadonlyAuditSearchService`，内部调用 persistence readiness service；readiness service 已经通过 notes service 复用 packet audit / approval preview / preflight / action draft metadata。
   - 理由：搜索结果需要跨 note、packet、readiness 摘要，但当前能力都是可派生 read model；新增 store 会越过主控边界。
   - 替代方案：落库 notes/audit search 索引。该方案需要 retention、审计写入、幂等和权限编辑语义，当前任务明确禁止。

2. **历史检索 fail-closed，而不是伪造历史。**
   - 方案：当请求 `includeHistorical=true`、`historyMode=persistent`、`remediationRunId` 或其它当前派生链路无法证明的历史条件时，响应保留当前派生结果或空结果，同时设置 `persistenceRequiredForHistoricalSearch=true`，并在 `cannotInfer` 中说明没有 persistent notes store 时不能证明跨历史 completeness。
   - 理由：operator 可以看到边界，但不会误以为系统已保存长期 handoff note 审计。

3. **后端集中构建脱敏 JSON/Markdown export。**
   - 方案：后端输出 search-level `exportSummary` 和 item-level `markdownSummary`，只包含 stable hashes、display-safe labels、risk/status/checklist/reason aliases、manual-review-only、readiness-only、source/org version summary 和 cannotInfer。
   - 理由：前端只做展示、复制和下载，避免拼接时泄漏 raw payload、个人信息或完整组织树。

4. **保持既有 organization scoped authz 和 UI 路径。**
   - 方案：新增 controller method、router、authz allowlist 和 `Setting.js` API constant，前端在 OrganizationDirectoryQualityPage 内复用现有 operator notes/readiness 面板状态。
   - 理由：用户路径从 approval preview 到 audit、notes、readiness，再进行检索复核；无需新增路由或跨模块 shell。

5. **filter validation 继承现有 fail-closed 风格。**
   - 方案：后端 query 只接受既有安全枚举和分页限制；unsupported action/risk/status/entity/limit/historyMode 返回 operator-readable error。
   - 理由：空成功会让 operator 把无效筛选误判为没有风险；显式错误更安全。

## Risks / Trade-offs

- [Risk] 派生搜索不能证明跨历史完整性。Mitigation：响应和 UI 固定展示 `persistenceRequiredForHistoricalSearch` 与 cannotInfer，后续真实历史搜索另行设计 persistent store。
- [Risk] 搜索聚合多个派生服务后字段过多。Mitigation：DTO 只暴露 stable hash、safe label、status/risk/checklist/reason aliases 和 export summary，不透传 raw payload。
- [Risk] UI 复制/导出被误认为保存备注。Mitigation：所有详情和导出固定包含 `manual_review_only`、`autoExecutionAllowed=false`、`retentionPolicy=not_persisted`、`storageScope=readiness_only` 或 `derived_note_draft`。

## Migration Plan

- 无数据库迁移。
- 发布时新增只读 GET endpoint、authz allowlist、前端 backend wrapper 和组织目录质量页入口；旧 readiness/notes/audit API 保持兼容。
- 回滚时移除前端入口即可停止用户访问；后端 endpoint 无写入副作用。

## Open Questions

无。P0 固定为只读派生搜索；若实现发现必须落库才能满足需求，应立即停止并回传 `needs_master_decision=true`。
