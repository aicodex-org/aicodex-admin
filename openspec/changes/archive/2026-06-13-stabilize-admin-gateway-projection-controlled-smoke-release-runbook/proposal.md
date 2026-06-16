## Why

Admin gateway projection 已有 release decision handoff 和 controlled smoke preflight handoff，但 operator 仍缺少一个更靠近发布交接的 runbook 摘要：它需要把脱敏 evidence、release decision alias 和 preflight alias 汇总成可审计的下一步操作、缺失前置条件、红线标记和脱敏 evidence hints。

如果缺少该 runbook/guardrail，协调层容易把 `ready-for-controlled-smoke-prep` 误写成真实 publish、gateway ingestion、authorization facts 或 full-success，也难以在 evidence 缺失、出现写入信号或出现跨 owner 外推时快速 fail closed。

## What Changes

- 新增本地只读 controlled-smoke release runbook helper，输入只接受脱敏 evidence/handoff 摘要、release decision alias 和 preflight alias。
- 输出稳定 `status`、`reason`、operator next actions、missing prerequisites、hard red-line flags、redacted evidence hints、owner handoff 和不能外推边界。
- 对缺少 release decision、preflight、evidence、出现真实环境写入信号，或尝试声明 full-success / real publish / gateway ingestion / authorization facts 成功的输入 fail closed。
- 新增 focused Node 测试和 Bruno 只读入口/README operator 指引。
- 同步 `admin-gateway-organization-projection-publisher` 主规格。

## Capabilities

### New Capabilities

- 无。

### Modified Capabilities

- `admin-gateway-organization-projection-publisher`: controlled smoke operator 交接增加 release runbook/guardrail 输出契约。

## Impact

- Affected code: `api-tests/bruno/aicodex-admin/scripts/gatewayProjectionControlledSmokeReleaseRunbook*.js`、`api-tests/bruno/aicodex-admin/50-Gateway Projection 观测/**`、Bruno README。
- Affected specs: `admin-gateway-organization-projection-publisher`。
- 不改 Admin runtime API、API、Insight、Gateway 仓库；不写真实 fixture、真实 DB、生产/类生产配置、密钥、token、Cookie、完整响应体或完整 organizationId；不触发真实 publish、gateway ingestion、read model rebuild 或 full-success smoke。
