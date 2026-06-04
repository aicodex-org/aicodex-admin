## Context

已归档的 `define-aicodex-organization-data-and-auth-boundaries` 明确了三项目边界。该基线不在 admin 仓库内，归档位置是 `aicodex-insight` 项目（仓库：`https://git.leagsoft.com/aicodex/aicodex-insight.git`）的 `openspec/changes/archive/2026-06-03-define-aicodex-organization-data-and-auth-boundaries`；归档后的长期规格位于该项目 `openspec/specs/`，包括 `aicodex-service-data-ownership`、`aicodex-organization-authorization-boundary`、`aicodex-cross-service-data-access`、`aicodex-report-permission-audit-boundary` 和 `aicodex-analytics-read-model`。

基线给出的三项目职责边界为：

```text
aicodex-admin   组织主数据、外部身份、生命周期、管理范围、同步批次 owner
aicodex-api     用量事实、usage provider、gateway resource authorization owner
aicodex-insight 报表体验、报表审计、展示缓存、approved derived read model owner
```

admin 当前已经具备企业微信组织同步、管理范围接口、Insight provider wrapper 和 WeCom 用量身份解析能力。问题不是没有组织能力，而是这些能力仍然绑定在 WeCom 专用模型上：`wecom_organization_sync_config`、`wecom_user_mapping`、`wecom_department_mapping`、`wecom_user_department`、`wecom_department_leader` 和 `wecom_user_direct_leader` 已经可以支撑第一阶段报表 scope，但不能成为长期平台组织主模型。

长期方向是把 WeCom、钉钉、飞书、LDAP、HR、北森和客户自建系统都视为 source adapter/source connection，统一写入 admin 的 source-neutral 平台组织主模型。Insight 和 api/gateway 只消费 admin 归一化 provider 或后续授权投影，不直接理解外部来源原始语义。

## Goals / Non-Goals

Goals:

- 定义 admin 平台组织主模型和 source-neutral 同步入口。
- 定义 SourceConnection 与 ExternalIdentity 的稳定标识规则。
- 将 WeCom 同步改造为过渡 source adapter 的迁移方向。
- 定义多来源字段可信度、冲突处理、mappingStatus 和 lifecycle 状态。
- 固化 report scope provider 需要的 scope/org version、freshness、lineage 和审计字段。
- 为后续 api/gateway organization projection 提供稳定输入前提。

Non-Goals:

- 不在本 change 实现 gateway resource authorization facts。
- 不实现 api/gateway runtime projection 消费、allow/deny 或授权审计。
- 不恢复 insight 部门用量报表。
- 不建设权限矩阵、授权审计展示、成本分析或 analytics report store。
- 不要求一次性删除现有 WeCom 专用表；现有表可作为 adapter 内部状态、迁移输入或兼容缓存保留。
- 不把钉钉、飞书、LDAP、HR、北森和客户自建系统的完整 adapter 都实现出来；本 change 只定义统一接入契约和最小模型。

## Decisions

### 1. admin 平台组织主模型独立于外部来源

平台组织模型表达 AICodex 内部客户/租户、用户、部门、成员关系、岗位、角色、生命周期和管理范围。外部系统只提供输入快照，不决定平台对象的权威 ID。

核心对象：

| 对象 | 职责 |
| --- | --- |
| PlatformOrganization | AICodex 内部客户/租户组织边界 |
| SourceConnection | 某个平台组织绑定的一个外部来源连接 |
| ExternalIdentity | 外部主体到平台用户、服务账号或部门的映射 |
| PlatformUser | admin 稳定用户 |
| PlatformDepartment | admin 稳定部门 |
| Membership | 用户和部门关系，包括主部门、兼职部门、负责人 |
| Role / Position | 管理范围和后续投影可消费的组织角色或岗位；P0 先定义契约和兼容映射 |
| LifecycleEvent | 入职、离职、停用、调岗、部门撤销、外部账号解绑 |
| OrgSyncBatch | 一次同步批次、版本、新鲜度、错误摘要和 lineage |

现有 Casdoor `Organization`、`User`、`Group`、`Role` 和 `User.Title` 可以继续作为 P0 兼容承载，但长期语义必须通过平台组织主模型解释，而不是由 WeCom 专用字段直接对外定义。第一阶段不新建完整岗位/角色管理产品；Role/Position 只需要提供 source-neutral 字段、兼容映射和 provider 可消费语义，后续是否沉淀独立平台岗位模型由单独 change 决定。

### 2. 外部身份映射使用 sourceConnection 稳定键

外部身份映射稳定键为：

```text
sourceConnectionId + externalSubjectId -> platform subject
```

`sourceConnectionId` 归属于一个 PlatformOrganization，并在同一个外部来源连接生命周期内保持稳定。`sourceType`、`sourceTenantId`、`corpId`、`tenantKey`、`domain`、`companyCode` 等字段只作为来源元数据和外部事件解析字段，不能直接等同于平台 `organizationId`。

这样可以避免多个客户使用同一个 LDAP domain、HR company code、客户自建 tenant 值或测试 Corp ID 时发生跨客户碰撞。

P0 只需要为 WeCom 配置建立或关联 SourceConnection。钉钉、飞书、LDAP、HR、北森和客户自建系统先通过统一 `sourceType`、`sourceTenantId`、`metadata`、`configRef` 和安全配置引用表达接入契约，不在本 change 中预留各来源专用列；具体 adapter 的字段由各自接入 change 增量补充。

### 3. WeCom 作为 source adapter 迁移

现有 WeCom 同步能力不推倒重来。第一阶段保留：

- WeCom 配置、连接测试、同步 run、关系表和审计。
- `wecom-<CorpID短码>` 业务组织保护，避免普通员工落入 `built-in`。
- WeCom 部门、成员、负责人、直属上级和成员部门关系的差异同步。

需要改变的是权威语义：

- `wecom_*` 表成为 WeCom adapter 内部状态、迁移输入或兼容缓存。
- 同步成功后必须写入或更新平台组织主模型。
- 对 insight 和 api/gateway 暴露的 provider 不再要求消费者理解 WeCom 专用表。
- 后续 DingTalk/Feishu/LDAP/HR/Beisen/custom adapter 不能复制一套长期专用主模型。

### 4. 多来源冲突不能静默覆盖

同一平台组织可同时接入多个来源。同一自然人也可能有多个外部身份。字段合并需要明确可信度和冲突状态。

推荐口径：

| 字段 | 默认可信来源 |
| --- | --- |
| 在职、离职、停用 | HR/北森或客户指定主来源 |
| 登录身份 | 当前认证 provider |
| 展示名、头像 | IM 或用户资料来源 |
| 工号 | HR/北森或客户指定主来源 |
| 部门树 | HR 或客户指定主来源 |
| 手机、邮箱 | 仅辅助人工核对，不作为唯一 key |
| 负责人、直属上级 | HR 或客户指定主来源 |

冲突结果至少包含：

- `CONFIRMED`：已确认映射。
- `PENDING_REVIEW`：候选匹配，需要管理员确认。
- `DUPLICATE`：多个外部身份疑似同一自然人。
- `CONFLICTED`：关键字段冲突，禁止进入授权投影或精确报表 scope。
- `DISABLED`：外部身份停用或解绑。

第一阶段不提供多来源冲突人工确认页面。实现只需要持久化冲突状态、候选来源、来源批次和安全诊断摘要，并通过日志或后续诊断接口暴露给管理员排障；所有影响精确报表 scope 或后续授权投影的冲突都按 fail-closed 处理。

### 5. report scope provider 以平台模型输出

Insight provider 继续由 admin 后端计算，不能让 insight 自己推导组织范围。

provider 输出必须包含：

- 当前 admin 稳定主体。
- scope 类型：`ALL_COMPANY`、`EMPTY`、`SELF`、`DEPARTMENT_TREE`、`CUSTOM_USERS`。
- 组织、部门、成员关系和用户集合。
- 稳定 `adminUserId`、必要的 `apiUserId` 映射状态和来源元数据。
- `scopeVersion` 或 `orgVersion`。
- `freshness`、`generatedAt`、`lineage` 和 `traceId`。

当生命周期不可判定、精确 scope 映射缺失、resolver/provider 不可用或关键冲突存在时，provider 必须 fail closed，返回稳定错误或 provider unavailable，不能扩大为全公司，也不能把错误伪装成业务空范围。只有当前用户确实没有任何可查询范围，且不存在缺失、歧义、冲突、过期或 provider 不可用时，才能返回业务成功的 `scopeType=EMPTY`。

### 6. 集群部署默认应用无状态

组织主数据、同步批次、生命周期、scope/org version 和 provider 所需权威状态必须进入 owner 控制的外置持久化层。多节点部署时：

- 应用节点只承载计算、请求处理和可失效缓存。
- 同步任务使用专用 worker、单实例调度或 batch/version 幂等写入。
- 只有确有多活调度需求时再引入 leader election 或分布式锁。
- provider endpoint 不使用 `localhost` 或节点本地地址。

## Migration Plan

1. 建立平台组织主模型和 SourceConnection/ExternalIdentity 最小表结构。
2. 为现有 WeCom 配置创建稳定 SourceConnection，并把 `corpId` 存为 `sourceTenantId`。
3. 将 WeCom 用户、部门和关系同步结果写入平台模型，同时保留 `wecom_*` 表兼容。
4. 将管理范围计算从直接依赖 WeCom 专用关系表逐步切到平台 Membership/Lifecycle 模型。
5. 将 Insight provider 输出改为 source-neutral 契约，保留 WeCom 来源元数据用于展示和排障。
6. 在测试环境验证 WeCom 同步、管理范围、Insight provider 和用量身份解析兼容路径。

## Risks / Trade-offs

- [现有 WeCom 报表链路被打断] -> 采用双写或兼容读取，先保持现有 provider 行为，再切换权威语义。
- [模型一次设计过大] -> P0 只覆盖 PlatformOrganization、SourceConnection、ExternalIdentity、Department、Membership、LifecycleEvent 和 OrgSyncBatch，Role/Position 可先定义契约后分步落地。
- [多来源冲突处理产品规则未完全确认] -> 先用 `PENDING_REVIEW` / `CONFLICTED` fail closed，避免静默覆盖关键授权字段。
- [api/gateway projection 尚未实现] -> admin 只保证模型、version 和 provider 输入稳定，消费端由后续 api change 承接。
- [历史 WeCom ID 和新 ExternalIdentity 并存] -> provider 响应保留来源元数据和兼容字段，但新逻辑不得把 WeCom 字段作为跨服务唯一权威。

## Implementation Decisions

- 第一阶段不提供多来源冲突人工确认页面；只提供后端状态、候选来源、诊断日志和 fail-closed 语义，人工确认流程后续单独设计。
- Role/Position 第一阶段复用现有 Casdoor 角色、用户组、用户标题或兼容映射表达 provider 可消费契约；不新建完整平台岗位管理产品。
- 钉钉、飞书、LDAP、HR、北森和客户自建 adapter 第一阶段只使用 SourceConnection 的通用 `sourceType`、`sourceTenantId`、`metadata`、`configRef` 和安全配置引用，不提前预留各 adapter 专用表字段。
