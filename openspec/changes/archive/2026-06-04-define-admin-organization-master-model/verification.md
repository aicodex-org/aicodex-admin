## 验证记录

日期：2026-06-04

### 已通过

- `go test ./controllers`
  - 结果：通过。
- `go test ./object -run 'TestPlatformOrganization|TestWecomOrganizationSyncServiceApply(DepartmentUpsertsProjectsPlatformDepartment|UserUpsertsProjectsExternalIdentityWithoutWeakJoinKeys|RelationshipsProjectsMembershipAndLifecycle)|TestWecomOrganizationSyncServiceFinalizeRunProjectsOrgSyncBatch|TestOrganizationManagementScopeServiceUsesPlatformMasterDataWhenAvailable'`
  - 结果：通过。
- `openspec validate "define-admin-organization-master-model" --strict`
  - 结果：通过。
- `git diff --check`
  - 结果：通过。

### 环境限制

- `go test ./object`
  - 结果：受既有 `TestDumpToFile` 阻塞，该测试会尝试初始化本地 MySQL 连接。
  - 观察到的错误：本地 MySQL 监听不可用。
  - 影响范围：不是本 change 新增平台组织主模型测试导致；上面的聚焦 object 测试不依赖本地数据库且已经通过。

### 已批准测试环境

- 已将分支 `hfl-test/define-admin-organization-master-model` 部署到已批准的 Fanley admin 测试环境。
  - 部署提交：`5eaa6945`。
  - 结果：部署完成，服务健康检查通过。
- 使用已登录的测试管理员会话触发企业微信组织同步。
  - 结果：`succeeded`。
  - 部门更新数：`254`。
  - 用户创建数：`0`。
  - 用户更新数：`1043`。
  - 用户停用数：`3`。
  - 错误码：空。
  - 错误文本：无。
- 通过已批准的 Insight OIDC 应用登录企业微信同步测试用户，并调用 provider 端点：
  - `GET /api/admin-provider/insight/v1/current-user`
    - 结果：HTTP `200`，`status=ok`。
    - `usageIdentity.mappingStatus=OK`.
    - `usageIdentity.mappingSource=properties.aicodexApiUserId`.
    - `usageIdentity.sourceType=wecom`.
    - `usageIdentity.sourceConnectionId`、`externalSubjectId`、`apiUserId`、`apiOrganizationId`、`orgVersion`、`scopeVersion` 和 `freshness` 均已返回。
  - `GET /api/admin-provider/insight/v1/current-user/scope`
    - 结果：HTTP `200`，`status=ok`。
    - `scopeType=ALL_COMPANY`.
    - `mappingStatus=OK`.
    - 部门条目数：`1`。
    - 带 `lifecycleStatus` 的部门条目数：`1`。
    - 带 `sourceType=wecom` 的部门条目数：`1`。
    - 带 `sourceConnectionId` 的部门条目数：`1`。
    - `apiUserIds` 数量：`1`。
    - `orgVersion`、`scopeVersion` 和 `freshness=FRESH` 均已返回。
  - `GET /api/admin-provider/insight/v1/current-user/organization-tree`
    - 结果：HTTP `200`，`status=ok`。
    - 节点数：`254`。
    - 带 `lifecycleStatus` 的节点数：`254`。
    - 带 `sourceType=wecom` 的节点数：`254`。
    - 带 `sourceConnectionId` 的节点数：`254`。

### 可重复验证脚本

- `openspec/changes/archive/2026-06-04-define-admin-organization-master-model/scripts/insight-admin-provider-smoke.ps1`
  - 用途：自动登录测试管理员、可选触发企业微信组织同步、登录企业微信同步测试用户，并验证 `current-user`、`scope` 和 `organization-tree` provider 契约。
  - 输入：通过参数、环境变量或本机 secrets 文件提供测试环境地址、组织、应用和测试账号。
  - 输出：仅输出脱敏 JSON 摘要，包括同步状态、provider HTTP 状态、mappingStatus、version/freshness 是否存在，以及部门/节点来源元数据覆盖计数。
  - 约束：脚本不保存、不打印密码、Cookie、访问令牌、客户端密钥或完整环境地址。
  - 自检：已验证 PowerShell 解析、无配置失败路径，以及使用已批准测试环境运行 `-SkipWecomSync` 的 provider 冒烟；结果为 `success=true`，`current-user`、`scope`、`organization-tree` 均返回 `status=ok`。

环境记录要求：验证记录不得包含环境 IP、Cookie、访问令牌、密码、客户端密钥、数据库凭据或生产/共享环境探测结果。

### 2026-06-08 test 分支 60 环境复核

- 60 测试环境已从正式 `test` 分支重新部署 `aicodex-admin`，不再依赖临时 feature 分支镜像。
  - 运行提交：`5e4224ff`。
  - 结果：镜像构建、容器启动和 admin 健康检查通过。
- 使用已登录测试管理员会话复核 `GET /api/admin-provider/insight/v1/current-user/scope`。
  - 结果：HTTP `200`，`status=ok`。
  - 顶层 `lifecycleStatus=ACTIVE`。
  - `freshness=FRESH`。
  - `mappingStatus=OK`。
  - `scopeVersion` 和 `orgVersion` 均已返回。
- 已同步更新可重复验证脚本和 scope fixture，将顶层 `lifecycleStatus=ACTIVE` 固定为 Insight scope provider 契约检查点。
