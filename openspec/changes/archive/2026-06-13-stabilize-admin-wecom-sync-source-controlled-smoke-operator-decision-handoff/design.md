# Design

## Goals

- 在 Admin owner 边界内，把 preflight、execution、result evidence、operator remediation 和 operator triage 的脱敏摘要汇总为 operator/release 负责人可复制的 decision package。
- 输出必须说明 decision status、可选下一步、stable blocker alias、最小解除条件、fail-closed 红线、redaction metadata 和不能外推边界。
- helper 和 Bruno 入口必须 local-only，不触发真实 WeCom 同步、真实 endpoint、真实 token、真实 DB、真实 fixture 或跨 owner 系统。

## Inputs

helper 接受一个对象，字段语义如下：

- `preflightSummary`：来自 `Controlled Smoke Preflight` 的脱敏摘要，ready 状态为 `ready-for-wecom-controlled-smoke-preflight`。
- `executionHandoffSummary`：来自 `Controlled Smoke Execution Handoff` 的脱敏摘要，ready 状态为 `ready-for-controlled-smoke-execution-handoff`。
- `resultEvidenceHandoffSummary`：来自 `Controlled Smoke Result Evidence Handoff` 的脱敏摘要，ready 状态为 `passed`。
- `operatorRemediationHandoffSummary`：来自 `Operator Remediation Handoff` 的脱敏摘要，ready 状态为 `ready`。
- `operatorTriageHandoffSummary`：来自 `Controlled Smoke Operator Triage Handoff` 的脱敏摘要，ready 状态为 `ready-for-operator-triage-handoff`。
- `operatorMetadata` 和 `operatorNote`：可选脱敏值班批次、环境别名或备注，不能包含真实 endpoint、token、账号、手机号、邮箱、组织树、完整响应体、fixture、DB 或下游成功断言。

## Decisions

- 只有五类前序摘要全部 ready、无 red-line flag、无 missing prerequisite、无敏感字段或真实执行信号时，返回 `status=ready-for-operator-decision-handoff` 与 `decisionStatus=ready-for-operator-release-decision`。该状态只表示本地脱敏 decision package 可以交接，不表示 controlled smoke pass 或 full-success。
- 缺少任一前序 summary 时返回 `needs-user-action`，`blockerAlias` 指向缺失项，`minimumUnblockConditions` 指向对应 local-only helper。
- 任一前序 summary 非 ready 时返回 `blocked` 或沿用上游 `needs-user-action`/`hard-red-line`，保留 stable blocker alias、owner handoff limit 和最小解除条件。
- 输入或备注出现真实 WeCom 同步、真实 controlled smoke、真实 fixture/DB、synthetic audit/projection、Gateway/API/Insight 成功、authorization facts、provider token、生产类 endpoint、真实 gate、controlled smoke pass 或 full-success 外推时返回 `hard-red-line`。
- 输入包含 token、Cookie、Authorization、secret、私有 URL、真实账号、手机号、邮箱、完整组织树、完整 organizationId、完整响应体、source tenant、credential/config/secret ref 或原始环境信息时返回 `blocked`，输出不得 echo 原始敏感值。
- `redactionMetadata` 只记录分类、来源摘要是否脱敏、敏感值是否被拒绝和 package shape；不记录真实地址、账号、密钥或完整响应体。

## Read-only Boundary

Bruno 入口使用 `http://127.0.0.1/__local_only_wecom_source_controlled_smoke_operator_decision_handoff__` 占位 URL，在 `before-request` 里加载 helper、读取 Bruno 变量、打印 decision package，然后主动 `throw` 中止请求。helper 不依赖网络、数据库、环境密钥、真实 fixture 或外部服务。

## Verification

- 先写 focused Node 测试并确认 RED。
- 实现 helper 后运行 focused `node --test`。
- 使用 Node 原生 coverage 覆盖新增 helper，line/branch/function 均不低于 85%。
- 运行 Admin WeCom source controlled-smoke 相关 helper tests。
- 运行 `openspec validate`、主规格/changes strict validate 和 `git diff --check`。
