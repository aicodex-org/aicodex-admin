## Why

Admin gateway projection 已有 release decision、controlled smoke preflight、release runbook、evidence readiness、operator remediation handoff 和 remediation result evidence handoff。operator 仍缺少一个最终的本地只读 execution handoff，用来把这些脱敏摘要汇总成受控 smoke 执行前交接包，并明确哪些条件只允许进入执行准备、哪些必须继续 blocked。

## What Changes

- 新增本地只读 `gatewayProjectionControlledSmokeExecutionHandoff` helper，只消费脱敏 preflight、evidence readiness、release runbook、operator remediation handoff 和 remediation result evidence handoff 摘要。
- 新增 focused Node 测试，覆盖 bounded ready、前置摘要缺失、硬红线、敏感值不回显、跨 owner 成功外推防护和稳定 blocker/remediation alias。
- 新增 Bruno `Controlled Smoke Execution Handoff.yml` local-only 入口，便于 operator 在私有变量中生成可复制执行前交接包。
- 更新 Bruno README/operator 指引，说明输入变量、稳定状态、最小解除条件、owner handoff limits 和不能外推边界。
- 更新 `admin-gateway-organization-projection-publisher` 主规格，声明 controlled smoke execution handoff 的只读、脱敏、fail-closed 和 owner 边界。

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `admin-gateway-organization-projection-publisher`: 增加 controlled-smoke execution handoff 的本地只读交接要求。

## Impact

- Affected specs: `admin-gateway-organization-projection-publisher`
- Affected code/docs: `api-tests/bruno/aicodex-admin/scripts/gatewayProjectionControlledSmokeExecutionHandoff*`、`api-tests/bruno/aicodex-admin/50-Gateway Projection 观测/Controlled Smoke Execution Handoff.yml`、`api-tests/bruno/aicodex-admin/README.md`
- Non-goals: 不执行真实 smoke；不新增后端 API；不触发真实 publish、refresh、gateway ingestion、authorization facts、fixture/DB 写入、read model rebuild 或 mapping confirm；不查询 API/Insight/Gateway 私有库；不证明真实 publish、真实 Gateway ingestion、真实 authorization facts、API/Insight 成功、生产就绪或 full-success。
