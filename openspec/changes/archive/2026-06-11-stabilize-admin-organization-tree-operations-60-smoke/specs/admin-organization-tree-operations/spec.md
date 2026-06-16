## ADDED Requirements

### Requirement: Runtime smoke readiness for organization tree operations
系统 SHALL 为 admin 组织树运营化能力提供可重复、脱敏、fail-closed 的 60 测试环境 smoke 口径。

#### Scenario: Non-empty tree smoke uses a trusted test account or fixture
- **WHEN** 60 smoke 要验证组织树运营能力通过
- **THEN** smoke SHALL 使用已知具备非空可管理组织树的测试账号或受控 fixture
- **AND** 诊断响应 SHALL 包含 `orgVersion` 或 `scopeVersion`、`freshness`、`generatedAt`、`lineage` 或等价脱敏 lineage 摘要、`readModelSource`、`nodes`、`diagnostics` 和 `sourceConnections`
- **AND** `nodes` SHALL 非空
- **AND** smoke SHALL NOT 把普通空树、consumer-only 结果或 Insight fallback 记为 admin 组织树运营能力通过

#### Scenario: Empty or untrusted tree remains classified
- **WHEN** 诊断接口返回空节点或不可信 read model
- **THEN** smoke SHALL 记录业务空结果、测试数据缺口或不可信 read model 分类
- **AND** smoke SHALL NOT 将该结果记录为非空组织树能力通过
- **AND** 系统 SHALL 继续保持 fail-closed，不绕过 SourceConnection、lifecycle、mapping 或 lineage 校验

#### Scenario: Refresh status smoke is read-only
- **WHEN** smoke 调用 `refresh_status`
- **THEN** 系统 SHALL 返回 `traceId`、`triggerType=refresh_status`、稳定状态和诊断摘要
- **AND** 系统 SHALL NOT 修改组织主数据、SourceConnection 配置、gateway authorization facts 或 Insight 报表数据

#### Scenario: Read model rebuild smoke is explicitly gated
- **WHEN** smoke 准备调用 `refresh_read_model`
- **THEN** smoke SHALL 默认阻断该请求，除非私有环境显式设置受控开关
- **AND** 被允许执行时，响应 SHALL 返回 `traceId`、`triggerType=refresh_read_model` 和稳定状态，例如 `accepted`、`running`、`unavailable` 或 `error`
- **AND** 验证 SHALL 只记录脱敏审计信号，不记录 token、Cookie、真实账号、手机号、邮箱、完整组织树或完整来源响应体

#### Scenario: Smoke assets do not become cross-service contracts
- **WHEN** API/gateway 或 Insight 需要组织、scope、projection 或授权数据
- **THEN** API/gateway SHALL 继续消费 admin-to-gateway projection contract
- **AND** Insight SHALL 继续只读消费 admin/API provider
- **AND** 系统 SHALL NOT 要求这些下游直接消费 admin 管理页面组织树 JSON 或 smoke 响应
