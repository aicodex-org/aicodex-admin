# stabilize-admin-organization-tree-evidence-handoff-wrapper

## Why

Admin 组织树运营 smoke 已有 readiness summary 和 evidence snapshot，但协调层或 operator 仍需要一个更小、更稳定的 handoff wrapper：它应直接表达当前证据包是否可释放、阻断时找哪个 owner、最小解除条件是什么，以及哪些结论不能外推。没有该 wrapper 时，blocked/not checked 证据容易被误写成 full-success，或把 evidence snapshot 误当作受控 60 smoke、真实 fixture、真实 read model 重建或数据库核验。

## What Changes

- 新增 `organizationTreeOperationsHandoffSummary.js`，把 readiness summary 或 evidence snapshot 转为可复制的最小 handoff summary。
- 新增 Bruno 只读入口 `40-组织树运营/Handoff Summary.yml`，复用 evidence snapshot 后输出 handoff summary，不触发 read model 重建、不写真实 fixture、不访问真实 DB。
- Handoff summary 只输出 `status`、`release`、`localBlockerCategory`、稳定 alias、脱敏 counts、owner handoff、最小解除条件、`doNotDispatchUntil` 和不能外推边界。
- 对 token、Cookie、Bearer、私有 URL、邮箱、手机号、账号、source tenant metadata、完整组织树节点列表或完整响应体迹象 fail closed，返回稳定 `organization_tree_handoff_sanitization_failed`。
- 更新 README、主规格和验证记录，明确 handoff summary 不能证明 `subjectCount>=1`，不能替代受控 60 smoke、真实 fixture 授权、真实 read model 重建或数据库核验。

## 非目标

- 不写真实 fixture。
- 不触发真实 read model 重建。
- 不查询或修改真实数据库。
- 不改变 API、Gateway、Insight owner 边界。
- 不把空树、consumer-only、not checked、readiness summary 或 evidence snapshot 输出外推为 Admin 非空组织树运营成功。

## 影响范围

- `api-tests/bruno/aicodex-admin/40-组织树运营/`
- `api-tests/bruno/aicodex-admin/scripts/`
- `api-tests/bruno/aicodex-admin/README.md`
- `openspec/specs/admin-organization-tree-operations/spec.md`
