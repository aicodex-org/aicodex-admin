## 1. 现状盘点

- [x] 1.1 盘点 `organization-tree` provider 当前响应结构、60 环境真实返回、前端/Insight 消费方式和兼容数组响应要求。
- [x] 1.2 盘点 `PlatformDepartment`、Membership、部门负责人、直属上级、SourceConnection、ExternalIdentity 和 OrgSyncBatch 现有字段是否足够构建稳定组织树。
- [x] 1.3 确认旧 `Group` 与 `PlatformDepartment` 的映射关系、数据覆盖率和迁移退出条件。
- [x] 1.4 确认 60 环境可用于组织树 smoke 的测试账号或 fixture，要求该账号具备已知非空可管理组织树；若没有，先补测试数据或记录缺口。

## 2. 契约和 read model

- [x] 2.1 定义组织树 read model DTO/envelope，包含 `organization`、`nodes[]`、`orgVersion/scopeVersion`、`freshness`、`generatedAt`、`lineage`、`readModelSource`。
- [x] 2.2 定义节点字段：`departmentId`、`departmentName`、`parentDepartmentId`、`departmentPath`、`hasChildren`、`sourceType`、`sourceConnectionId`、`lifecycleStatus`、可选 `visibilitySource` 和脱敏 lineage 摘要。
- [x] 2.3 明确 `InsightProviderEnvelope.data` 内的组织树 envelope 结构，以及旧数组 consumer 的兼容响应形态或兼容解包路径，确保同一 JSON 字段不同时承担数组和对象语义。
- [x] 2.4 明确 `orgVersion` 是 admin 组织树版本，优先来自最新可用 `OrgSyncBatch.OrgVersion` 或平台部门快照版本，不与 gateway projection int64 `orgVersion` 混用，也不由请求时间单独生成。
- [x] 2.5 定义脱敏 lineage 摘要字段，至少覆盖 `sourceService`、`sourceType`、`sourceConnectionId`、`batchId/sourceOrgVersion` 和 `readModelSource`，并排除 token、Cookie、手机号、邮箱和完整原始响应。

## 3. Provider 实现

- [x] 3.1 将组织树构建优先收敛到 `PlatformDepartment` 和平台关系记录；旧 `Group` 仅作为兼容来源或迁移输入。
- [x] 3.2 复用或抽取 `OrganizationManagementScopeService` 的平台组织主模型 scope 计算，避免在 `insight_provider.go` 中继续维护独立 `Group.Manager` 授权路径。
- [x] 3.3 实现管理员、部门负责人、直属上级和普通用户的后端可见范围裁剪；直属上级关系不得扩成整棵部门子树。
- [x] 3.4 实现最新可用 `OrgSyncBatch`/平台部门快照选择，失败或运行中批次只进入诊断 lineage，不覆盖可用 `orgVersion/freshness`。
- [x] 3.5 处理 disabled/deleted/conflicted/stale 数据，确保不会扩大可见范围。
- [x] 3.6 补齐 provider 审计日志，记录 traceId、adminUserId、organization、nodeCount、readModelSource、orgVersion、freshness 和错误码。

## 4. 测试

- [x] 4.1 补纯函数测试：平台部门树构建、父子关系、路径、排序、跨组织隔离、cycle 防护。
- [x] 4.2 补 scope 测试：全局管理员、组织管理员、部门负责人、直属上级、普通用户。
- [x] 4.3 补生命周期测试：disabled/deleted/conflicted/stale 节点和关系不进入成功可见树。
- [x] 4.4 补 handler/provider 测试：envelope、旧数组兼容路径、错误码、审计字段和敏感信息脱敏。
- [x] 4.5 补版本和 lineage 测试：最新可用同步批次选择、失败/运行中批次不覆盖 `orgVersion`、请求时间不单独改变组织事实版本。

## 5. 运行态验证

- [x] 5.1 在本地或测试库运行聚焦 Go 测试。
- [x] 5.2 在 60 环境使用已知具备非空组织树的 OIDC 测试账号请求 `GET /api/admin-provider/insight/v1/current-user/organization-tree`，确认树非空、父子关系稳定、版本和 freshness 存在。
- [x] 5.3 从 Insight 侧请求 `POST /api/insight/v1/reports/organization-tree`，确认 wrapper 能消费新 envelope 或兼容响应。
- [x] 5.4 记录 verification，脱敏 token、Cookie、真实人员、手机号、邮箱和完整组织明细。

## 6. 交接

- [x] 6.1 更新 agent handoff，说明本 change 不允许 API 直连 admin 组织树 JSON，只允许 gateway 消费 projection contract。
- [x] 6.2 归档前跑 `openspec validate stabilize-admin-organization-tree-read-model --strict`、相关 Go 测试和 `git diff --check`。
