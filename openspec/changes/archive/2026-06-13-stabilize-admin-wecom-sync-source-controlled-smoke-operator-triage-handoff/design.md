## Context

已有 `wecomSourceControlledSmokeResultEvidenceHandoff` 能把 controlled smoke 结果材料分类为 `passed`、`partial-handoff`、`needs-user-action` 或 `blocked`；`wecomSourceOperatorRemediationHandoff` 能把 source readiness / preflight / evidence blocker 转为 operator remediation。当前缺口是把这两类脱敏材料合并成值班 operator 可直接复制的 triage package，并明确下一步、最小解除条件和不能外推边界。

## Decisions

- 复用现有 Bruno scripts 的 CommonJS + `node:test` 风格，新增 `wecomSourceControlledSmokeOperatorTriageHandoff.js` 和 focused test。
- triage helper 只消费调用方传入的脱敏 JSON：`resultEvidenceHandoffSummary`、`operatorRemediationHandoffSummary`、可选 `operatorNote` / `operatorMetadata`。它不读真实 endpoint、DB、fixture、Gateway/API/Insight store、WeCom provider token 或授权事实。
- 输出 `ready-for-operator-triage-handoff` 只表示 result evidence handoff 已 passed 且 remediation handoff ready，输入没有敏感值、真实执行信号或外推声明；它允许 operator 复制最小下一步和边界，不表示真实同步或 controlled smoke full-success。
- 上游 `blocked`、`needs-user-action`、`hard-red-line` 必须被保留为 triage 状态，并继承稳定 alias、owner handoff limit 和最小解除条件。
- result evidence 的 `partial-handoff` 或非 passed 状态不得升级为 ready；必须保留为 `blocked`，要求补齐或重新收集本地脱敏 result evidence。
- 未知 alias、敏感字段、真实 WeCom 同步/fixture/DB/下游成功信号、authorization facts、production readiness、full-success 或跨 owner 成功外推，全部 fail closed。
- Bruno local-only 入口使用 `__local_only__` URL，并在 pre-request 打印 triage package 后抛错中止请求。

## Risks

- 最大风险是 operator 把本地 triage package 当作真实同步或下游成功。因此 helper、README、spec 和输出中的 `doNotDispatchUntil` / `cannotInferBoundaries` 都必须保留不能外推边界。
- 另一个风险是输出泄漏敏感输入。实现必须只输出稳定 alias、owner、计数摘要和下一步，不回显原始敏感字段或原始响应体。

## Rollout

这是本地 Bruno/script 能力，不需要部署服务、不需要数据库迁移、不需要真实环境配置。验证只运行本地 Node tests、OpenSpec validate 和 diff 检查。
