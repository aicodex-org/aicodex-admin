## 验证范围

本 change 只新增 Admin 组织树运营只读 readiness summary 脚本、Node 单测、Bruno 只读入口、README 和 OpenSpec 规格同步。未写真实 fixture，未触发真实 read model 重建，未查询/写入/清理真实 DB，未修改 API/Insight 仓库，也未触碰 `admin/object/platform_api_mapping*` 或 `admin/controllers/platform_api_mapping.go`。

## TDD 记录

- RED: `node --test api-tests/bruno/aicodex-admin/scripts/organizationTreeOperationsSmokeSummary.test.js`
  - 结果：失败，原因是 `Cannot find module './organizationTreeOperationsSmokeSummary'`，确认 summary 模块尚未实现。
- GREEN: `node --test api-tests/bruno/aicodex-admin/scripts/organizationTreeOperationsSmokeSummary.test.js`
  - 结果：9 个 summary 用例通过，覆盖可信非空树、空树、非空 fixture 缺失、不可信 read model、SourceConnection stale、lineage 缺失、刷新状态不可用、敏感输入 fail closed 和可选组织树响应脱敏。

## 自动化验证

- `node --test api-tests/bruno/aicodex-admin/scripts/organizationTreeOperationsSmokeSummary.test.js`
  - 结果：9/9 通过。
- `node --experimental-test-coverage --test api-tests/bruno/aicodex-admin/scripts/organizationTreeOperationsSmokeSummary.test.js`
  - 统计对象：`api-tests/bruno/aicodex-admin/scripts/organizationTreeOperationsSmokeSummary.js`
  - 结果：line 96.10%，branch 91.41%，functions 100.00%，满足受影响实施代码 85% 门槛。
- `node --check api-tests/bruno/aicodex-admin/scripts/organizationTreeOperationsSmokeSummary.js`
  - 结果：通过，无语法错误。
- `node --check api-tests/bruno/aicodex-admin/scripts/organizationTreeOperationsSmokeSummary.test.js`
  - 结果：通过，无语法错误。
- `openspec validate stabilize-admin-organization-tree-operations-smoke-summary-guardrail --strict`
  - 结果：通过。
- `openspec validate --specs --strict`
  - 结果：14 个主规格通过，0 个失败。
- `git diff --check`
  - 结果：通过，无 whitespace error。
- `openspec archive stabilize-admin-organization-tree-operations-smoke-summary-guardrail --skip-specs -y`
  - 结果：已归档为 `openspec/changes/archive/2026-06-13-stabilize-admin-organization-tree-operations-smoke-summary-guardrail`。主规格已在本 change 中手工同步，为避免重复追加同一 requirement，archive 使用 `--skip-specs`。
- `openspec validate --changes --strict`
  - 结果：3 个 active changes 通过，0 个失败。

## 脱敏与边界

- Summary 输出只包含 `status`、`aliases`、counts、检查状态、owner handoff、最小解除条件和边界说明，不输出原始节点、完整 organizationId、完整 diagnostics response 或完整来源响应体。
- `sanitization_failed` 会 fail closed 处理疑似 token、Cookie、Authorization、secret/config ref、source tenant metadata、手机号、邮箱或完整敏感输入。
- 普通空树、consumer-only 结果或 Insight fallback 不能外推为 Admin 非空组织树能力通过。
- Summary 只代表 Admin 组织树运营 smoke readiness，不是 API/Gateway authorization facts，也不是 Insight 报表 scope。

## 剩余风险

- 本地验证只覆盖 summary 纯函数和 Bruno 入口脚本文本，未连接真实远端环境；不能证明远端测试环境已部署最新 Admin 包，也不能证明已有非空可管理组织树测试账号或受控 fixture。
- Bruno 多请求响应共享仍依赖 operator 将刷新状态或可选组织树响应放入私有变量；默认只读入口不会隐式调用刷新状态或重建路径。
