## Context

已有 operator action handoff 能把 decision package 收敛成 owner-safe action package。新的 readiness handoff 位于 action 之后，只把 action package 转换成可交接 readiness package，不重新解释 smoke 结果，也不触发任何网络、DB、fixture、mapping confirm、read model rebuild、gate 或 authorization fact 动作。

## Decisions

- 复用现有 Bruno scripts 的 CommonJS + `node:test` 风格，新增 `gatewayProjectionControlledSmokeOperatorReadinessHandoff.js` 和 focused test。
- readiness helper 只消费调用方传入的脱敏 JSON：`operatorActionHandoffSummary`、可选 `operatorNote` / `operatorMetadata`。它不读真实 endpoint、DB、fixture、Gateway store、authorization facts 或环境变量中的密钥。
- `readinessStatus=ready-for-operator-readiness-handoff` 只表示 action package 已 ready 且输入没有敏感值、真实执行信号或外推声明；`ownerSafeNextActions` 只能指导复制本地脱敏 readiness package 或继续本地 owner handoff。
- 上游 `blocked` / `needs-user-action` / `hard-red-line` 必须被保留为 readiness 状态，并继承稳定 alias、owner handoff limit 和最小解除条件；缺失 action package 返回 readiness-level blocker。
- `readyChecks` 必须明确列出 action package ready、redaction clean、no real execution signal、no cross-owner overclaim 和 owner boundary retained 等本地检查结果。
- `evidenceReferences` 只能保留脱敏 source alias、package shape、generatedAt、status/alias/counts summary，不回显原始证据、完整响应体、完整 organizationId、token、Cookie、私有 endpoint、账号、手机号、邮箱或完整组织树。
- 未知 alias、敏感字段、真实 publish/controlled smoke/Gateway ingestion/authorization facts/fixture/DB/production-like 信号、mapping confirm、read model rebuild、gate，以及 full-success/API/Gateway/Insight 成功外推，全部 fail closed。
- Bruno local-only 入口使用 `__local_only__` URL，并在 pre-request 打印 readiness handoff 后抛错中止请求。

## Risks

- 最大风险是 operator 把 readiness handoff 当作真实 smoke 成功。因此 helper、README、spec 和输出中的 `doNotDispatchUntil` / `cannotInfer` 都必须保留不能外推边界。
- 另一个风险是输出泄漏敏感输入。实现必须只输出稳定 alias、owner、计数摘要、脱敏 evidence references 和下一步，不回显原始敏感字段或原始响应体。

## Rollout

这是本地 Bruno/script 能力，不需要部署服务、不需要数据库迁移、不需要真实环境配置。验证只运行本地 Node tests、OpenSpec validate 和 diff 检查。
