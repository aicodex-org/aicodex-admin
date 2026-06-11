## Why

`define-aicodex-organization-data-and-auth-boundaries` 已经明确 `aicodex-admin` 是组织主模型和组织树 provider 的 owner，`stabilize-admin-organization-tree-read-model` 也已把 read model/envelope/fail-closed 口径归档到主规格。现在领导要求尽快把 admin 侧组织架构树做稳定，下一步需要把“能返回稳定 provider”推进为“管理员能看见、诊断、定位和安全运营”的产品能力。

当前缺口不是重新定义跨服务边界，而是 admin 侧缺少一个面向运营和排障的组织树工作台：当 60 smoke 出现空树、freshness 过期、SourceConnection 不可信、lineage 缺失或节点状态异常时，管理员/研发需要在 admin 内部直接看到 read model 状态和数据质量，而不是依赖 Insight 页面、API provider 或临时脚本反查。

## What Changes

- 新增 admin 组织架构树运营化能力，提供组织树总览、节点浏览、搜索、筛选、数据质量诊断和 lineage/freshness 展示。
- 在 admin 后台提供只面向 admin owner 的组织树运营入口，用于查看平台组织树 read model、SourceConnection 状态、同步批次、生命周期、mapping 状态、异常节点和空树原因。
- 提供安全的诊断/刷新动作：允许重新拉取 read model 状态或触发幂等的组织树 read model 重建/刷新任务，但不能直接编辑组织主数据、绕过 source adapter，也不能写 gateway authorization facts。
- 固化组织树稳定性验收：非空树、版本/freshness/lineage、禁用/冲突节点 fail closed、direct leader 不扩成部门子树、SourceConnection stale/disabled 不扩权。
- 保持跨服务边界：API/gateway 仍只消费 admin-to-gateway projection contract；Insight 仍只读消费 admin provider，不本地补算组织树或 scope。

## Capabilities

### New Capabilities

- `admin-organization-tree-operations`: 定义 admin 组织架构树运营化页面、诊断接口、安全操作、审计和验收口径。

### Modified Capabilities

- 无。现有 `admin-organization-master-model`、`organization-management-scope` 和 `insight-admin-provider-wrapper` 的 owner 边界保持不变；本 change 只在 admin 内部新增运营化能力并复用这些主规格。

## Impact

- 影响 `aicodex-admin` 后台页面、菜单/路由、组织树相关 controller/service、诊断 DTO、审计日志和测试。
- 不影响 `aicodex-api` 的 gateway authorization facts、runtime allow/deny 或 provider contract。
- 不影响 `aicodex-insight` 的组织树消费边界；Insight 仍通过 admin provider 读取组织树。
- 风险主要在组织树诊断信息脱敏、操作权限、幂等刷新和不要把诊断入口误做成组织主数据编辑后台。
