## Why

Admin WeCom source controlled-smoke 路线已经有 preflight、execution、result evidence、operator remediation 和 operator triage handoff，但发布或值班负责人仍缺少一份最终可复制的本地脱敏 decision package。当前 operator 容易把分散 evidence 误写成真实 WeCom 同步成功、controlled smoke pass、组织树非空、Gateway/API/Insight 成功、authorization facts 生效、生产就绪或 full-success。

## What Changes

- 新增 Admin-owned WeCom source controlled smoke operator decision handoff，用本地脱敏 preflight/execution/result/remediation/triage evidence 生成 operator/release 负责人可交接的 decision package。
- 输出稳定 `status` 和 `decisionStatus`，保留 `decisionOptions`、`nextOptions`、`blockerAlias`、`remediationAlias`、`ownerHandoffLimits`、`minimumUnblockConditions`、`redLineFlags`、`redactionMetadata`、`cannotInferBoundaries` 和 `doNotDispatchUntil`。
- 对证据不足、未知 alias、脱敏失败、真实 WeCom/DB/fixture/Gateway/API/Insight/authorization facts/生产类信号、controlled smoke pass 或 full-success 外推执行 fail closed。
- 新增 local-only Node helper/test、Bruno pre-request 入口和 README 说明。Bruno 入口只加载本地 helper、打印 decision package，并主动中止网络请求。
- 同步 `wecom-organization-sync` spec，明确 operator decision handoff 只表示 Admin 本地脱敏 decision package 可交接，不能证明真实同步、受控 smoke、组织树、下游系统、授权事实或生产状态成功。

## Capabilities

### New Capabilities

### Modified Capabilities

- `wecom-organization-sync`: 增加 Admin WeCom source controlled smoke operator decision handoff 的本地脱敏决策交接要求。

## Impact

- 影响范围限定在 `aicodex-admin` 的 WeCom Bruno 本地入口、Node helper/test、operator README 和 OpenSpec artifacts。
- 不修改 API、Insight、Gateway 仓库或真实同步 provider。
- 不触发真实 WeCom 同步、不读写真实 DB、不写真实 fixture、不访问密钥、不启用生产或类生产 gate、不合入或 push `test`。
