## ADDED Requirements

### Requirement: Organization tree operations evidence snapshot guardrail
系统 SHALL 为 admin 组织树运营 smoke 提供只读 evidence snapshot guardrail，用于把诊断、只读刷新状态、可选组织树响应或 operator 粘贴的受控响应整理为脱敏、可提交、可回传的最小证据包。

#### Scenario: Evidence snapshot summarizes only safe fields
- **WHEN** evidence snapshot 接收到可信诊断、只读刷新状态和受控非空组织树证明
- **THEN** snapshot SHALL 返回 `status`、稳定 alias、counts、检查状态、owner handoff、最小解除条件和不能外推边界
- **AND** snapshot SHALL NOT 输出 token、Cookie、Authorization、私有 URL、真实账号、手机号、邮箱、完整 organizationId、完整组织树节点列表、完整诊断响应或完整来源响应体

#### Scenario: Evidence snapshot remains useful for blocked states
- **WHEN** 诊断显示 `empty_tree`、`non_empty_fixture_missing`、`read_model_untrusted`、`source_connection_stale`、`lineage_missing` 或 `refresh_status_unavailable`
- **THEN** snapshot SHALL 保留稳定 alias、owner handoff 和最小解除条件
- **AND** snapshot SHALL NOT 将普通空树、consumer-only 结果、Insight fallback 或 summary 输出外推为 Admin 非空组织树运营成功

#### Scenario: Evidence snapshot sanitization fails closed
- **WHEN** snapshot 输入包含疑似 token、Cookie、Bearer、私有 URL、邮箱、手机号、真实账号、source tenant metadata、完整组织树节点列表或完整响应体迹象
- **THEN** snapshot SHALL 返回 `status=blocked`
- **AND** snapshot SHALL 使用 `organization_tree_evidence_sanitization_failed` 稳定 alias
- **AND** snapshot SHALL 只保留最小排障字段和删除敏感输入后重跑的解除条件

#### Scenario: Evidence snapshot does not become a cross-service contract
- **WHEN** API/gateway 或 Insight 需要组织、scope、projection 或授权数据
- **THEN** API/gateway SHALL 继续消费 admin-to-gateway projection contract
- **AND** Insight SHALL 继续只读消费 admin provider
- **AND** 系统 SHALL NOT 要求这些下游直接消费 evidence snapshot、Bruno smoke 响应或 admin 管理页面组织树 JSON
