## 本地验证

### 2026-06-10 聚焦组织树测试

- 命令：`go test ./controllers -run 'TestInsightOrganizationTreeReadModel|TestInsightProviderUsesPlatformDepartmentSourceMetadataForWecomGroups|TestInsightOrganizationTree' -count=1 -v`
- 工作目录：`admin`
- 结果：通过。
- 覆盖行为：
  - `organization-tree` read model envelope 返回 `organization`、`nodes[]`、兼容 `list[]`、`orgVersion/scopeVersion`、`freshness`、`generatedAt`、`lineage`、`readModelSource`。
  - 平台部门优先，旧 `Group` 只在缺少平台部门主模型时作为 `compat_group` 兼容来源。
  - disabled 部门不进入成功可见树。
  - 带 `sourceConnectionId` 的平台部门必须来自 `ACTIVE/FRESH` 的 SourceConnection；disabled/stale 来源连接 fail closed。
  - 直属上级关系不扩展为整棵部门树。
  - 最新可用 `SUCCEEDED/PARTIAL` 同步批次提供 `orgVersion/freshness`，`FAILED/RUNNING` 批次不覆盖可用版本。
  - cycle 父子关系不会导致无限遍历。

### 2026-06-10 scope 和平台模型回归

- 命令：`go test ./object -run 'TestOrganizationManagementScope|TestPlatformOrganization' -count=1 -v`
- 工作目录：`admin`
- 结果：通过。
- 覆盖行为：
  - 管理员、部门负责人、直属上级和普通用户 scope 计算保持可用。
  - 平台组织主模型字段契约保持稳定。
  - 新增平台快照 getter 对空 organization fail-closed 返回空集合，不触发跨组织读取。

### 2026-06-10 扩展包回归

- 命令：`go test ./controllers -count=1`
- 工作目录：`admin`
- 结果：通过。

- 命令：`go test ./object -run 'TestOrganizationManagementScope|TestPlatformOrganization' -count=1`
- 工作目录：`admin`
- 结果：通过。

### 2026-06-10 覆盖率

- 命令：`go test ./controllers -run 'TestInsightOrganizationTreeReadModel|TestInsightProviderUsesPlatformDepartmentSourceMetadataForWecomGroups|TestInsightOrganizationTree' -coverprofile ..\coverage-controllers-organization-tree.out -count=1`
- 结果：通过，`controllers` 包级覆盖率为 4.3%。
- 函数级结果：
  - `buildInsightOrganizationTreeReadModel`：96.2%
  - `latestInsightOrganizationTreeUsableSyncBatch`：100.0%
  - `visibleInsightOrganizationTreeDepartmentIds`：88.5%
  - `buildInsightPlatformOrganizationTreeNodes`：96.3%
  - `isInsightOrganizationTreeDepartmentSourceUsable`：85.7%
  - `buildInsightOrganizationTreeLineage`：100.0%

- 命令：`go test ./object -run 'TestOrganizationManagementScope|TestPlatformOrganization' -coverprofile ..\coverage-object-organization-tree.out -count=1`
- 结果：通过，`object` 包级覆盖率为 1.2%。
- 函数级结果：
  - `convertPlatformOrganizationManagementScopeData`：95.8%
  - `GetPlatformDepartments` / `GetPlatformMemberships` / `GetSourceConnections` / `GetOrgSyncBatches`：各 100.0%，已覆盖空 organization 快速返回、非空数据库查询和跨组织隔离分支。

说明：本仓库 Go 包较大，包级覆盖率不能代表本次变更的有效覆盖。本次新增核心纯函数和 DB getter 均已达到 85% 以上；测试环境 smoke 额外覆盖真实非空 provider 路径。

## 测试环境验证

### 2026-06-10 Admin provider organization-tree smoke

- 环境：60 测试环境。
- 命令：本地一次性 PowerShell smoke，读取本机私有测试凭据，目标为 60 测试环境；脚本未写入仓库。
- 请求：`GET /api/admin-provider/insight/v1/current-user/organization-tree`
- 结果：HTTP 200，`status=ok`。
- 关键统计：
  - `data.nodes[]` 返回 254 个节点，`data.list[]` 兼容数组同为 254 个节点。
  - 根节点 1 个，子节点 253 个。
  - 254 个节点均带 `sourceConnectionId`，254 个节点均带节点级 lineage。
  - 顶层 `orgVersion`、`scopeVersion`、`generatedAt`、`freshness`、`lineage.batchId` 和 `lineage.digest` 均存在。
  - `freshness=FRESH`，`readModelSource=platform_department`，`mappingStatus=OK`，`lifecycleStatus=ACTIVE`。
- 结论：60 测试账号具备非空可管理组织树；Admin provider 新 envelope 和旧 `list[]` 兼容路径均可用，非空数据库 getter 分支已通过运行态 smoke 覆盖。

### 2026-06-10 Insight wrapper organization-tree smoke

- 环境：60 测试环境。
- 命令：本地一次性 PowerShell smoke，使用 Insight 本地应急 JWT 加 Admin OAuth access token cookie 模拟浏览器登录态；token 和 Cookie 仅保存在本地进程内，未写入仓库或日志。
- 请求：`POST /api/insight/v1/reports/organization-tree`
- 结果：HTTP 200，`code=0`。
- 关键统计：
  - `data.list[]` 顶层根节点 1 个，整棵树共 254 个节点。
  - `degraded=false`，`reasonCode` 为空。
  - 254 个节点均带 `departmentId` 和 `departmentName`。
  - 根节点带 children，说明 Insight wrapper 已把 Admin provider 扁平节点还原为可消费的嵌套组织树。
- 结论：Insight wrapper 能消费 Admin provider 新 read model envelope，并通过兼容路径返回前端现有组织树结构。

## 待验证

- 无。

## 归档前验证

### 2026-06-10 最终验证

- 命令：`go test ./controllers -count=1`
- 工作目录：`admin`
- 结果：通过。

- 命令：`go test ./object -run 'TestOrganizationManagementScope|TestPlatformOrganization' -count=1`
- 工作目录：`admin`
- 结果：通过。

- 命令：`openspec validate stabilize-admin-organization-tree-read-model --strict`
- 结果：通过，change valid。

- 命令：`git diff --check`
- 结果：通过，无空白错误。
