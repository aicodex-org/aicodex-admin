## Why

现有 Admin release decision handoff 已能把本地 readiness evidence 归类为 release decision，但协调层还缺少一个更靠近“受控 smoke 前置准备”的汇总入口，用于同时承接 Admin release decision、Admin readiness/source freshness/mapping readiness 和 API diagnostics decision evidence。

如果缺少该前置交接层，operator 容易把 `ready-for-controlled-smoke` 继续外推为真实 publish、gateway ingestion、authorization facts 或 full-success，也难以在 blocked 时明确卡在 Admin source、Admin mapping、API diagnostics 或 contract/redaction owner 的最小解除条件。

## What Changes

- 新增本地只读 controlled smoke preflight handoff helper，输出稳定 decision/alias：`ready-for-controlled-smoke-prep`、`blocked-by-admin-release-decision`、`blocked-by-admin-source-freshness`、`blocked-by-mapping-readiness`、`blocked-by-api-diagnostics`、`blocked-by-contract-or-redaction`、`not-checked`。
- 新增 Bruno/operator 入口，读取 Admin observability，并通过私有脱敏变量接收 mapping readiness、Admin release decision handoff 和 API diagnostics decision evidence。
- Handoff 输出包含 `ownerHandoffs`、`minimumUnblockConditions`、`doNotDispatchUntil` 和不能外推边界，只允许进入受控 smoke 准备，不写真实 fixture、publish、refresh、gateway authorization facts 或数据库变更。
- 更新 Bruno README 和 OpenSpec 规格，说明 owner 边界、最小解除条件、脱敏要求和不能外推边界。

## Capabilities

### New Capabilities
- 无。

### Modified Capabilities
- `admin-gateway-organization-projection-publisher`: gateway projection operator handoff 增加 controlled smoke preflight handoff 输出契约。

## Impact

- Affected code: `api-tests/bruno/aicodex-admin/scripts/gatewayProjectionControlledSmokePreflightHandoff*.js`、`api-tests/bruno/aicodex-admin/50-Gateway Projection 观测/**`、Bruno README。
- Affected specs: `admin-gateway-organization-projection-publisher`。
- 不改 Admin runtime API、API、Insight、Gateway 仓库；不写真实 fixture、真实 DB、生产/类生产配置、密钥、token、Cookie 或完整响应体；不触碰 `40-组织树运营/**`。
