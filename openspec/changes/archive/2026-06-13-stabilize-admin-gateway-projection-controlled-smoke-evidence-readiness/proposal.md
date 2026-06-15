# Change: Admin gateway projection controlled smoke evidence readiness

## Why

现有 Admin release decision、controlled smoke preflight handoff 和 release runbook 已能分别产出脱敏交接摘要，但 operator 在进入受控 smoke 前仍缺少一个本地只读的 evidence bundle 前置校验。该校验需要把 release decision、preflight handoff、release runbook 和 API diagnostics 的脱敏证据一起 fail-closed 分类，避免把 evidence review 误写成真实 publish、gateway ingestion、authorization facts 或 full-success。

## What Changes

- 新增本地只读 `gatewayProjectionControlledSmokeEvidenceReadiness` helper，只消费脱敏 summary/evidence alias。
- 新增 focused Node 测试，覆盖 ready、缺少 Admin evidence、缺少 API diagnostics、脱敏缺口、红线信号、full-success 外推和 fallback/owner 指引。
- 新增 Bruno `Controlled Smoke Evidence Readiness.yml` 入口，只做本地变量和脚本校验，不连接真实环境、不触发写入。
- 更新 Bruno README/operator 指引，明确 readiness 只允许进入受控 smoke evidence review。
- 更新 `admin-gateway-organization-projection-publisher` 规格，明确 evidence readiness 不能外推为 API/Gateway/Insight 成功或生产就绪。

## Impact

- Affected specs: `admin-gateway-organization-projection-publisher`
- Affected code/docs: `api-tests/bruno/aicodex-admin/50-Gateway Projection 观测/**`、`api-tests/bruno/aicodex-admin/scripts/gatewayProjectionControlledSmokeEvidenceReadiness*`、`api-tests/bruno/aicodex-admin/README.md`
- Non-goals: 不新增后端 API，不触发真实 publish、gateway ingestion、authorization facts、read model rebuild、fixture/DB 写入，不查询 API/Insight/Gateway 私有环境，不修改跨 owner contract 字段，不证明 controlled smoke 已通过、生产就绪或 full-success。
