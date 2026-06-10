## 字段路径确认

- 结论：organization-tree provider 的 `orgVersion/scopeVersion` 位于成功响应的 `data` 内，即 `data.orgVersion` 和 `data.scopeVersion`；顶层 `InsightProviderEnvelope` 只承载 `status`、`traceId`、`data` 和 `error`。
- 修复前判定：业务空树且没有可用 `OrgSyncBatch.OrgVersion` 或平台部门快照版本时，`data.orgVersion` 与 `data.scopeVersion` 会作为空字符串出现，不是字段缺失；如果 smoke 读取顶层版本字段，则属于解析路径问题。
- 修复后判定：`status=ok` 的业务空树响应会生成非空 `data.scopeVersion`，并保留 `freshness`、`generatedAt`、`lineage.digest` 和 `readModelSource`。

## 本地验证

### 2026-06-10 controllers 聚焦测试

- 命令：`go test ./controllers -run 'TestInsightOrganizationTree' -coverprofile ..\coverage-controllers-organization-tree-smoke.out -count=1 -v`
- 工作目录：`admin`
- 结果：通过。
- 覆盖行为：
  - 版本字段位于 `data.orgVersion/data.scopeVersion`，顶层 envelope 不承载版本字段。
  - 业务空树 `status=ok` 时至少有一个版本字段非空。
  - 非空可管理树 fixture 仍返回 `nodes[]` / `list[]` 和版本、新鲜度、lineage。
  - SourceConnection disabled/stale 且 scope 指向可见部门时返回 `PROVIDER_UNAVAILABLE`，不伪装成成功空树。

### 2026-06-10 object 回归

- 命令：`go test ./object -run 'TestOrganizationManagementScope|TestPlatformOrganization' -count=1 -v`
- 工作目录：`admin`
- 结果：通过。

### 2026-06-10 覆盖率

- 命令：`go test ./controllers -run 'TestInsightOrganizationTree' -coverprofile ..\coverage-controllers-organization-tree-smoke.out -count=1`
- 结果：通过，`controllers` 包级覆盖率为 2.9%。
- 函数级结果：
  - `buildInsightOrganizationTreeReadModel`：96.3%
  - `validateInsightOrganizationTreeReadModelTrusted`：100.0%
  - `buildInsightPlatformOrganizationTreeNodes`：96.3%
  - `isInsightOrganizationTreeDepartmentSourceUsable`：85.7%

说明：`controllers` 包较大，包级覆盖率不能代表本次小 change 的有效覆盖；本次新增和受影响的组织树合同函数均达到 85% 以上。

## OpenSpec 和静态检查

- 命令：`openspec validate stabilize-admin-organization-tree-smoke-contract --strict`
- 结果：通过，change valid。

- 命令：`openspec validate --specs --strict`
- 结果：通过，13 个主规格全部通过。

- 命令：`git diff --check`
- 结果：通过，无空白错误。

## 60 smoke 记录

- 本 change 未把真实 60 地址、token、Cookie、账号、密码、真实人员或完整组织明细写入仓库。
- 已补 `runbooks/organization-tree-smoke.md`，要求 60 合同 smoke 从 `data.orgVersion/data.scopeVersion` 读取版本字段，并区分合同 smoke、非空组织树能力 smoke 和 fail-closed smoke。
- 当前本地代码已确认字段路径和空字符串根因；部署到 60 后应按 runbook 复跑合同 smoke。普通空树只能记录为空结果合同验证，不能作为非空组织树能力通过依据。
