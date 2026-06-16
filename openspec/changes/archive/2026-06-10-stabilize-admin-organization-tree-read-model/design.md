## Goals

1. 让 admin 组织架构树成为稳定、版本化、可诊断的组织 read model。
2. 让 `organization-tree` provider 与 admin 组织主模型、report scope provider 和 gateway projection builder 使用同一套组织事实口径。
3. 支持领导/管理员看到可信组织树，也支持 Insight 继续按 admin provider 做部门筛选和报表 scope。
4. 为后续 API/gateway projection 提供稳定上游，但不让 API 直接消费管理页面组织树 JSON。

## Current State

当前 provider 路由为 `GET /api/admin-provider/insight/v1/current-user/organization-tree`。实现读取 `object.GetGroups(organization)` 构造树，再读取 `object.GetPlatformDepartments(organization)` 为节点补 `sourceType`、`sourceConnectionId` 和 lifecycle。

这能支撑早期 Insight 展示，但存在几个稳定性缺口：

- 旧 `Group` 仍是主要树结构来源，容易把兼容展示数据误认为组织主事实。
- provider 成功响应是节点数组，缺少顶层 `orgVersion`、`freshness`、`generatedAt` 和 lineage envelope。
- 可管理范围与平台组织主模型关系需要进一步收敛，尤其是多部门、部门负责人、直属上级、禁用/冲突节点。
- 60 环境缺少专门组织树 smoke，当前跨服务 smoke 只能证明 projection 状态，不证明组织树产品能力稳定。

## Decisions

### 1. PlatformDepartment 优先

稳定组织树 read model 优先使用 `PlatformDepartment`、平台成员关系、生命周期、SourceConnection 和 OrgSyncBatch lineage。旧 `Group` 可以继续作为兼容投影、迁移输入或缺失字段展示来源，但不能作为长期跨服务权威来源。

第一阶段允许在 PlatformDepartment 缺关键关系时保留兼容路径，但必须显式标记 `sourceType=group` 或 `readModelSource=compat_group`，并在 verification 里说明退出条件。

### 2. Provider Envelope 版本化

`organization-tree` provider 应返回可版本化 envelope。兼容旧数组响应时，也要在新字段中提供：

- `organization`
- `nodes[]`
- `orgVersion` 或 `scopeVersion`
- `freshness`
- `generatedAt`
- `lineage`
- `readModelSource`

节点字段至少包含 `departmentId`、`departmentName`、`parentDepartmentId`、`departmentPath`、`hasChildren`、`sourceType`、`sourceConnectionId`、`lifecycleStatus` 和必要的脱敏 lineage 摘要。

Provider 的传输层仍使用现有 `InsightProviderEnvelope`，即顶层保留 `status`、`traceId`、`data` 和 `error`。组织树 read model envelope 放在成功响应的 `data` 内，`data.nodes[]` 承载节点列表。为兼容仍按旧节点数组读取的 consumer，第一阶段 provider 应支持明确的兼容响应形态或兼容解包路径，并在 tasks/verification 中记录退出条件；不能让同一个 JSON 字段既被要求是数组又被要求是对象。

`orgVersion` 优先来自最新可用 `OrgSyncBatch.OrgVersion` 或平台部门快照版本；`scopeVersion` 可由组织版本、可见范围和生成时间派生。失败、运行中、缺少 `OrgVersion` 或缺少 `FinishedAt` 的同步批次只能作为诊断 lineage，不能覆盖上一份可用组织树版本，也不能把普通刷新时间误当成组织事实版本。

`lineage` 只暴露脱敏诊断摘要，例如 `sourceService=aicodex-admin`、`sourceConnectionId`、`sourceType`、`batchId`、`sourceOrgVersion`、`readModelSource` 和 `digest`。不得输出来源租户密钥、token、Cookie、手机号、邮箱或完整原始响应。

### 3. 可见范围后端计算

组织树可见范围必须在 admin 后端计算：

- 全局管理员或目标组织管理员可以查看目标组织树。
- 部门负责人可以查看其管理部门和 enabled 子孙部门。
- 直属上级可以查看其下属相关范围，但默认不能把直接下属关系推断为整棵部门子树权限；如为展示返回部门节点，只能覆盖已确认下属所在的 enabled 部门，不能包含祖先、兄弟或子孙部门扩权。
- 普通用户没有管理关系时返回空树或 self 相关诊断，不扩大为全公司。

前端不能成为安全边界；展示字段不能作为 join key。

实现时应复用或抽取 `OrganizationManagementScopeService` 的平台组织主模型计算口径，避免 `organization-tree` provider 在 `insight_provider.go` 中继续维护一套独立的 `Group.Manager` 授权逻辑。若必须保留兼容 `Group` 路径，该路径只能在缺少平台主模型数据时作为兼容投影，并必须通过 `readModelSource=compat_group` 明确暴露。

### 4. 生命周期和冲突 Fail Closed

`DISABLED`、`DELETED`、`CONFLICTED`、过期或 mapping 不确定的部门、成员关系、负责人关系不能扩大可见范围。provider 应返回稳定错误或可诊断状态，不应伪装成 `ALL_COMPANY`、成功空树或旧缓存。

### 5. API 消费 Projection Contract

如果领导或其他团队提到“API 消费 admin 组织架构 JSON”，本 change 的准确边界是：`aicodex-api / ai-gateway` 消费 admin 发布的 gateway organization projection JSON contract，而不是直接消费 admin 管理页面组织树 provider 或导出的组织树 JSON。

组织树 provider 面向 Insight 展示和报表筛选；gateway projection 面向 API/gateway 授权运行时。二者共享 admin 组织主模型口径，但用途、版本和 contract 不混用。

## Implementation Notes

- 优先补纯函数测试覆盖树构建、排序、父子关系、禁用节点、跨组织隔离和 cycle 防护。
- 再补 handler/provider 测试覆盖 envelope、审计字段和错误码。
- 最后在 60 环境跑真实 smoke：使用已知具备可管理组织树的 OIDC 测试账号或受控 fixture 请求 organization-tree，确认非空树、父子关系、`orgVersion/freshness/generatedAt/lineage` 存在；若测试环境没有该账号或数据，应先记录为测试数据缺口，不把普通空树误记为产品能力通过。
- 若现有数据不完整，应先记录诊断和缺口，不在 Insight 或 API 侧补算。
