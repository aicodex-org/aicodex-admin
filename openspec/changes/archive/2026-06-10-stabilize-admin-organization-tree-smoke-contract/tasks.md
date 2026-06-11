## 1. 响应路径确认

- [x] 1.1 确认 organization-tree 成功响应的 `orgVersion/scopeVersion` 字段位于 `data` 内，是字段缺失、空字符串还是 smoke 解析路径问题。
- [x] 1.2 在验证记录中只写脱敏路径和结论，不写 token、Cookie、真实人员、完整组织明细或真实环境地址。

## 2. Provider 合同修复

- [x] 2.1 为业务空树成功响应补稳定 `scopeVersion` 兜底，确保 `status=ok` 时 `data.orgVersion` 或 `data.scopeVersion` 至少一个非空。
- [x] 2.2 保持 `freshness`、`generatedAt`、`lineage`、`readModelSource` 在空树成功响应中稳定存在。
- [x] 2.3 当 scope 指向可见部门但 read model 因 lifecycle、SourceConnection 或结构不可信被过滤为空时，返回稳定 provider 错误，不伪装成成功空树。
- [x] 2.4 保持 admin/API/Insight 组织边界不变，不修改 Insight fallback，不让 API 消费 admin 管理页面组织树 JSON。

## 3. 测试和文档

- [x] 3.1 补 Go 测试覆盖空树 envelope 的版本、freshness、generatedAt、lineage 和 readModelSource。
- [x] 3.2 补 Go 测试覆盖非空可管理树 fixture。
- [x] 3.3 补 Go 测试覆盖 SourceConnection fail-closed 不返回成功空树。
- [x] 3.4 补 60 smoke runbook，区分合同 smoke、能力 smoke、普通空树验证和 fail-closed 验证。

## 4. 验证

- [x] 4.1 运行 `go test ./controllers -run 'TestInsightOrganizationTree'`。
- [x] 4.2 运行 `go test ./object -run 'TestOrganizationManagementScope|TestPlatformOrganization'`。
- [x] 4.3 运行 `openspec validate stabilize-admin-organization-tree-smoke-contract --strict`。
- [x] 4.4 运行 `openspec validate --specs --strict`。
- [x] 4.5 运行 `git diff --check`。
- [x] 4.6 更新 `verification.md`，记录命令、结果、覆盖率和脱敏 smoke 结论。
