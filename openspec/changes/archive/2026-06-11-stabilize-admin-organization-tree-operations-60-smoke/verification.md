# 验证记录

## 当前状态

- 已完成 OpenSpec 校验、相关 Go/前端测试和 Bruno smoke 资产补齐。
- 已完成 60 部署、Bruno smoke、页面入口验证和路线清单同步。

## 本地验证

- `openspec validate stabilize-admin-organization-tree-operations-60-smoke --strict`：通过。
- `openspec validate --changes --strict`：通过。
- `openspec validate --specs --strict`：通过。
- `git diff --check`：通过。
- `go test ./controllers -run 'Test(OrganizationTreeOperations|InsightOrganizationTree)' -count=1 -v -timeout 180s`：通过。
- `yarn test OrganizationTreeOperationsPage --watchAll=false --silent`：通过，6 个测试用例通过。

## 60 测试环境验证

- 部署和 health：通过。测试环境已更新到当前工作分支提交，服务健康检查通过。
- Bruno 非空组织树 smoke：通过。
  - 命令：`bru run "10-认证/登录.yml" "20-基础只读/组织列表.yml" "40-组织树运营/诊断.yml" "40-组织树运营/刷新状态.yml" --env remote-test --env-var organizationTreeOperationsRequireNonEmpty=true --reporter-skip-all-headers --reporter-skip-body --bail`
  - 结果：4 个请求全部返回 `200 OK`，Bruno 执行结果为 `PASS`。
  - 诊断接口校验：`summary.orgVersion` 或 `summary.scopeVersion` 存在，`freshness`、`generatedAt`、`readModelSource` 存在，`nodes`、`diagnostics`、`sourceConnections` 为稳定数组字段。
  - 非空树结论：在已知非空测试账号或受控 fixture 下，`organizationTreeOperationsRequireNonEmpty=true` 通过；普通空树未被记录为组织树能力通过。
- 只读刷新 smoke：通过。
  - `refresh_status` 返回 `traceId`、`triggerType=refresh_status`、稳定状态和诊断摘要。
  - 该动作只刷新诊断状态，不写组织主数据、SourceConnection 配置、gateway authorization facts 或 Insight 报表数据。
- 受控重建 smoke：通过。
  - 命令：`bru run "10-认证/登录.yml" "20-基础只读/组织列表.yml" "40-组织树运营/重建read-model.yml" --env remote-test --env-var organizationTreeOperationsRebuildEnabled=true --reporter-skip-all-headers --reporter-skip-body --bail`
  - 结果：3 个请求全部返回 `200 OK`，Bruno 执行结果为 `PASS`。
  - `refresh_read_model` 返回 `traceId`、`triggerType=refresh_read_model` 和稳定状态。
  - 服务日志存在 `organization_tree_operations_audit` 脱敏审计信号，包含 `traceId`、`operation`、`status` 和 lineage 摘要字段；本记录不写入原始日志。
- 页面入口 smoke：通过。
  - 组织树运营入口可访问。
  - 默认空组织显示业务空树分类，不作为非空能力通过。
  - 切换到已知非空测试组织后，可见节点非空，摘要中版本、新鲜度、来源连接和最近批次信号齐全。
  - `树视图` 和 `列表视图` 入口存在，树视图有可见节点，页面无组织树运营错误提示。

## 路线清单同步

- 文档仓库：`aicodex-docs`。
- 提交：`2025b56 docs: 同步 admin 组织树运营化 60 smoke 状态`。
- 状态：已推送到文档工作分支。

## 覆盖率

- N/A：本 change 仅新增 OpenSpec 文档、Bruno smoke 资产和 runbook，不修改生产代码。组织树运营生产代码覆盖率已由 `improve-admin-organization-tree-operations` 归档验证记录覆盖。

## 脱敏约束

- 本 change 的验证记录只使用环境别名、命令、HTTP 状态、字段存在性和脱敏结果摘要。
- 不记录真实 token、Cookie、私有 URL、真实账号、手机号、邮箱、完整组织明细、完整响应体或可直连环境地址。

## 剩余风险

- 本 change 不新增生产代码；运行态收口依赖私有 Bruno 环境中的测试账号和组织 fixture。后续换账号或 fixture 时，必须继续设置 `organizationTreeOperationsRequireNonEmpty=true`，否则普通空树不能作为能力通过证据。
- `refresh_read_model` 会触发受控来源同步路径，必须保留 `organizationTreeOperationsRebuildEnabled=true` 的显式开关，不应纳入默认只读 smoke。
