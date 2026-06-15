# Change: Admin projection operator remediation handoff

## Why

Gateway projection 已具备 readiness summary、release decision、controlled smoke preflight、release runbook 和 evidence readiness 等只读证据入口，但 operator 仍需要一个统一的 Admin-only remediation handoff，把常见 blocker alias 转成可执行、脱敏、owner-scoped 的下一步动作。

## What Changes

- 新增本地只读 `gatewayProjectionOperatorRemediationHandoff` helper，消费脱敏 summary/handoff/evidence readiness，不连接真实环境。
- 新增 focused Node 测试，覆盖 mapping missing、source freshness stale、publisher/refresh disabled、contract/version mismatch、empty subject/tombstone fixture missing、controlled smoke preflight 未满足、脱敏失败和 full-success 外推防护。
- 新增 Bruno `Operator Remediation Handoff.yml` local-only 入口，便于 operator 用私有变量生成可复制 handoff。
- 更新 Bruno README，说明输入变量、稳定 remediation 分类、owner、最小解除条件和不能外推边界。
- 更新 `admin-gateway-organization-projection-publisher` 主规格，声明 operator remediation handoff 的只读、脱敏和 owner 边界。

## Impact

- Affected specs: `admin-gateway-organization-projection-publisher`
- Affected code/docs: `api-tests/bruno/aicodex-admin/50-Gateway Projection 观测/**`、`api-tests/bruno/aicodex-admin/scripts/gatewayProjectionOperatorRemediationHandoff*`、`api-tests/bruno/aicodex-admin/README.md`
- Non-goals: 不新增后端 API，不触发 publish、refresh、gateway ingestion、authorization facts、fixture/DB 写入、read model rebuild 或 mapping confirm；不查询 API/Insight/Gateway 私有库；不证明 projection full-success、controlled smoke 已通过或生产就绪。
