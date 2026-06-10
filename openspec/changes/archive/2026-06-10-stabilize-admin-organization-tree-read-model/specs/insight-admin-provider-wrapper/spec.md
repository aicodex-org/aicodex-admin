## MODIFIED Requirements

### Requirement: provider 必须提供可管理组织树
系统 MUST 提供 `GET /api/admin-provider/insight/v1/current-user/organization-tree`，返回当前用户可见或可管理的平台组织/部门树，供 insight 做部门筛选和展示。

#### Scenario: 用户有可管理组织树
- **WHEN** 当前用户拥有可管理的平台部门、分组兼容节点或组织节点
- **THEN** 系统 MUST 返回节点列表或树结构
- **THEN** 每个节点 MUST 包含 `departmentId`、`departmentName`、`parentDepartmentId`、`departmentPath`、`hasChildren`、`sourceType`、`sourceConnectionId` 或脱敏来源元数据、`lifecycleStatus`

#### Scenario: 直属上级关系不扩成部门子树
- **WHEN** 当前用户仅通过直属上级关系拥有可见下属
- **THEN** organization-tree provider MUST NOT 将这些下属关系推断为整棵部门树或部门子树权限
- **AND** 如果 provider 为展示返回部门节点，节点 MUST 只覆盖已确认下属所在的 enabled 部门，并 MUST NOT 自动包含祖先、兄弟或子孙部门

#### Scenario: 组织树 provider 返回版本化 envelope
- **WHEN** organization-tree provider 成功返回
- **THEN** 响应 MUST 保持现有 `InsightProviderEnvelope` 传输层
- **AND** 成功响应的 `data` MUST 提供组织树 read model envelope，包含 `organization`、`nodes[]`、`orgVersion` 或 `scopeVersion`、`freshness`、`generatedAt`、lineage metadata 和 `readModelSource`
- **AND** `readModelSource` MUST 能区分 `platform_department`、`mixed_platform_group` 或 `compat_group`
- **AND** 响应 MUST NOT 暴露访问令牌、刷新令牌、密钥、手机号明文、邮箱明文或来源系统敏感配置

#### Scenario: 旧数组响应兼容
- **WHEN** 现有 consumer 仍按节点数组读取 organization-tree provider
- **THEN** 系统 MAY 通过明确的兼容响应形态或 consumer 兼容解包方式保留旧数组读取
- **AND** 新 envelope 字段 MUST 有明确迁移路径和退出条件
- **AND** 系统 MUST NOT 让同一个 JSON 字段同时承担数组和对象两种不兼容语义

#### Scenario: 组织树 lineage 脱敏且可诊断
- **WHEN** organization-tree provider 返回 lineage metadata
- **THEN** lineage MUST 至少能定位 `sourceService`、`sourceType`、`sourceConnectionId`、`batchId` 或 `sourceOrgVersion` 中可用的脱敏诊断字段
- **AND** lineage MUST NOT 包含来源租户密钥、访问令牌、Cookie、手机号、邮箱、完整原始响应体或客户真实组织明细

#### Scenario: 用户无可管理组织树
- **WHEN** 当前用户没有可管理分组或部门节点
- **THEN** 系统 MUST 返回空列表或空 `nodes[]`
- **THEN** 系统 MUST 将该场景作为业务空结果处理，而不是 provider 失败
- **AND** 该业务空结果 MUST 只用于 scope 已确定且无可见节点的场景，不能掩盖生命周期、映射、来源连接或 read model 不可信错误

#### Scenario: 不可信组织树数据 fail closed
- **WHEN** 当前用户、部门、父子关系、成员关系、负责人关系、ExternalIdentity 或来源连接处于 disabled、deleted、conflicted、stale 或不可判定状态
- **THEN** provider MUST 排除该记录或返回稳定错误码
- **AND** provider MUST NOT 因兼容旧 Group、前端筛选或展示字段而扩大可见范围
- **AND** provider MUST NOT 将该错误场景伪装成全公司组织树或成功空树
