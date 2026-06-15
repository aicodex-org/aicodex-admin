## Context

已有 release summary handoff 能把 result evidence 与 release summary 分类为 `ready-for-release-summary-handoff`、`blocked`、`needs-user-action` 或 `hard-red-line`。本 change 在该输出之后增加 Admin-owned triage package，不重新解释真实 smoke 结果，也不触发任何网络或写入动作。

## Decisions

- 复用现有 Bruno scripts 的 CommonJS + `node:test` 风格，新增 `gatewayProjectionControlledSmokeOperatorTriageHandoff.js` 和 focused test。
- triage helper 只消费调用方传入的脱敏 JSON：`releaseSummaryHandoffSummary`、`resultEvidenceHandoffSummary`、可选 `operatorNote` / `operatorMetadata`。它不读真实 endpoint、DB、fixture、Gateway store 或授权事实。
- 输出 `ready-for-operator-triage-handoff` 只表示 release summary handoff 已 ready 且输入没有敏感值、真实执行信号或外推声明；它允许 operator 复制最小下一步和边界，不表示 controlled smoke pass。
- 上游 `blocked` / `needs-user-action` / `hard-red-line` 必须被保留为 triage 状态，并继承稳定 alias、owner handoff limit 和最小解除条件。
- 未知 alias、计数/alias 不一致、敏感字段、真实 publish/controlled smoke/Gateway ingestion/authorization facts/fixture/DB/production-like 信号，以及 full-success/API/Gateway/Insight 成功外推，全部 fail closed。
- Bruno local-only 入口使用 `__local_only__` URL，并在 pre-request 打印 triage package 后抛错中止请求。

## Risks

- 最大风险是 operator 把本地 triage package 当作真实 smoke 成功。因此 helper、README、spec 和输出中的 `doNotDispatchUntil` / `cannotInferBoundaries` 都必须保留不能外推边界。
- 另一个风险是输出泄漏敏感输入。实现必须只输出稳定 alias、owner、计数摘要和下一步，不回显原始敏感字段或原始响应体。

## Rollout

这是本地 Bruno/script 能力，不需要部署服务、不需要数据库迁移、不需要真实环境配置。验证只运行本地 Node tests、OpenSpec validate 和 diff 检查。
