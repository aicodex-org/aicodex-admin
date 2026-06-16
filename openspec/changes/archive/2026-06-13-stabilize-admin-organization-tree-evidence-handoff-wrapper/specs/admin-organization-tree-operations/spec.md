## ADDED Requirements

### Requirement: Organization tree operations handoff summary wrapper
系统 SHALL 为 admin 组织树运营 smoke 和 evidence snapshot 提供只读 handoff summary wrapper，用于将 Admin-owned 证据结果转换为协调层或 operator 可复制的最小交接摘要。

#### Scenario: Handoff summary exposes only release-safe fields
- **WHEN** handoff summary 接收到可信 readiness summary 或 evidence snapshot
- **THEN** handoff SHALL 返回 `status`、`release`、`localBlockerCategory`、稳定 alias、脱敏 counts、owner handoff、最小解除条件、`doNotDispatchUntil` 和不能外推边界
- **AND** `release=release_after_report` 只表示该 handoff 可交给协调层继续判断
- **AND** handoff SHALL NOT 输出完整检查明细、完整诊断响应、完整来源响应体、完整组织树节点列表、完整 organizationId、token、Cookie、Bearer、私有 URL、真实账号、手机号或邮箱

#### Scenario: Blocked or not checked evidence stays non-releasable
- **WHEN** readiness summary 或 evidence snapshot 为 `blocked` 或 `not_checked`
- **THEN** handoff SHALL 返回 `release=hold`
- **AND** handoff SHALL 保留稳定 alias、owner handoff、最小解除条件和 `doNotDispatchUntil`
- **AND** handoff SHALL 使用本地 blocker 分类区分 `local_evidence_not_checked`、`fixture_or_local_check_blocked`、`admin_source_or_read_model_blocked` 或等价稳定分类
- **AND** handoff SHALL NOT 将空树、consumer-only、Insight fallback、not checked 或 evidence snapshot 结果写成 full-success

#### Scenario: Handoff summary sanitization fails closed
- **WHEN** handoff 输入或 operator metadata 包含疑似 token、Cookie、Bearer、私有 URL、邮箱、手机号、账号、source tenant metadata、完整组织树节点列表或完整响应体迹象
- **THEN** handoff SHALL 返回 `status=blocked` 和 `release=hold`
- **AND** handoff SHALL 使用 `organization_tree_handoff_sanitization_failed` 稳定 alias
- **AND** handoff SHALL 只保留删除敏感输入后重跑的最小解除条件，且不得回显敏感内容

#### Scenario: Handoff summary does not replace controlled validation
- **WHEN** operator 或协调层读取 handoff summary
- **THEN** handoff SHALL 明确不能证明 `subjectCount>=1`
- **AND** handoff SHALL 明确不能替代受控 60 smoke、真实 fixture 授权、真实 read model 重建或数据库核验
- **AND** handoff SHALL NOT 成为 API/Gateway/Insight 授权事实或跨服务 contract
