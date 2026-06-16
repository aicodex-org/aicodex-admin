## ADDED Requirements

### Requirement: Organization tree operations smoke summary guardrail
系统 SHALL 为 admin 组织树运营 smoke 提供只读 readiness summary guardrail，用于把诊断、刷新状态和可选组织树响应汇总为脱敏、可重复、fail-closed 的 operator summary。

#### Scenario: Summary reports ready only for trusted non-empty admin tree
- **WHEN** smoke summary 接收到可信的 admin 组织树诊断、可用刷新状态和受控非空组织树响应
- **THEN** summary SHALL 返回整体 `status=ready`
- **AND** summary SHALL 标记关键检查为 `ready`
- **AND** summary SHALL 包含脱敏 counts、稳定 owner handoff、最小解除条件和不能外推边界
- **AND** summary SHALL NOT 输出完整组织树、完整 organizationId、真实账号、手机号、邮箱、token、Cookie、source tenant metadata 或完整来源响应体

#### Scenario: Empty or missing non-empty fixture blocks non-empty capability claim
- **WHEN** 诊断或可选组织树响应显示节点为空，或者 operator 未提供受控非空 fixture/响应证明
- **THEN** summary SHALL 返回 `status=blocked` 或对应检查 `status=not_checked`
- **AND** summary SHALL 使用 `empty_tree` 或 `non_empty_fixture_missing` 稳定 alias
- **AND** summary SHALL NOT 将普通空树、consumer-only 结果或 Insight fallback 记录为 Admin 非空组织树能力通过

#### Scenario: Untrusted read model and stale source remain fail closed
- **WHEN** 诊断显示 read model source 不可信、SourceConnection stale/disabled/unavailable、lineage 缺失、freshness 不可判定或 consumer-only/Insight fallback 信号
- **THEN** summary SHALL 返回 `status=blocked`
- **AND** summary SHALL 使用 `read_model_untrusted`、`source_connection_stale`、`lineage_missing` 或等价稳定 alias
- **AND** summary SHALL 给出最小解除条件，要求回到 Admin-owned source/read model/lineage 路径修复
- **AND** summary SHALL NOT 建议 API、Gateway 或 Insight 本地补算组织树、scope 或授权事实

#### Scenario: Refresh status is optional but explicit
- **WHEN** operator 未提供刷新状态响应
- **THEN** summary SHALL 将刷新状态检查标记为 `not_checked`
- **AND** summary SHALL NOT 因刷新状态未检查而声明完整 `ready`
- **WHEN** 刷新状态响应不可用、失败或缺少稳定状态
- **THEN** summary SHALL 返回 `refresh_status_unavailable` 稳定 alias

#### Scenario: Sanitization failure blocks summary
- **WHEN** summary 输入包含疑似 token、Cookie、Authorization、secret/config ref、source tenant metadata、手机号、邮箱或完整组织树敏感内容
- **THEN** summary SHALL 返回 `status=blocked`
- **AND** summary SHALL 使用 `sanitization_failed` 稳定 alias
- **AND** summary SHALL 只提示删除敏感输入后重跑，不输出敏感字段值

#### Scenario: Smoke summary assets do not become cross-service contracts
- **WHEN** API/gateway 或 Insight 需要组织、scope、projection 或授权数据
- **THEN** API/gateway SHALL 继续消费 admin-to-gateway projection contract
- **AND** Insight SHALL 继续只读消费 admin provider
- **AND** 系统 SHALL NOT 要求这些下游直接消费 admin 管理页面组织树 JSON、Bruno smoke 响应或 smoke summary 输出
