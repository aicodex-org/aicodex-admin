# admin-organization-tree-operations Specification

## Purpose
定义 admin 后台组织架构树运营化能力，用于管理员查看平台组织树 read model 状态、诊断空树和异常节点、执行受控刷新，并保持 Admin/API/Insight 组织边界不被误用。
## Requirements
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

### Requirement: Member diagnostics view
系统 SHALL 在 admin 组织树运营能力中提供只读成员诊断视图，用于管理员排查部门成员归属、生命周期、mapping 状态和来源连接质量。

#### Scenario: Administrator views department member summary
- **WHEN** 管理员打开组织树运营页并查看部门节点
- **THEN** 系统 SHALL 显示该部门的成员摘要，例如成员总数、active 成员数、disabled 成员数、conflicted 成员数、mapping 异常数和 stale 成员数
- **AND** 系统 SHALL 使用平台部门 ID、稳定 subject ID、SourceConnection 和 lineage 作为诊断依据
- **AND** 系统 SHALL NOT 使用手机号、邮箱、昵称或 displayName 作为授权 join key

#### Scenario: Administrator opens member view
- **WHEN** 管理员切换到 `成员视图`、`含成员树` 或等价入口
- **THEN** 系统 SHALL 在部门上下文中展示轻量成员信息，包括脱敏 display metadata、稳定 subject 标识短显、`lifecycleStatus`、`mappingStatus`、`sourceType`、`sourceConnectionId`、`readModelSource` 和 freshness 摘要
- **AND** 系统 SHALL 默认保持部门树视图不被成员节点替代
- **AND** 系统 SHALL 对大组织采用分页、按部门懒加载或等价保护，避免默认全量展开所有成员

#### Scenario: Member diagnostics stay read-only and fail closed
- **WHEN** 成员、成员关系、ExternalIdentity、mapping、SourceConnection 或 lineage 处于 disabled、deleted、conflicted、stale 或不可判定状态
- **THEN** 系统 SHALL 将该成员展示为诊断项或异常成员
- **AND** 系统 SHALL NOT 使用该成员扩大组织树可见范围、报表 scope 或 gateway projection 输入
- **AND** 系统 SHALL NOT 提供成员源事实编辑、权限矩阵编辑或 gateway authorization facts 写入

#### Scenario: Member view is not a cross-service contract
- **WHEN** API/gateway 或 Insight 需要组织、scope、projection 或授权数据
- **THEN** API/gateway SHALL 继续消费 admin-to-gateway projection contract
- **AND** Insight SHALL 继续只读消费 admin provider
- **AND** 系统 SHALL NOT 要求这些下游直接消费 admin 管理页面成员树 JSON

### Requirement: Organization tree operations Bruno helpers use TypeScript source with CommonJS entries
Organization tree operations local-only Bruno helpers SHALL be maintainable as TypeScript source while preserving the existing CommonJS JavaScript entrypoints and read-only helper behavior.

#### Scenario: TypeScript source generates existing organization helper entries
- **WHEN** the organization tree operations Bruno helper batch is migrated
- **THEN** every touched `organizationTreeOperations*.js` helper and `organizationTreeOperations*.test.js` test SHALL have an equivalent `.ts` source file in `api-tests/bruno/aicodex-admin/scripts`
- **AND** the generated `.js` CommonJS entries SHALL continue to support existing `require("./organizationTreeOperations...")` consumers and `node --test` execution
- **AND** generation SHALL be reproducible by a change-scoped TypeScript command that does not depend on Gateway migration scaffolding

#### Scenario: Source migration preserves organization safety boundaries
- **WHEN** the generated organization tree operations helper JS entries are tested
- **THEN** the existing node:test suites SHALL still execute non-zero tests and pass
- **AND** stable aliases, owner handoff limits, redaction/fail-closed behavior, non-empty tree evidence limits, refresh-status handling, full-success rejection, local-only scope and non-extrapolation boundaries SHALL remain unchanged
- **AND** the migration SHALL NOT query real databases, write fixtures, rebuild organization trees, call API/Insight/Gateway, or expose token, Cookie, private URL, real account, phone, email, complete organization tree or raw payload values

#### Scenario: Organization helper TypeScript stays isolated from Gateway work
- **WHEN** this batch adds TypeScript configuration or Node/CommonJS declarations
- **THEN** the configuration SHALL include only `wecomSource*.ts`, `wecomSource*.test.ts`, `organizationTreeOperations*.ts`, `organizationTreeOperations*.test.ts` and change-scoped declaration files
- **AND** the migration SHALL NOT create or modify `node-globals.d.ts`, `gatewayProjection*`, `api-tests/bruno/aicodex-admin/README.md`, `web-admin/**`, public raw scripts, build tooling, Cypress or Swagger vendor JS
