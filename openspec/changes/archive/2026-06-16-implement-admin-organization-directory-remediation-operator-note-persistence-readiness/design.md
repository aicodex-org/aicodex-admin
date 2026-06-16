## Context

上一阶段的 approval packet operator notes 明确是 `derived_note_draft` 与 `not_persisted`，只用于人工 handoff 草稿。当前路线需要在真实持久化前先建立可验证的 readiness contract，避免未定义幂等键、权限、保留期或审计边界时直接引入写入路径。

本 change 复用 Admin-owned approval packet operator notes、approval packet audit、approval preview、preflight 和 action draft metadata。它不新增持久 store，也不把 readiness 结果写回任何组织主数据或 Gateway facts。

## Goals / Non-Goals

**Goals:**

- 为指定 organization 和 note/packet/preview/draft/action filter 生成 operator note persistence readiness。
- 明确未来持久化必须满足的权限模型、幂等键组成、保留期策略、审计语义、脱敏字段、manual review gate 和 cannotInfer 边界。
- 输出稳定 readiness id/hash、blocked reasons、checklist、safe summary、export summary。
- 在 web-admin 交接备注区域提供只读“持久化准入”入口，覆盖 loading、empty、error、disabled、blocked/ready-for-design-review 和 long text。
- 测试覆盖 ready-for-design-review、blocked/missing note、ready filter empty、invalid filter、redaction、idempotency key 和 UI copy/export。

**Non-Goals:**

- 不新增真实 notes store、数据库迁移、评论系统、审批执行流或工单系统。
- 不执行 remediation，不写组织主数据，不修复 membership/user/department 关系。
- 不触发 gateway projection publish，不写 Gateway facts，不查询 API/Gateway/Insight 内部库。
- 不修改 Feishu/WeCom 同步实现，不触碰 OIDC/auth center shell/WeCom login config 写集。

## Decisions

1. **P0 readiness 只读派生，不落库。**
   - 方案：新增 service/API 基于 operator notes 结果生成 `storageScope=readiness_only` 与 `persistenceAllowed=false` 的 readiness record。
   - 理由：用户明确要求真实持久 store 需要主控决策；readiness 能让下一步设计有检查清单，而不会引入未审批写路径。

2. **`readyForPersistenceDesignReview` 与 `persistenceAllowed` 分离。**
   - 方案：当 note metadata、manual review gate、idempotency components、redaction policy 和 cannotInfer 边界齐备时，返回 `readinessStatus=ready_for_design_review`；但始终 `persistenceAllowed=false`、`storeDecisionRequired=true`。
   - 理由：当前 change 可证明 contract 准备度，但不能替代真实持久 store 的产品和数据治理决策。

3. **幂等键基于脱敏稳定摘要。**
   - 方案：`idempotencyKey` 由 organization、noteHash、packetHash、approvalPreviewHash、draftId、actionAlias、noteScope、retentionPolicy、manual_review_only 组成。
   - 理由：这些字段足以描述同一 operator note 草稿的持久化候选，不包含真实人员明细、联系方式或 source payload。

4. **所有导出由后端集中构建并脱敏。**
   - 方案：后端输出 `exportSummary`，只包含 stable hash、display-safe aliases、risk/status/reason/version/manual_review_only/checklist/cannotInfer。
   - 理由：避免前端拼接时误透传敏感字段或把 readiness 描述成可执行写入。

5. **fail-closed。**
   - 方案：缺少 organization、ready quality filter、missing note、invalid filter、notes service 错误都不得返回可持久化状态；blocked note 或缺少样例时保留 blocker。
   - 理由：readiness 只用于人工准入检查，不能成为绕过人工复核或权限的写入口。

## Risks / Trade-offs

- [Risk] readiness 面板可能被误认为已经支持保存备注。Mitigation：响应和 UI 固定显示 `persistenceAllowed=false`、`storeDecisionRequired=true`、`storageScope=readiness_only`。
- [Risk] 未落库导致无法协作编辑或审计真实点击。Mitigation：本 change 明确 non-goal，下一步以 Admin-owned persistent notes store readiness/implementation 单独决策。
- [Risk] summary 泄漏敏感字段。Mitigation：后端 export 只含稳定 hash 和安全 alias，测试覆盖 forbidden terms。

## Migration Plan

- 无数据库迁移。
- 发布时新增只读 GET endpoint 与前端入口；旧 remediation plan/action draft/preflight/approval preview/audit/operator notes API 保持兼容。
- 回滚时移除前端入口即可停止用户访问，后端 endpoint 无写入副作用。

## Open Questions

无。P0 明确不新增真实持久 store；如后续要落库，需要主控另行确认 store schema、保留期、权限与审计写入语义。
