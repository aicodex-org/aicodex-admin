## Context

已有 operator decision handoff 能把 triage/result/execution/release-summary 摘要转换成 compact decision package。新的 action handoff 位于 decision 之后，只把 decision package 收敛成 operator 可执行的本地行动状态，不重新解释 smoke 结果，也不触发任何网络或写入动作。

## Decisions

- 复用现有 Bruno scripts 的 CommonJS + `node:test` 风格，新增 `gatewayProjectionControlledSmokeOperatorActionHandoff.js` 和 focused test。
- action helper 只消费调用方传入的脱敏 JSON：`operatorDecisionHandoffSummary`、可选 `operatorNote` / `operatorMetadata`。它不读真实 endpoint、DB、fixture、Gateway store、authorization facts 或环境变量中的密钥。
- `actionStatus=ready-for-operator-action` 只表示 decision package 已 ready 且输入没有敏感值、真实执行信号或外推声明；它的 `nextAction` 只能是交接本地脱敏 action package 或继续本地 owner handoff。
- 上游 `blocked` / `needs-user-action` / `hard-red-line` 必须被保留为 action 状态，并继承稳定 alias、owner handoff limit 和最小解除条件；缺失 decision package 返回 action-level blocker。
- 未知 alias、敏感字段、真实 publish/controlled smoke/Gateway ingestion/authorization facts/fixture/DB/production-like 信号，以及 full-success/API/Gateway/Insight 成功外推，全部 fail closed。
- Bruno local-only 入口使用 `__local_only__` URL，并在 pre-request 打印 action handoff 后抛错中止请求。

## Risks

- 最大风险是 operator 把本地 action handoff 当作真实 smoke 成功。因此 helper、README、spec 和输出中的 `doNotDispatchUntil` / `cannotInferBoundaries` 都必须保留不能外推边界。
- 另一个风险是输出泄漏敏感输入。实现必须只输出稳定 alias、owner、计数摘要和下一步，不回显原始敏感字段或原始响应体。

## Rollout

这是本地 Bruno/script 能力，不需要部署服务、不需要数据库迁移、不需要真实环境配置。验证只运行本地 Node tests、OpenSpec validate 和 diff 检查。
