# stabilize-admin-organization-tree-evidence-snapshot-guardrail

## Why

Admin 组织树运营 smoke 已有只读 readiness summary，用于汇总诊断、刷新状态和可选组织树响应。但 operator 在回传或提交证据时仍容易粘贴完整响应体、完整节点列表、私有 URL、账号或凭据字段，导致证据不可安全共享，也难以稳定表达下一步最小解除条件。

## What Changes

- 在 Admin Bruno 只读脚本中新增组织树运营 evidence snapshot 能力，复用既有 `organizationTreeOperationsSmokeSummary` 诊断结果，生成可提交/可回传的最小证据包。
- 证据包只包含 `status`、稳定 alias、counts、检查状态、owner handoff、最小解除条件和不能外推边界。
- 对 token、Cookie、Authorization、私有 URL、邮箱、手机号、账号、完整组织树节点列表或完整响应体迹象 fail closed，返回稳定 `organization_tree_evidence_sanitization_failed`。
- 更新 Bruno README 和主规格，明确该证据包不证明 `subjectCount>=1`，也不是 API/Gateway/Insight 授权事实。

## 非目标

- 不写真实 fixture。
- 不触发真实 read model 重建。
- 不查询或修改真实数据库。
- 不改变 API、Gateway、Insight owner 边界。
- 不把空树、consumer-only 或 summary 输出外推为 Admin 非空组织树运营成功。

## 影响范围

- `api-tests/bruno/aicodex-admin/scripts/`
- `api-tests/bruno/aicodex-admin/README.md`
- `openspec/specs/admin-organization-tree-operations/spec.md`
