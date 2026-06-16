# WeCom 同步 operator handoff

本目录包含 Admin-owned WeCom organization sync 的只读检查和写入口。`Source Readiness Handoff`、`Source Release Decision`、`Controlled Smoke Preflight`、`Controlled Smoke Evidence Handoff`、`Controlled Smoke Execution Handoff`、`Controlled Smoke Result Evidence Handoff`、`Controlled Smoke Operator Triage Handoff`、`Controlled Smoke Operator Decision Handoff` 和 `Controlled Smoke Operator Action Handoff` 都只处理脱敏摘要或本地 alias；它们不触发真实 WeCom 同步、不查询或写入真实 DB、不写 fixture，也不证明组织树非空、Gateway/API/Insight 成功、authorization facts 生效或 full-success。

## Controlled Smoke Execution Handoff

`Controlled Smoke Execution Handoff.yml` 是真实 controlled smoke 前的本地只读执行交接证据 wrapper。它不会执行真实 smoke，只把前序脱敏结果整理为可复制、可复核、fail-closed 的 handoff。优先传入以下 JSON 变量：

- `wecomSourceControlledSmokeExecutionPreflightSummary`
- `wecomSourceControlledSmokeExecutionEvidenceHandoff`
- `wecomSourceControlledSmokeExecutionRemediationHandoff`

也可以使用 alias fallback：

- `wecomSourceControlledSmokeExecutionPreflightAlias`
- `wecomSourceControlledSmokeExecutionEvidenceAlias`
- `wecomSourceControlledSmokeExecutionRemediationAlias`

输出只应复制 `status`、`decision`、`reasonAlias`、`referenceSummaries`、`blockerReasons`、`redactionChecks`、`hardRedLineFlags`、`ownerHandoffs`、`minimumUnblockConditions`、`operatorNextActions`、`boundaries` 和 `doNotProceedReasons`。若输出为 `missing-*`、`blocked-prerequisite`、`redaction-required`、`hard-red-line-blocked` 或 `overclaim-full-success`，先补齐对应前置 summary、删除敏感值或移除真实执行/下游成功/full-success 断言后再重跑。即使输出为 `ready-for-controlled-smoke-execution-handoff`，也只代表可交接执行证据，不代表真实 WeCom 同步成功、组织树非空、Gateway/API/Insight 成功、authorization facts 生效、生产就绪或 full-success。

## Controlled Smoke Result Evidence Handoff

`Controlled Smoke Result Evidence Handoff.yml` 是真实 controlled smoke 后的本地只读 result evidence 交接 wrapper。它不会执行真实 smoke、不会写 DB/fixture/audit/projection 数据，也不会验证 Gateway/API/Insight。优先传入以下 JSON 变量：

- `wecomSourceControlledSmokeResultExecutionHandoff`
- `wecomSourceControlledSmokeResultAliases`
- `wecomSourceControlledSmokeResultCounts`
- `wecomSourceControlledSmokeResultDeploymentSummary`
- `wecomSourceControlledSmokeResultAuthorizationSummary`

也可以使用 alias/count fallback：

- `wecomSourceControlledSmokeResultExecutionAlias`
- `wecomSourceControlledSmokeResultStatus`
- `wecomSourceControlledSmokeResultAlias`
- `wecomSourceControlledSmokeResultExpectedCount`
- `wecomSourceControlledSmokeResultObservedCount`
- `wecomSourceControlledSmokeResultPassedCount`
- `wecomSourceControlledSmokeResultPartialCount`
- `wecomSourceControlledSmokeResultFailedCount`
- `wecomSourceControlledSmokeResultBlockedCount`
- `wecomSourceControlledSmokeResultMissingCount`
- `wecomSourceControlledSmokeResultUnauthorizedCount`
- `wecomSourceControlledSmokeResultDeploymentAlias`
- `wecomSourceControlledSmokeResultAuthorizationAlias`
- `wecomSourceControlledSmokeResultRedactionSignal`
- `wecomSourceControlledSmokeResultRiskCategory`

输出只应复制 `status`、`release`、`reasonAlias`、`resultAliases`、`resultCounts`、`missingPrerequisites`、`ownerHandoffLimits`、`operatorActions`、`redLineFlags`、`cannotInferBoundaries` 和 `evidenceShapeVersion`。`passed` 只代表本地脱敏 result evidence 可交接；`partial-handoff` 需要补齐缺失本地 evidence 或带限制交接；`needs-user-action` 需要补齐 execution/result/deployment/authorization/redaction/risk 前置摘要；`blocked` 需要先处理未部署、未授权、计数不一致、未知 alias、敏感字段、真实执行信号或 full-success overclaim。不要把任何输出外推为真实 WeCom 同步成功、组织树非空、Gateway/API/Insight 成功、authorization facts 生效、生产就绪或 full-success。

## Controlled Smoke Operator Triage Handoff

`Controlled Smoke Operator Triage Handoff.yml` 是 controlled smoke result evidence 和 remediation evidence 之后的本地只读 operator triage wrapper。它不会执行真实 smoke、不会写 DB/fixture/audit/projection 数据，也不会验证 Gateway/API/Insight。优先传入以下 JSON 变量：

- `wecomSourceControlledSmokeOperatorTriageResultEvidenceHandoff`
- `wecomSourceControlledSmokeOperatorTriageRemediationHandoff`

可选输入：

- `wecomSourceControlledSmokeOperatorTriageMetadata`
- `wecomSourceControlledSmokeOperatorTriageNote`
- `wecomSourceControlledSmokeOperatorTriageRequireReady`

输出只应复制 `status`、`blockerAlias`、`remediationAlias`、`resultAliases`、`resultCounts`、`remediationAliases`、`redactionCategory`、`riskCategory`、`nextSteps`、`ownerHandoffLimits`、`minimumUnblockConditions`、`redLineFlags`、`missingPrerequisites`、`cannotInferBoundaries`、`triagePackageMetadata` 和 `doNotDispatchUntil`。`ready-for-operator-triage-handoff` 只代表本地脱敏 triage package 可交接；`blocked` 需要先处理 result evidence blocker、partial/missing result、未知 alias 或脱敏失败；`needs-user-action` 需要补齐 operator action、approval alias 或 missing prerequisite；`hard-red-line` 需要删除真实 WeCom 同步、真实 controlled smoke、真实 fixture/DB、synthetic audit/projection、Gateway/API/Insight 成功、authorization facts、provider token、production readiness 或 full-success 外推。

本地无密 dry-run：

```powershell
node --test api-tests/bruno/aicodex-admin/scripts/wecomSourceControlledSmokeOperatorTriageHandoff.test.js
```

不要把任何 triage 输出外推为真实 WeCom 同步成功、组织树非空、Gateway/API/Insight 成功、authorization facts 生效、生产就绪、controlled smoke pass 或 full-success。

## Controlled Smoke Operator Decision Handoff

`Controlled Smoke Operator Decision Handoff.yml` 是 preflight/execution/result/remediation/triage evidence 之后的本地只读 operator decision package 入口。它不会执行真实 smoke、不会写 DB/fixture/audit/projection 数据，也不会验证 Gateway/API/Insight。优先传入以下 JSON 变量：

- `wecomSourceControlledSmokeOperatorDecisionPreflightSummary`
- `wecomSourceControlledSmokeOperatorDecisionExecutionHandoff`
- `wecomSourceControlledSmokeOperatorDecisionResultEvidenceHandoff`
- `wecomSourceControlledSmokeOperatorDecisionRemediationHandoff`
- `wecomSourceControlledSmokeOperatorDecisionTriageHandoff`

可选输入：

- `wecomSourceControlledSmokeOperatorDecisionMetadata`
- `wecomSourceControlledSmokeOperatorDecisionNote`
- `wecomSourceControlledSmokeOperatorDecisionRequireReady`

输出只应复制 `status`、`decisionStatus`、`blockerAlias`、`remediationAlias`、`decisionOptions`、`nextOptions`、`ownerHandoffLimits`、`minimumUnblockConditions`、`redLineFlags`、`missingPrerequisites`、`redactionMetadata`、`cannotInferBoundaries`、`decisionPackageMetadata` 和 `doNotDispatchUntil`。`ready-for-operator-decision-handoff` 只代表本地脱敏 decision package 可交接；`blocked` 需要先处理非 ready 上游 evidence、未知 alias 或脱敏失败；`needs-user-action` 需要补齐缺失前置 summary、operator action 或 approval alias；`hard-red-line` 需要删除真实 WeCom 同步、真实 controlled smoke、真实 fixture/DB、synthetic audit/projection、Gateway/API/Insight 成功、authorization facts、provider token、production readiness、controlled smoke pass 或 full-success 外推。

本地无密 dry-run：

```powershell
node --test api-tests/bruno/aicodex-admin/scripts/wecomSourceControlledSmokeOperatorDecisionHandoff.test.js
```

不要把任何 decision 输出外推为真实 WeCom 同步成功、组织树非空、Gateway/API/Insight 成功、authorization facts 生效、生产就绪、controlled smoke pass 或 full-success。

## Controlled Smoke Operator Action Handoff

`Controlled Smoke Operator Action Handoff.yml` 是 operator decision package 之后的本地只读 action package 入口。它不会执行真实 smoke、不会写 DB/fixture/audit/projection 数据，也不会验证 Gateway/API/Insight。优先传入以下 JSON 变量：

- `wecomSourceControlledSmokeOperatorActionDecisionHandoff`

可选输入：

- `wecomSourceControlledSmokeOperatorActionMetadata`
- `wecomSourceControlledSmokeOperatorActionNote`
- `wecomSourceControlledSmokeOperatorActionRequireReady`

输出只应复制 `actionStatus`、`release`、`nextAction`、`blockerAlias`、`remediationAlias`、`decisionStatus`、`resultAliases`、`resultCounts`、`redactionCategory`、`riskCategory`、`nextSteps`、`ownerHandoffLimits`、`minimumUnblockConditions`、`redLineFlags`、`missingPrerequisites`、`cannotInferBoundaries`、`actionPackageMetadata` 和 `doNotDispatchUntil`。`ready-for-operator-action` 只代表本地脱敏 action package 可交接；`blocked` 需要先处理缺失或非 ready decision、未知 alias 或脱敏失败；`needs-user-action` 需要补齐 operator action 或 approval alias；`hard-red-line` 需要删除真实 WeCom 同步、真实 controlled smoke、真实 fixture/DB、synthetic audit/projection、Gateway/API/Insight 成功、authorization facts、provider token、组织树重建、production readiness、controlled smoke pass 或 full-success 外推。

本地无密 dry-run：

```powershell
node --test api-tests/bruno/aicodex-admin/scripts/wecomSourceControlledSmokeOperatorActionHandoff.test.js
```

不要把任何 action 输出外推为真实 WeCom 同步成功、组织树非空、Gateway/API/Insight 成功、authorization facts 生效、生产就绪、controlled smoke pass 或 full-success。

## Operator Remediation Handoff

`Operator Remediation Handoff.yml` 是 controlled smoke 或人工执行前的本地只读失败修复交接 wrapper。它只消费前序 helper 的脱敏 summary 或稳定 alias：

- `wecomSourceOperatorRemediationReadinessSummary`
- `wecomSourceOperatorRemediationReleaseDecision`
- `wecomSourceOperatorRemediationPreflightSummary`
- `wecomSourceOperatorRemediationEvidenceHandoff`

也可以使用 alias fallback：

- `wecomSourceOperatorRemediationReadinessAlias`
- `wecomSourceOperatorRemediationReleaseAlias`
- `wecomSourceOperatorRemediationPreflightAlias`
- `wecomSourceOperatorRemediationEvidenceAlias`

输出只应复制 `status`、`reasonAlias`、`remediations`、`missingPrerequisites`、`redLineFlags`、`ownerHandoffs`、`minimumUnblockConditions`、`operatorNextActions`、`boundaries` 和 `doNotDispatchUntil`。若输出为 `blocked`、`needs-user-action` 或 `hard-red-line`，先处理 stable alias 指向的 owner action；即使输出为 `ready`，也只代表 Admin WeCom source remediation handoff 已清空，不能写成 controlled smoke 已通过、组织树非空、Gateway/API/Insight 成功、authorization facts 生效、生产就绪或 full-success。

## Controlled Smoke Evidence Handoff

`Controlled Smoke Evidence Handoff.yml` 是本地只读 evidence handoff，不执行真实 controlled smoke。优先传入以下 JSON 变量：

- `wecomSourceControlledSmokeReadinessSummary`
- `wecomSourceControlledSmokeReleaseSummary`
- `wecomSourceControlledSmokePreflightSummary`

也可以使用 alias fallback：

- `wecomSourceControlledSmokeReadinessAlias`
- `wecomSourceControlledSmokeReleaseAlias`
- `wecomSourceControlledSmokePreflightStatus`

输出只应复制 `status`、`reasonAlias`、`operatorNextActions`、`missingPrerequisites`、`redactionChecks`、`hardRedLineFlags` 和 `doNotProceedReasons`。若输出为 `redaction-required`、`hard-red-line-blocked` 或 `overclaim-full-success`，先删除敏感值、真实环境写入信号、下游成功断言或 full-success 说法后再重跑。
