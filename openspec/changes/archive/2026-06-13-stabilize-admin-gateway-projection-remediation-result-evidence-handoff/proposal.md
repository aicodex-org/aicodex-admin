# Change: Admin projection remediation result evidence handoff

## Why

已归档的 `stabilize-admin-gateway-projection-operator-remediation-handoff` 能把 readiness、release decision、controlled smoke preflight/runbook/evidence readiness 中的 blocker alias 映射为 owner-scoped remediation。当前仍缺少一个 Admin owner 内的只读结果交接，用于汇总 operator 已处理 remediation 后返回的脱敏结果 alias，并明确是否可以进入下一轮 controlled smoke evidence review / preflight，或仍必须停在最小解除条件。

## What Changes

- 新增本地只读 `gatewayProjectionRemediationResultEvidenceHandoff` helper，只消费脱敏 alias/count/status 摘要，不连接真实环境。
- 新增 focused Node 测试，覆盖 mapping/source/deploy/fixture/evidence 处理结果、用户授权缺口、controlled smoke review 放行、脱敏失败、真实写入信号和 full-success 外推防护。
- 新增 Bruno `Remediation Result Evidence Handoff.yml` local-only 入口，便于 operator 用私有变量生成可复制的 Admin evidence handoff。
- 更新 Bruno README/operator 指引，说明稳定输入变量、结果状态、最小解除条件和不能外推边界。
- 更新 `admin-gateway-organization-projection-publisher` 主规格，声明 remediation result evidence handoff 的只读、脱敏、owner 边界和非外推约束。

## Impact

- Affected specs: `admin-gateway-organization-projection-publisher`
- Affected code/docs: `api-tests/bruno/aicodex-admin/50-Gateway Projection 观测/**`、`api-tests/bruno/aicodex-admin/scripts/gatewayProjectionRemediationResultEvidenceHandoff*`、`api-tests/bruno/aicodex-admin/README.md`
- Non-goals: 不新增后端 API；不触发真实 publish、refresh、gateway ingestion、authorization facts、fixture/DB 写入、read model rebuild 或 mapping confirm；不查询 API/Insight/Gateway 私有库；不证明真实 publish、真实 Gateway ingestion、真实 authorization facts、API/Insight 成功、生产就绪或 full-success。
