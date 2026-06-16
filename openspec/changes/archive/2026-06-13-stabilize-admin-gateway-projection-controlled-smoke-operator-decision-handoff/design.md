## Context

已有 operator triage handoff 能把 release summary/result evidence 转换成可复制的 triage package。新的 decision handoff 位于 triage 之后，只做 bounded operator decision package，不重新解释真实 smoke 结果，也不触发任何网络或写入动作。

## Decisions

- 复用现有 Bruno scripts 的 CommonJS + `node:test` 风格，新增 `gatewayProjectionControlledSmokeOperatorDecisionHandoff.js` 和 focused test。
- decision helper 只消费调用方传入的脱敏 JSON：`operatorTriageHandoffSummary`、`resultEvidenceHandoffSummary`、`executionHandoffSummary`、`releaseSummaryHandoffSummary`、可选 `operatorNote` / `operatorMetadata`。它不读真实 endpoint、DB、fixture、Gateway store 或授权事实。
- 输出 `ready-for-operator-decision-handoff` 只表示四类本地脱敏 handoff summary 均为 ready，且输入没有敏感值、真实执行信号或外推声明；它允许 operator 复制最小下一步和边界，不表示 controlled smoke pass。
- 上游 `blocked` / `needs-user-action` / `hard-red-line` 必须被保留为 decision 状态，并继承稳定 alias、owner handoff limit 和最小解除条件；同时缺失多个摘要时返回 decision-level blocker。
- 未知 alias、敏感字段、真实 publish/controlled smoke/Gateway ingestion/authorization facts/fixture/DB/production-like 信号，以及 full-success/API/Gateway/Insight 成功外推，全部 fail closed。
- Bruno local-only 入口使用 `__local_only__` URL，并在 pre-request 打印 decision package 后抛错中止请求。

## Risks

- 最大风险是 operator 把本地 decision package 当作真实 smoke 成功。因此 helper、README、spec 和输出中的 `doNotDispatchUntil` / `cannotInferBoundaries` 都必须保留不能外推边界。
- 另一个风险是输出泄漏敏感输入。实现必须只输出稳定 alias、owner、计数摘要和下一步，不回显原始敏感字段或原始响应体。

## Rollout

这是本地 Bruno/script 能力，不需要部署服务、不需要数据库迁移、不需要真实环境配置。验证只运行本地 Node tests、OpenSpec validate 和 diff 检查。
