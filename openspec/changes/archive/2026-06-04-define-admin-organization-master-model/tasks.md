## 1. 提案和规格

- [x] 1.1 与 `define-aicodex-organization-data-and-auth-boundaries` 基线核对 admin 数据 owner、scope 和 provider 边界
- [x] 1.2 Review `wecom-organization-sync`、`organization-management-scope`、`insight-admin-provider-wrapper` 和 `wecom-usage-identity-mapping` 现有规格
- [x] 1.3 确认本 change 只处理 admin 组织主模型和 provider 输入契约，不实现 api/gateway 授权或 insight 报表恢复
- [x] 1.4 运行 `openspec validate define-admin-organization-master-model --strict`

## 2. 平台组织主模型

- [x] 2.1 定义 PlatformOrganization、PlatformUser、PlatformDepartment、Membership、LifecycleEvent、OrgSyncBatch 的最小模型和 owner；Role/Position P0 只定义 source-neutral 契约和兼容映射
- [x] 2.2 定义 SourceConnection：`sourceConnectionId`、`organizationId`、`sourceType`、`sourceTenantId`、状态、新鲜度、`metadata`、`configRef` 和安全配置引用
- [x] 2.3 定义 ExternalIdentity：`sourceConnectionId + externalSubjectId` 稳定键、platform subject、mappingStatus 和 lineage
- [x] 2.4 明确邮箱、手机号、姓名、昵称只能用于展示或人工核对，不能用于自动 join、scope 或授权 key
- [x] 2.5 定义 source/org/scope version、freshness、batchId、generatedAt 和 trace metadata

## 3. 多来源同步与冲突处理

- [x] 3.1 将现有 WeCom 同步定位为 source adapter/source connection，保留兼容表但不作为长期跨服务权威模型
- [x] 3.2 定义 WeCom 同步结果写入平台部门、用户、成员关系、负责人、直属上级和 lifecycle 的规则
- [x] 3.3 定义钉钉、飞书、LDAP、HR、北森和客户自建系统后续 adapter 的最小统一输入 snapshot 契约，不预留各 adapter 专用配置字段
- [x] 3.4 定义多来源字段可信度、冲突状态、后端诊断日志和 fail-closed 行为；本阶段不建设人工确认页面
- [x] 3.5 定义离职、停用、调岗、部门撤销和外部账号解绑对 scope/org version 的影响

## 4. Report scope provider

- [x] 4.1 将 `GET /api/org-management-scope/current` 的计算输入收敛到平台组织主模型和 lifecycle
- [x] 4.2 将 `GET /api/admin-provider/insight/v1/current-user` 输出补齐 org/scope version、freshness 和 source-neutral 身份字段
- [x] 4.3 将 `GET /api/admin-provider/insight/v1/current-user/scope` 输出补齐 mappingStatus、lifecycleStatus、traceId 和 freshness
- [x] 4.4 将 `GET /api/admin-provider/insight/v1/current-user/organization-tree` 输出收敛为平台部门树，WeCom 字段只作为来源元数据
- [x] 4.5 区分业务空 scope 与映射缺失、冲突、过期或 provider 不可用；后者 fail closed，不降级为空 scope 或全公司 scope

## 5. 用量身份映射兼容

- [x] 5.1 将企业微信用量身份解析请求从 WeCom 专用语义迁移到 ExternalIdentity/sourceConnection 语义
- [x] 5.2 保留 `wecom:{corpId}:{userid}` 兼容字段，保证现有 api resolver 过渡可用
- [x] 5.3 确认手工 `aicodexApiUserId` 仍作为兼容兜底且不会被外部身份覆盖
- [x] 5.4 确认 `PENDING_REVIEW`、`DUPLICATE`、`CONFLICTED`、`DISABLED` 外部身份不会用于精确 scope

## 6. 验证和交接

- [x] 6.1 补充或更新后端单测，覆盖 SourceConnection/ExternalIdentity 唯一键、mappingStatus 和 lifecycle fail-closed
- [x] 6.2 补充 WeCom 同步兼容测试，确认现有同步表和平台主模型写入不破坏当前业务组织保护
- [x] 6.3 补充 provider 契约测试，确认 scope/org version、freshness、mappingStatus 和错误码
- [x] 6.4 在测试环境通过 WeCom 同步用户验证 current-user、scope 和 organization-tree provider
- [x] 6.5 记录后续 `aicodex-api` 和 `aicodex-insight` 子 change 所需契约输入
