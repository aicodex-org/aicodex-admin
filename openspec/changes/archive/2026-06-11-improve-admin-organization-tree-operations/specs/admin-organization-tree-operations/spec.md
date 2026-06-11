## ADDED Requirements

### Requirement: Admin organization tree operations entry
系统 SHALL 在 `aicodex-admin` 后台提供组织架构树运营入口，用于管理员查看平台组织树 read model 状态、节点、版本、新鲜度和诊断信息。

#### Scenario: Authorized administrator opens the operations page
- **WHEN** 全局管理员或目标组织管理员打开组织架构树运营入口
- **THEN** 系统 SHALL 显示目标组织的组织树摘要、节点列表或树形视图、`orgVersion` 或 `scopeVersion`、`freshness`、`generatedAt`、`readModelSource` 和脱敏 lineage 摘要
- **AND** 系统 SHALL 提供当前组织选择或从登录上下文解析目标组织

#### Scenario: Unauthorized user is rejected
- **WHEN** 非管理员或不属于目标组织管理范围的用户访问组织架构树运营入口或诊断接口
- **THEN** 系统 SHALL 拒绝访问并返回稳定权限错误
- **AND** 系统 SHALL NOT 返回目标组织的节点、成员、lineage 或来源连接明细

#### Scenario: Operations entry does not become cross-service contract
- **WHEN** API/gateway 或 Insight 需要组织数据
- **THEN** API/gateway SHALL 继续消费 admin-to-gateway projection contract
- **AND** Insight SHALL 继续只读消费 admin provider
- **AND** 系统 SHALL NOT 要求这些下游直接消费 admin 管理页面组织树 JSON

### Requirement: Organization tree diagnostics
系统 SHALL 在组织架构树运营能力中提供可诊断的 read model 状态、数据质量摘要和异常原因。

#### Scenario: Diagnostic summary is returned
- **WHEN** 管理员查看组织树诊断摘要
- **THEN** 系统 SHALL 返回节点数量、可见节点数量、被过滤节点数量、sourceConnection 状态、最新可用 sync batch、`readModelSource`、`orgVersion` 或 `scopeVersion`、`freshness`、`generatedAt` 和脱敏 lineage 摘要
- **AND** 系统 SHALL 标记 `platform_department`、`mixed_platform_group`、`compat_group` 或等价 read model source

#### Scenario: Empty tree is classified
- **WHEN** 组织树 read model 返回空节点
- **THEN** 系统 SHALL 将空树分类为业务空结果、测试数据缺口或不可信 read model 中的一类
- **AND** 系统 SHALL 给出稳定诊断原因，例如 scope 可信但无节点、测试账号无可管理组织树、SourceConnection stale、lineage 缺失、同步批次不可用或节点全部被 fail closed
- **AND** 系统 SHALL NOT 将不可信 read model 伪装成业务成功空树

#### Scenario: Untrusted data remains fail closed
- **WHEN** 部门、父子关系、成员关系、负责人关系、直属上级关系、ExternalIdentity、mapping 或 SourceConnection 处于 disabled、deleted、conflicted、stale 或不可判定状态
- **THEN** 系统 SHALL 在运营诊断中展示脱敏异常摘要
- **AND** 系统 SHALL NOT 使用这些记录扩大可见组织树、报表 scope 或后续 projection 输入

### Requirement: Tree browsing, search, and filtering
系统 SHALL 支持管理员按稳定标识和状态浏览、搜索、筛选组织树节点，并明确展示字段和授权字段边界。

#### Scenario: Search by stable and display fields
- **WHEN** 管理员按部门名称、平台部门 ID、来源部门 ID、sourceConnectionId 或脱敏路径关键词搜索
- **THEN** 系统 SHALL 返回匹配节点及其父子上下文
- **AND** 系统 SHALL 使用稳定平台标识作为筛选和详情链接的主键
- **AND** 系统 SHALL NOT 使用手机号、邮箱、昵称或展示名作为授权 join key

#### Scenario: Filter by lifecycle and source state
- **WHEN** 管理员按 lifecycle、mappingStatus、sourceType、sourceConnection 状态、freshness 或 readModelSource 筛选
- **THEN** 系统 SHALL 返回符合条件的节点或异常摘要
- **AND** 系统 SHALL 清楚区分 active 可用节点、兼容展示节点和被 fail closed 的诊断项

#### Scenario: Direct leader scope is displayed without subtree expansion
- **WHEN** 诊断结果包含直属上级关系产生的可见范围
- **THEN** 系统 SHALL 标记该可见性来源
- **AND** 系统 SHALL NOT 将直属上级关系展示或计算为完整部门子树权限

### Requirement: Safe refresh and rebuild operations
系统 SHALL 仅提供受控、幂等、可审计的组织树状态刷新或 read model 重建动作。

#### Scenario: Refresh diagnostics
- **WHEN** 管理员点击刷新状态
- **THEN** 系统 SHALL 重新读取当前组织树诊断状态
- **AND** 系统 SHALL NOT 修改组织主数据、来源连接配置、gateway authorization facts 或 Insight 报表数据

#### Scenario: Trigger read model refresh
- **WHEN** 管理员触发组织树 read model 重建或刷新
- **THEN** 系统 SHALL 通过 admin 后端已有 source adapter、sync batch 或 read model builder 的幂等路径执行
- **AND** 系统 SHALL 返回或记录 `traceId`、actor、target organization、triggerType、任务状态和失败原因
- **AND** 系统 SHALL NOT 绕过 SourceConnection 状态、生命周期、mapping 或 lineage 校验

#### Scenario: Refresh operation is audited
- **WHEN** 刷新或重建动作被触发、成功、失败或被拒绝
- **THEN** 系统 SHALL 写入结构化审计日志
- **AND** 日志 SHALL 至少包含 `traceId`、actor、organization、operation、status、reason 和脱敏 lineage
- **AND** 日志 SHALL NOT 包含 token、Cookie、Secret、手机号明文、邮箱明文或完整来源响应体

### Requirement: Operations verification
系统 SHALL 为组织架构树运营能力提供自动化测试和 60 环境最小验证口径。

#### Scenario: Automated tests cover operations behavior
- **WHEN** 本 change 实施完成
- **THEN** 系统 SHALL 覆盖权限拒绝、诊断摘要、空树分类、异常节点 fail closed、搜索筛选、direct leader 不扩权、刷新动作幂等和审计脱敏测试

#### Scenario: 60 smoke verifies non-empty tree with diagnostics
- **WHEN** 在 60 测试环境验证组织架构树运营能力
- **THEN** 验证 SHALL 使用已知具备非空可管理组织树的测试账号或受控 fixture
- **AND** 验证 SHALL 确认节点非空、版本/freshness/lineage 存在、readModelSource 可诊断、SourceConnection 状态可信、刷新或重建动作有 trace/audit
- **AND** 验证 SHALL NOT 把普通空树、consumer-only 结果或 Insight fallback 记为 admin 组织树运营能力通过
