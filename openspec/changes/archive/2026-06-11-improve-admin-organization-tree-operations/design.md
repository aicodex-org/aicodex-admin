## Context

admin 侧已经完成组织主模型、organization-tree provider、read model envelope、freshness/lineage 和 smoke 合同收口。现有 provider 可以给 Insight 使用，但管理员在 admin 后台仍缺少一个稳定的运营化入口来确认组织树当前是否可信、为什么为空、哪些节点被 fail closed、最新同步批次是什么、SourceConnection 是否 stale/disabled。

本 change 继续沿用 `define-aicodex-organization-data-and-auth-boundaries` 边界：admin 是组织主模型和组织树 owner；API/gateway 不直接消费 admin 管理组织树 JSON；Insight 只读消费 provider。这里新增的是 admin 内部产品能力，不是跨服务授权 contract。

## Goals / Non-Goals

**Goals:**

- 给管理员和研发提供 admin 侧组织架构树运营工作台，能查看树、搜索节点、筛选异常、定位 freshness/lineage/sourceConnection/sync batch 问题。
- 让 60 smoke 中的“空树、版本缺失、freshness 异常、SourceConnection 不可信”可以在 admin 内部直接定位 owner 和原因。
- 提供受控刷新动作，用于重新加载状态或触发幂等 read model 重建/刷新任务。
- 对所有诊断和操作输出脱敏、审计，并保持 fail-closed 语义。

**Non-Goals:**

- 不建设完整组织架构编辑后台，不在本 change 中编辑部门、人员、负责人、直属上级或映射关系。
- 不改变 `GET /api/admin-provider/insight/v1/current-user/organization-tree` 的跨服务消费契约。
- 不让 API/gateway 直接消费 admin 管理页面组织树 JSON；gateway 仍只消费 admin-to-gateway projection contract。
- 不让 Insight 在本地补算组织树、scope 或 projection。
- 不扩大到多来源人工冲突确认、完整数据治理工作流或历史快照报表。

## Decisions

### 1. 新增 admin 内部运营能力，而不是改 provider 语义

运营页读取 admin 内部诊断接口或复用 provider/service 的 read model builder，但展示目的和跨服务 provider 目的分开。这样可以让管理员看到更丰富的诊断字段，同时不把这些字段强塞进 Insight provider 合同。

备选方案是直接让管理员访问 Insight provider 响应。该方案字段受跨服务合同约束，难以表达 SourceConnection、sync batch、filtered node reason 和刷新动作，因此不采用。

### 2. 后端仍是安全边界

组织树可见范围、节点过滤、生命周期、mapping、SourceConnection freshness 和 direct leader 规则仍在后端计算。前端只负责展示、搜索和二次筛选，不能把隐藏节点重新拼出来，也不能通过 displayName、手机号、邮箱或 sourceTenantId 做授权判断。

### 3. 运营数据来自平台组织主模型和 read model lineage

页面展示的平台部门、节点状态、来源连接、同步批次、readModelSource、orgVersion/scopeVersion 和 freshness 必须来自 `PlatformDepartment`、平台成员关系、`SourceConnection`、`OrgSyncBatch`、ExternalIdentity/mapping 状态和已归档的 organization-tree read model 口径。旧 `Group` 只能作为兼容投影或展示字段来源，并且必须显示 `readModelSource=compat_group` 或等价诊断。

### 4. 刷新动作只做幂等诊断/重建，不做源事实编辑

运营页可以提供“刷新状态”和“触发 read model 重建/刷新”两类动作：

- 刷新状态只重新拉取当前诊断结果。
- read model 重建/刷新首版不新增独立持久化 builder；后端重新计算诊断 read model，并在存在已配置且启用的来源同步能力时复用现有 source adapter / sync batch 幂等路径，例如 WeCom 组织同步 run，记录 actor、traceId、target organization、triggerType 和结果。
- 如果目标组织没有可用来源同步配置，重建/刷新动作必须返回稳定 unsupported 或 unavailable 诊断结果，而不是直接改写平台组织主数据。

该动作不得直接改写 gateway authorization facts、不得绕过 SourceConnection 状态、不得把 stale/disabled 数据标记为可信。

### 5. 菜单入口挂在 Admin 下并靠近同步能力

首版页面挂在现有 `Admin` 导航组，路由建议为 `/organization-tree-operations`，菜单项放在“企业微信同步”附近。该位置符合当前 web-admin 导航结构，也能把“来源同步配置/运行记录”和“平台组织树 read model 诊断”区分开。

如果后续导航容量或产品信息架构调整，可以把它迁移到独立“组织架构”分组；迁移不得改变后端 admin-only 权限边界和跨服务消费边界。

### 6. 空树必须可解释

页面需要把空树分为至少三类：

- 业务空结果：当前 scope 可信且确实没有可管理节点。
- 数据缺口：测试账号、source sync 或平台部门数据不足，不能证明非空组织树能力。
- 不可信 read model：生命周期、SourceConnection、lineage、mapping 或同步批次不可判定，需要 fail closed。

这能避免再把普通空树 smoke 当成“组织树能力通过”。

## Risks / Trade-offs

- 诊断字段过多导致页面变成内部调试面板 -> 首版只做组织树稳定交付所需字段，默认展示摘要，详细 lineage 放抽屉/详情。
- 刷新动作被误用成组织数据修复入口 -> 只允许幂等刷新/重建，不允许编辑源事实；所有操作必须审计。
- 旧 `Group` 兼容路径继续被误解为权威 -> 页面必须显示 `readModelSource` 和来源说明，compat 数据只能作为迁移提示。
- 真实组织明细或个人信息泄露 -> 诊断响应和日志不得返回 token、Cookie、Secret、手机号明文、邮箱明文、完整来源响应或真实敏感明细。
- 与现有 WeCom 同步页面重复 -> WeCom 同步页负责来源配置和同步记录；组织树运营页负责平台 read model 状态、节点可见性和跨服务消费前的稳定性诊断。

## Migration Plan

1. 先补后端只读诊断 DTO 和测试，复用现有组织树 read model/service 口径。
2. 再接入 admin 页面和菜单入口，默认只对全局管理员或目标组织管理员可见。
3. 最后加入幂等刷新/重建动作和审计日志；若刷新能力依赖现有 worker，先以“触发任务并返回 batch/trace”方式接入。
4. 回滚时隐藏菜单和刷新动作，保留 provider/read model 原有行为不变。

## Open Questions

无。首版刷新范围和菜单位置已在 Decisions 中收口；如后续需要新增独立 read model builder 或调整导航信息架构，应另开 change。
