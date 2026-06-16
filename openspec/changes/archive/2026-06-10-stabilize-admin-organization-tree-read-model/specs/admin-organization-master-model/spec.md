## MODIFIED Requirements

### Requirement: 生命周期和版本
系统 SHALL 为组织数据变化维护生命周期事件、组织版本、新鲜度和 lineage。

#### Scenario: 记录生命周期事件
- **WHEN** 用户入职、离职、停用、调岗、部门撤销、外部账号解绑或服务账号禁用
- **THEN** 系统 SHALL 记录 LifecycleEvent 并更新受影响组织数据的 version 或 batch metadata

#### Scenario: 发布 scope/org version
- **WHEN** provider 返回当前用户 scope、组织树、部门成员或映射结果
- **THEN** 响应 SHALL 包含 `scopeVersion` 或 `orgVersion`、`freshness`、`generatedAt` 和 lineage metadata

#### Scenario: 组织树 read model 版本可诊断
- **WHEN** provider 返回组织架构树 read model
- **THEN** 响应 SHALL 包含 admin 组织树语义的 `orgVersion` 或 `scopeVersion`
- **AND** 响应 SHALL 包含 `freshness`、`generatedAt`、lineage metadata 和 `readModelSource`
- **AND** 该版本 SHALL NOT 与 gateway projection 专用 int64 `orgVersion` 混用

#### Scenario: 组织树版本来自可用来源快照
- **WHEN** provider 为组织架构树 read model 选择版本和 lineage
- **THEN** 系统 SHALL 优先使用最新可用 `OrgSyncBatch.OrgVersion` 或平台部门快照版本作为 admin 组织树 `orgVersion`
- **AND** 最新可用同步批次 SHALL 只包含已完成、具备 `OrgVersion` 且具备完成时间的 `SUCCEEDED` 或 `PARTIAL` 批次
- **AND** `RUNNING`、`FAILED`、缺少 `OrgVersion` 或缺少完成时间的批次 SHALL NOT 覆盖上一份可用组织树版本
- **AND** 系统 SHALL NOT 仅用 provider 请求时间生成或递增组织事实版本

#### Scenario: 不确定生命周期不放宽权限
- **WHEN** 当前用户、目标用户、部门或成员关系的生命周期状态缺失、过期或不可判定
- **THEN** 系统 SHALL 返回授权失败或 provider unavailable 结果
- **AND** 系统 SHALL NOT 将该场景扩大为全公司 scope
- **AND** 系统 SHALL NOT 将该错误场景伪装成业务成功的 `scopeType=EMPTY`

### Requirement: 管理范围 provider 输入契约
系统 SHALL 从平台组织主模型计算报表管理范围，并提供给 `aicodex-insight` 使用。

#### Scenario: 计算报表 scope
- **WHEN** Insight provider 请求当前用户可见报表范围
- **THEN** 系统 SHALL 基于 PlatformUser、PlatformDepartment、Membership、Role、Position、LifecycleEvent 和 ExternalIdentity 计算 `ALL_COMPANY`、`EMPTY`、`SELF`、`DEPARTMENT_TREE` 或 `CUSTOM_USERS`
- **AND** 系统 SHALL 在响应中返回稳定 admin subject、部门集合、用户集合、mappingStatus、scope/org version、freshness 和 trace ID

#### Scenario: 组织树优先来自平台部门主模型
- **WHEN** Insight provider 请求当前用户可见或可管理组织树
- **THEN** 系统 SHALL 优先基于 PlatformDepartment、平台成员关系、生命周期、SourceConnection 和 OrgSyncBatch lineage 构建组织树 read model
- **AND** 旧 Group 树 MAY 作为兼容投影、迁移输入或展示字段来源
- **AND** 系统 SHALL NOT 将旧 Group 树继续作为跨服务长期权威组织事实来源

#### Scenario: 保留来源元数据
- **WHEN** provider 响应包含来自企业微信、钉钉、飞书、LDAP、HR、北森或客户自建系统的展示字段
- **THEN** 系统 SHALL 将这些字段标记为来源元数据或展示缓存
- **AND** 系统 SHALL NOT 要求消费者使用来源专用字段作为权限或 join 权威
