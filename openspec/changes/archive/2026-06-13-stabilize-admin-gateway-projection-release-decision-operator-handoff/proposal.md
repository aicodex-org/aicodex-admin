## Why

现有 gateway projection release decision 能把脱敏 readiness evidence 归类为稳定 decision，但 operator 仍需要一个更小、更可复制的 handoff 输出，用于明确下一步 action、owner、最小解除条件和禁止外推边界。

如果缺少该 handoff 层，协调线程容易把 `ready-for-controlled-smoke` 误写成真实 publish/full-success，或在 blocked/not-checked 时无法快速分派给 Admin source、mapping、deploy/config 或 operator owner。

## What Changes

- 新增或扩展本地只读 JS wrapper，将既有 `gatewayProjectionReleaseDecision` 输出转换为 operator handoff summary。
- Handoff summary SHALL 包含 `status`、`release`、`localBlockerCategory`、`decision`、稳定 alias、owner handoff、最小解除条件、`doNotDispatchUntil` 和不能外推边界。
- Bruno `Release Decision` 入口输出该 handoff summary，继续只读读取 observability 和私有脱敏 mapping readiness evidence，不触发 publish、refresh、mapping confirm 或 fixture 写入。
- 更新 Bruno README 和 OpenSpec 规格，说明各 decision 对应 owner/action/minimum unblock condition，以及 `ready-for-controlled-smoke` 只允许进入受控 smoke 准备。

## Capabilities

### New Capabilities

- 无。

### Modified Capabilities

- `admin-gateway-organization-projection-publisher`: release decision guardrail 增加 operator handoff/action guidance 输出契约。

## Impact

- Affected code: `api-tests/bruno/aicodex-admin/scripts/gatewayProjectionReleaseDecision*.js`、`api-tests/bruno/aicodex-admin/50-Gateway Projection 观测/Release Decision.yml`、Bruno README。
- Affected specs: `admin-gateway-organization-projection-publisher`。
- 不改 Admin API、API、Insight、Gateway 仓库，不写真实 fixture、真实 DB、密钥、生产或类生产环境，不触碰 `40-组织树运营/**`。
