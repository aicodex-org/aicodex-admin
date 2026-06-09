# admin-oidc-multitenant-api-mapping-contract Specification

## Purpose
TBD - created by archiving change stabilize-admin-oidc-multitenant-api-mapping-contract. Update Purpose after archive.
## Requirements
### Requirement: OIDC 应用必须声明稳定的组织解析模式
系统 SHALL 将面向统一认证中心的 OIDC application / client 明确建模为 `organization_bound` 或 `shared_application` 两种组织解析模式，并对静态 client 与 DCR client 使用相同解析规则。既有 `IsShared` 只能作为迁移输入，不能单独承担长期组织解析契约。

#### Scenario: organization-bound client 使用绑定组织
- **WHEN** authorize 请求的 `client_id` 归属于一个 `organization_bound` application
- **THEN** 系统 SHALL 将该 application 绑定的 platform `organizationId` 作为本次登录目标组织
- **AND** 系统 SHALL NOT 允许请求参数再覆盖该 organization

#### Scenario: DCR client 默认注册为 organization-bound
- **WHEN** 管理员或受控调用方在某个 platform organization 下创建 DCR client，且未显式声明 shared application 模式
- **THEN** 系统 SHALL 将该 client 注册为 `organization_bound`
- **AND** 系统 SHALL 记录其绑定的 platform `organizationId`

#### Scenario: shared application 必须显式指定目标组织
- **WHEN** authorize 请求的 `client_id` 归属于一个 `shared_application`
- **THEN** 请求 MUST 显式携带目标 `organization`
- **AND** 系统 SHALL 仅在该 organization 属于 application 显式 allowed organization policy 时继续登录流程

#### Scenario: legacy shared application 缺少显式允许范围时拒绝授权
- **WHEN** authorize 请求命中由既有 `IsShared=true` 迁移而来但尚未配置 allowed organization policy 的 application
- **THEN** 系统 MUST 拒绝继续登录流程
- **AND** 系统 MUST 标记该 application 需要管理员确认目标组织允许范围

#### Scenario: shared application 缺少目标组织时拒绝授权
- **WHEN** authorize 请求命中 `shared_application`
- **AND** 请求缺少 `organization`
- **THEN** 系统 MUST 拒绝继续登录流程
- **AND** 系统 MUST NOT 回退到默认 organization、最近登录 organization 或内置 organization

#### Scenario: shared application 目标组织越权时拒绝授权
- **WHEN** authorize 请求命中 `shared_application`
- **AND** 请求携带的 `organization` 不在 application 显式 allowed organization policy 内，或 organization 状态不可用
- **THEN** 系统 MUST 拒绝继续登录流程
- **AND** 系统 MUST 记录脱敏审计事件

### Requirement: discovery、token 和 userinfo 必须使用一致的 issuer 与主体语义
系统 SHALL 为同一 `aicodex-admin` 部署使用单一 canonical issuer，并保证 discovery、`id_token`、`access_token` 和 `userinfo` 对 `iss`、`sub`、`aud`、organization 和 client 的解释一致。

#### Scenario: 全局 discovery 与 application-specific discovery 返回同一 issuer
- **WHEN** 调用全局 discovery 或任一 application-specific discovery
- **THEN** 响应中的 `issuer` SHALL 等于同一个 canonical issuer
- **AND** 系统 SHALL NOT 让 application-specific discovery 宣称一个不同于 token 实际签发值的 issuer

#### Scenario: application-specific discovery 不得返回不同 issuer metadata
- **WHEN** 调用 application-specific discovery
- **THEN** 响应中的 `issuer`、`jwks_uri`、`userinfo_endpoint` 和 token endpoint SHALL 与 canonical issuer 的标准 OIDC metadata 保持一致
- **AND** 系统 SHALL NOT 为同一 canonical issuer 暴露互相冲突的 application-specific signing metadata

#### Scenario: id_token 表达稳定主体、组织上下文和 client audience
- **WHEN** 系统向 OIDC client 签发 `id_token`
- **THEN** `iss` SHALL 等于 canonical issuer
- **AND** `sub` SHALL 等于稳定 admin subject，且在该 issuer 内不得复用于其他平台用户
- **AND** `aud` SHALL 标识当前 OIDC client
- **AND** 组织上下文 SHALL 通过稳定的 organization claim 表达当前 platform `organizationId`

#### Scenario: access_token 不得混淆 subject、organization 和 audience
- **WHEN** 系统为 userinfo 或内部资源签发 `access_token`
- **THEN** `iss` SHALL 等于 canonical issuer
- **AND** `sub` SHALL 保持与当前授权结果一致的稳定 admin subject
- **AND** `aud` SHALL 按资源受众语义使用，不得被要求充当 organization 或业务用户映射键

#### Scenario: userinfo 必须与授权结果保持同一主体和组织上下文
- **WHEN** client 使用本次授权得到的有效 access token 调用 userinfo
- **THEN** userinfo 响应中的 `sub` SHALL 与当前授权结果一致
- **AND** 如响应暴露 organization 信息，则其值 SHALL 与本次授权解析出的 platform `organizationId` 一致
- **AND** userinfo SHALL NOT 通过昵称、邮箱、手机号或外部租户展示值替代稳定主体或组织字段

### Requirement: 面向 aicodex-api 的 OIDC 授权必须绑定 confirmed 映射契约
当某个 application 明确用于 `aicodex-api` 业务访问时，系统 SHALL 仅在 organization 映射和用户映射都处于 confirmed 状态时完成成功授权；否则 MUST fail closed。

#### Scenario: organization 与 user 映射 confirmed 时签发授权结果
- **WHEN** authorize 请求命中面向 `aicodex-api` 的 application
- **AND** 目标 platform `organizationId` 具备 confirmed `apiOrganizationId`
- **AND** 当前 admin subject 具备 confirmed `apiUserId`
- **THEN** 系统 SHALL 继续完成授权结果签发
- **AND** 系统 SHALL 让下游能够基于稳定 admin subject、organization context 和权威映射契约解析业务身份

#### Scenario: organization 映射缺失或冲突时拒绝授权
- **WHEN** authorize 请求命中面向 `aicodex-api` 的 application
- **AND** 目标 organization 的 `apiOrganizationId` 缺失、冲突、禁用或不可判定
- **THEN** 系统 MUST 拒绝完成成功授权
- **AND** 系统 MUST NOT 回退到默认 organization 或客户端猜测值

#### Scenario: user 映射缺失或不可信时拒绝授权
- **WHEN** authorize 请求命中面向 `aicodex-api` 的 application
- **AND** 当前 admin subject 缺少 confirmed `apiUserId`，或 mappingStatus 为 `PENDING_REVIEW`、`DUPLICATE`、`CONFLICTED` 或 `DISABLED`
- **THEN** 系统 MUST 拒绝完成成功授权
- **AND** 系统 MUST NOT 使用邮箱、手机号、姓名、昵称或部门名猜测业务用户

#### Scenario: claim 不足以单独表达业务映射时使用权威映射契约
- **WHEN** 下游无法仅凭标准 OIDC claim 直接得出 `apiOrganizationId` 或 `apiUserId`
- **THEN** 系统 SHALL 提供以稳定 admin subject 和 platform `organizationId` 为键的一致映射契约
- **AND** 系统 SHALL NOT 要求下游改用弱标识、自由属性或手工约定补齐映射

### Requirement: 后台映射配置入口必须分离组织映射和用户映射
系统 MUST 在后台配置入口中将 platform organization 到 api organization UUID 的映射、platform admin subject 到 api user ID 的映射分成独立工作区。用户映射工作区 MUST 支持服务端分页和关键字搜索，避免用户数量增长后一次性加载全量映射。系统 MUST 允许同一个 platform `organizationId` 下维护多个用户映射，且不得把 `organizationId` 建模为 `PlatformApiUserMapping` 的单列唯一约束。

#### Scenario: 管理员先维护平台组织映射
- **WHEN** 管理员打开 AICodex API 映射配置入口
- **THEN** 系统 MUST 默认展示“平台组织映射”工作区
- **AND** 系统 MUST 只加载当前 organization 的组织映射
- **AND** 系统 MUST NOT 在首屏同时加载全量用户映射

#### Scenario: 管理员切换到用户映射工作区
- **WHEN** 管理员切换到“用户映射”
- **THEN** 系统 MUST 按当前 organization、当前页和每页条数从服务端加载用户映射
- **AND** 响应 MUST 返回当前页数据和总数
- **AND** 页面 MUST 提供按平台主体或 AICodex API 用户 ID 搜索的入口

#### Scenario: 同一组织维护多个用户映射
- **WHEN** 同一 `organizationId` 下需要映射多个 `adminSubject`
- **THEN** 系统 MUST 允许保存多条用户映射
- **AND** 系统 MUST 继续阻止同组织内相同 `adminSubject` 指向多个 `apiUserId`
- **AND** 系统 MUST 继续阻止同组织内相同 `apiUserId` 指向多个 `adminSubject`

### Requirement: OIDC 联调材料和验证记录必须脱敏
系统 SHALL 为本 capability 提供脱敏的 claim 样例、shared application 正反例、映射失败负例和验证说明。仓库内材料 MUST NOT 包含真实地址、内网 IP、token、cookie、账号、客户端密钥或客户真实数据。

#### Scenario: 记录 token claim 与 userinfo 样例
- **WHEN** change 需要提供 `id_token`、`access_token` 或 userinfo 的样例
- **THEN** 样例 SHALL 使用 synthetic issuer、client、organization 和 subject
- **AND** 样例 SHALL 仅保留字段名、字段语义和脱敏值

#### Scenario: 记录 shared application 负例
- **WHEN** change 记录 shared application 的失败验证
- **THEN** 验证材料 SHALL 展示缺少 `organization`、organization 越权或映射缺失等错误语义
- **AND** 材料 SHALL NOT 写入真实环境 endpoint、账号、token 或客户数据
