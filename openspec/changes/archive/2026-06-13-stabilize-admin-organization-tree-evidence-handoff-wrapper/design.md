## Context

Admin 组织树运营已有 `organizationTreeOperationsSmokeSummary.js` 和 `organizationTreeOperationsEvidenceSnapshot.js`。前者聚合只读诊断和可选响应，后者把 summary 结果整理成 evidence snapshot。当前缺口不是再造 readiness 或 evidence 规则，而是为协调层/operator 输出更小的 handoff summary，避免把 blocked/not checked、空树或 evidence snapshot 误写成 full-success。

约束：

- 只在 Admin Bruno smoke 和 OpenSpec 文档范围内修改。
- 不触发真实 read model 重建，不写真实 fixture，不查询真实 DB。
- 不把输出扩展为 API/Gateway/Insight 授权事实。
- 所有可复制结果必须脱敏，并对 token、Cookie、Bearer、私有 URL、账号、邮箱、手机号、完整组织树节点列表或完整响应体 fail closed。

## Goals / Non-Goals

**Goals:**

- 复用 readiness summary/evidence snapshot，不复制复杂诊断规则。
- 输出 `status`、`release`、`localBlockerCategory`、稳定 alias、脱敏 counts、owner handoff、最小解除条件、`doNotDispatchUntil` 和不能外推边界。
- 明确 `release=release_after_report` 只代表可交给协调层继续判断，不证明 `subjectCount>=1`。
- 为 blocked/not checked 状态提供稳定本地 blocker 分类和最小解除条件。

**Non-Goals:**

- 不新增服务端 API。
- 不新增真实 fixture 或真实环境访问。
- 不替代受控 60 smoke、真实 fixture 授权、真实 read model 重建或数据库核验。
- 不改变 API、Gateway、Insight owner 边界。

## Decisions

1. Handoff wrapper 输入接受 `evidenceSnapshot` 或 `summary`。
   - 原因：现有 evidence snapshot 已经复用 readiness 规则，wrapper 只做交接字段收敛；测试或本地 dry-run 也可以直接传 summary。
   - 替代方案：在 wrapper 内重新调用诊断规则。已拒绝，因为会复制 readiness 判断并增加漂移风险。

2. Handoff wrapper 不输出完整 `checks`。
   - 原因：协调层需要的是可复制摘要；完整检查明细可能携带过多内部状态，也会鼓励把局部 evidence 误当作完整 smoke 结论。
   - 替代方案：输出 `checkStatuses`。已拒绝，本次 P0 目标强调最小 handoff summary，alias、owner、condition 足够表达解除路径。

3. `release` 只允许 `release_after_report` 或 `hold`。
   - 原因：减少 operator 判断分支；`release_after_report` 不等于 full-success，只表示可以把脱敏证据包交给协调层。
   - 替代方案：沿用 evidence snapshot 的 `leaseReleaseRecommendation`。已拒绝，该字段适合证据快照内部语义，handoff 需要更直接的协调层口径。

4. 脱敏失败使用独立 alias `organization_tree_handoff_sanitization_failed`。
   - 原因：区分 summary/evidence snapshot 的 fail-closed 层级，便于 operator 知道是 handoff 输入或 metadata 不安全。
   - 替代方案：复用 `organization_tree_evidence_sanitization_failed`。已拒绝，可能误导排查入口。

## Risks / Trade-offs

- [Risk] 只做本地无密脚本验证，未执行真实 60 Bruno 登录态。
  Mitigation：文档和 handoff 边界明确不得替代受控 60 smoke 或真实 fixture 授权。
- [Risk] wrapper 脱敏规则可能比证据快照更严格，导致部分 operator metadata 被阻断。
  Mitigation：失败输出稳定 alias 和最小解除条件，要求使用脱敏 source alias。
- [Risk] `release_after_report` 被误读为业务成功。
  Mitigation：README、主规格和 wrapper `doNotDispatchUntil` 均明确它不是 `subjectCount>=1`、受控 60 smoke、真实 read model 重建或数据库核验证明。

## Migration Plan

无需服务端迁移。合入后 operator 可继续使用 `Readiness Summary.yml` 和 `Evidence Snapshot.yml`，需要协调层可复制摘要时改跑 `Handoff Summary.yml` 或本地 Node dry-run。

## Open Questions

无。真实 fixture、真实 DB、生产/类生产操作和跨 owner 决策仍需用户明确授权。
