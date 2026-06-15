# Bruno aicodex-admin Collection

本目录是 aicodex-admin 的 Bruno 接口 smoke 集合，用于 GUI 手工调试和 `bru` CLI 运行态验证。

## 范围

- `00-健康检查/`：无需登录的服务健康检查。
- `10-认证/`：本地账号登录和当前账号校验。
- `20-基础只读/`：组织、应用等后台基础只读接口。
- `30-WeCom 同步/`：企业微信组织同步配置和 run 查询；手动同步请求默认关闭。
- `40-组织树运营/`：组织树运营诊断和只读刷新状态 smoke；不触发 read model 重建。
- `50-Gateway Projection 观测/`：admin-to-gateway projection producer 只读运行态观测；不触发 publish，不写 gateway 授权事实。
- `environments/`：本地和远端占位环境，真实账号、密码和 cookie 不得提交。

## 本机私有环境

如需在 GUI 中保存个人测试凭据，创建：

```text
api-tests/bruno/aicodex-admin/environments/local-private.yml
```

`*-private.yml` 已被 `.gitignore` 忽略。提交前可用下面命令确认没有误写真实凭据：

```powershell
git diff -- api-tests/bruno/aicodex-admin/environments
```

## 远端测试私有环境

`remote-test.yml` 用于远端测试环境，包含真实地址、账号或 cookie 时按本机私有配置处理，不提交到 Git：

```text
api-tests/bruno/aicodex-admin/environments/remote-test.yml
```

仓库只提供 Bruno collection 和无密环境模板；个人或 CI 的远端测试配置需要在各自环境中维护。多工作区共享、hardlink、备份和冲突处理属于本机运维配置，不是仓库前提；如果本机另有私有同步工具，按该工具自己的 README 操作。

如需团队共享变量名或调用方式，只提交无密模板、README 字段说明或 Bruno 请求本身，不提交真实 `remote-test.yml`。

## CLI 示例

```powershell
cd <你的本地仓库路径>/api-tests/bruno/aicodex-admin
bru run "00-健康检查" -r --env local
bru run "10-认证/登录.yml" "10-认证/当前账号.yml" --env local-private
bru run "10-认证/登录.yml" "20-基础只读/组织列表.yml" "20-基础只读/应用列表.yml" --env local-private
bru run "10-认证/登录.yml" "30-WeCom 同步/同步配置.yml" "30-WeCom 同步/同步 runs.yml" --env local-private
bru run "10-认证/登录.yml" "30-WeCom 同步/同步配置.yml" "30-WeCom 同步/同步 runs.yml" "30-WeCom 同步/Source Readiness Handoff.yml" --env local-private
bru run "10-认证/登录.yml" "30-WeCom 同步/同步配置.yml" "30-WeCom 同步/同步 runs.yml" "30-WeCom 同步/Source Release Decision.yml" --env local-private
bru run "30-WeCom 同步/Controlled Smoke Operator Triage Handoff.yml" --env local-private
bru run "30-WeCom 同步/Controlled Smoke Operator Decision Handoff.yml" --env local-private
bru run "30-WeCom 同步/Controlled Smoke Operator Action Handoff.yml" --env local-private
bru run "10-认证/登录.yml" "40-组织树运营/诊断.yml" "40-组织树运营/刷新状态.yml" --env local-private
bru run "10-认证/登录.yml" "40-组织树运营/Readiness Summary.yml" --env local-private
bru run "10-认证/登录.yml" "40-组织树运营/Evidence Snapshot.yml" --env local-private
bru run "10-认证/登录.yml" "40-组织树运营/Handoff Summary.yml" --env local-private
bru run "10-认证/登录.yml" "50-Gateway Projection 观测/运行态观测.yml" --env local-private
bru run "10-认证/登录.yml" "50-Gateway Projection 观测/Readiness Summary.yml" --env local-private
bru run "10-认证/登录.yml" "50-Gateway Projection 观测/Release Decision.yml" --env local-private
bru run "10-认证/登录.yml" "50-Gateway Projection 观测/Controlled Smoke Preflight Handoff.yml" --env local-private
bru run "10-认证/登录.yml" "50-Gateway Projection 观测/Controlled Smoke Release Runbook.yml" --env local-private
bru run "50-Gateway Projection 观测/Controlled Smoke Evidence Readiness.yml" --env local-private
bru run "50-Gateway Projection 观测/Operator Remediation Handoff.yml" --env local-private
bru run "50-Gateway Projection 观测/Remediation Result Evidence Handoff.yml" --env local-private
bru run "50-Gateway Projection 观测/Controlled Smoke Execution Handoff.yml" --env local-private
bru run "50-Gateway Projection 观测/Controlled Smoke Result Evidence Handoff.yml" --env local-private
bru run "50-Gateway Projection 观测/Controlled Smoke Release Summary Handoff.yml" --env local-private
bru run "50-Gateway Projection 观测/Controlled Smoke Operator Triage Handoff.yml" --env local-private
bru run "50-Gateway Projection 观测/Controlled Smoke Operator Decision Handoff.yml" --env local-private
bru run "50-Gateway Projection 观测/Controlled Smoke Operator Action Handoff.yml" --env local-private
```

WeCom 同步读接口需要 `wecomOrganization`。`30-WeCom 同步/手动触发同步.yml` 会创建后台同步 run，必须显式设置 `wecomSyncWriteEnabled=true` 才能执行。

### WeCom source readiness handoff

`30-WeCom 同步/Source Readiness Handoff.yml` 是 Admin owner 给 operator 的只读 source readiness 交接入口。它只读取 `/api/wecom-org-sync/config`，并消费 `同步 runs.yml` 缓存的脱敏 run 摘要，输出可复制字段：

- `status`
- `aliases`
- `ownerHandoffs`
- `minimumUnblockConditions`
- `safeNextActions`
- `evidenceShapeVersion`

建议执行顺序：

```powershell
bru run "10-认证/登录.yml" "30-WeCom 同步/同步配置.yml" "30-WeCom 同步/同步 runs.yml" "30-WeCom 同步/Source Readiness Handoff.yml" --env local-private
```

如果 operator 已通过只读、无写入的配置测试拿到脱敏凭据验证结果，可放入私有变量：

```text
wecomSourceReadinessConnectionTestResponse={"status":"ok","data":{"credentialVerified":true}}
```

稳定 alias 与 owner handoff：

- `wecom_config_missing`：找 Admin source owner。最小解除条件是配置只读接口返回 `isConfigured=true`，并具备启用状态、Corp ID 和脱敏 secret 占位。
- `wecom_config_disabled`：找 Admin source owner。最小解除条件是 `config.isEnabled=true`。
- `wecom_credential_not_verified`：找 Admin operator。只读收集 `config/test` 脱敏结果或最近成功 run 摘要；不得记录真实 secret、token 或原始响应体。
- `wecom_latest_run_failed`：找 Admin source owner。排查最近一次 WeCom sync run 的安全错误分类，等待后续成功 run 证明 source snapshot 完成。
- `wecom_no_recent_success`：找 Admin operator。默认要求最近 72 小时内存在 succeeded run；可用 `wecomSourceReadinessRecentSuccessWindowHours` 调整窗口。
- `wecom_run_active`：找 Admin operator。等待当前 active run 进入终态后重跑只读 handoff。
- `wecom_source_ready`：只表示 Admin WeCom source readiness handoff 本地分类通过，可以交给组织树/projection 后续 owner 继续判断。

该入口不得触发 `手动触发同步.yml`，不得创建 sync run，不查询 API/Insight/Gateway 数据，不读取或写入真实 DB，不写真实 fixture，不暴露 token、secret、Cookie、私有 URL、真实账号、手机号、邮箱、完整组织树、完整 organizationId 或原始响应体。`wecom_source_ready` 不能外推为组织树非空、gateway projection、authorization report、受控 smoke 或 full-success。

### WeCom source release decision

`30-WeCom 同步/Source Release Decision.yml` 是 Admin owner 在 source readiness handoff 之后提供的只读 release decision guardrail。它只读取 `/api/wecom-org-sync/config`，本地生成或消费脱敏 `Source Readiness Handoff` 摘要，再输出更小的 operator decision：

- `decision=ready_for_org_tree_readiness`：只表示 Admin WeCom source readiness handoff 已达到后续交接前置条件。
- `decision=blocked`：source readiness blocker、脱敏失败或 evidence 未检查完整，必须先解除 `reasonAlias` 对应条件。

建议执行顺序：

```powershell
bru run "10-认证/登录.yml" "30-WeCom 同步/同步配置.yml" "30-WeCom 同步/同步 runs.yml" "30-WeCom 同步/Source Readiness Handoff.yml" "30-WeCom 同步/Source Release Decision.yml" --env local-private
```

输出字段只用于回传协调层或 operator：

- `status`
- `release`
- `decision`
- `reasonAlias`
- `aliases`
- `ownerHandoffs`
- `minimumUnblockConditions`
- `safeNextSteps`
- `doNotProceedReasons`
- `evidenceShapeVersion`

`ready_for_org_tree_readiness` 的 `release=release_after_report` 只允许进入后续 owner 的组织树只读 readiness 或 controlled smoke 准备；它不能证明组织树非空、Gateway projection 可发布、authorization facts 生效、API/Insight/Gateway full-success、真实 DB 状态或 fixture 可用。`release=hold` 时不得把 `wecom_config_missing`、`wecom_config_disabled`、`wecom_credential_not_verified`、`wecom_latest_run_failed`、`wecom_no_recent_success`、`wecom_run_active`、`sanitization_failed` 或 `wecom_source_readiness_not_checked` 写成下游成功。

如果值班要求 release decision 必须达到后续只读 readiness 前置状态，再设置：

```text
wecomSourceReleaseDecisionRequireReady=true
wecomSourceReleaseDecisionSourceAlias=local-dry-run
```

可选 `wecomSourceReleaseDecisionOperatorMetadata` 只能放脱敏别名或值班批次，不得包含 token、Cookie、Bearer、私有 URL、真实账号、手机号、邮箱、完整 organizationId、完整组织树、真实 fixture、真实 DB 信息、Gateway/API/Insight 成功断言或原始响应体。出现这些迹象时，release decision 会 fail closed 为 `reasonAlias=sanitization_failed`。

本地无密 dry-run：

```powershell
node --test api-tests/bruno/aicodex-admin/scripts/wecomSourceReleaseDecision.test.js
node -e "const {createWecomSourceReleaseDecision}=require('./api-tests/bruno/aicodex-admin/scripts/wecomSourceReleaseDecision'); console.log(createWecomSourceReleaseDecision({sourceReadinessHandoff:{status:'ready',aliases:['wecom_source_ready'],ownerHandoffs:[],minimumUnblockConditions:[],safeNextActions:['交给后续 owner'],evidenceShapeVersion:'wecom-source-readiness-handoff/v1'}},{sourceAlias:'local-dry-run'}))"
```

回传 release decision 时只写 `status`、`release`、`decision`、`reasonAlias`、alias、owner、最小解除条件、`safeNextSteps`、`doNotProceedReasons` 和环境别名；不得写真实地址、token、Cookie、账号、手机号、邮箱、完整 organizationId、完整组织树、完整 WeCom response、完整 source metadata、真实 fixture 或真实 DB 内容。

### WeCom source controlled smoke preflight

`30-WeCom 同步/Controlled Smoke Preflight.yml` 是进入 Admin WeCom source 受控 smoke 前的本地只读 guardrail。它只读取 Bruno 私有变量并调用 `wecomSourceControlledSmokePreflight.js`，在 `before-request` 输出结果后主动中止 HTTP 请求；不会连接真实环境、触发 `手动触发同步.yml`、查询或写入真实 DB、写 fixture、publish、gateway ingestion 或 authorization facts。

输入只允许脱敏 alias：

```text
wecomSourceControlledSmokeSourceReadinessAlias=wecom_source_ready
wecomSourceControlledSmokeReleaseDecisionAlias=wecom_source_ready
wecomSourceControlledSmokeFreshnessAlias=fresh
wecomSourceControlledSmokeRedactionSignal=redacted
wecomSourceControlledSmokeBlockingAlias=none
wecomSourceControlledSmokeOperatorScope=local-readonly-preflight
wecomSourceControlledSmokeSourceAlias=local-dry-run
```

稳定 `status`：

- `ready-for-wecom-controlled-smoke-preflight`：只表示 Admin WeCom source 受控 smoke 前置证据已用脱敏 alias 检查。
- `missing-readiness-handoff`：先运行 `Source Readiness Handoff.yml`。
- `missing-release-decision`：先运行 `Source Release Decision.yml`。
- `source-not-fresh`：回到 Admin source owner 处理 freshness/state。
- `redaction-required`：删除 token、Cookie、Bearer、私有 URL、真实账号、手机号、邮箱、完整 organizationId、完整组织树、完整响应体或真实 source metadata 后重跑。
- `red-line-blocked`：存在 blocking alias 或 operator scope 不是本地只读 preflight。
- `overclaim-full-success`：输入混入真实同步、真实 DB、fixture、Gateway/API/Insight、authorization facts、publish、生产就绪或 full-success 断言。

如果值班要求 preflight 必须 ready，再设置：

```text
wecomSourceControlledSmokeRequireReady=true
```

本地无密 dry-run：

```powershell
node --test api-tests/bruno/aicodex-admin/scripts/wecomSourceControlledSmokePreflight.test.js
node -e "const {createWecomSourceControlledSmokePreflight}=require('./api-tests/bruno/aicodex-admin/scripts/wecomSourceControlledSmokePreflight'); console.log(createWecomSourceControlledSmokePreflight({sourceReadinessAlias:'wecom_source_ready',releaseDecisionAlias:'wecom_source_ready',sourceConnectionFreshnessAlias:'fresh',redactionSignal:'redacted',blockingAlias:'none',operatorScope:'local-readonly-preflight'},{sourceAlias:'local-dry-run'}))"
```

回传 controlled smoke preflight 时只写 `status`、`release`、`reasonAlias`、owner、最小解除条件、`safeNextSteps`、`doNotProceedReasons`、`evidenceShapeVersion` 和环境别名。`ready-for-wecom-controlled-smoke-preflight` 不能证明组织树非空、Gateway/API/Insight 成功、authorization facts 生效、真实 WeCom 同步成功、生产就绪或 full-success。

### WeCom source controlled smoke operator triage handoff

`30-WeCom 同步/Controlled Smoke Operator Triage Handoff.yml` 是 result evidence/remediation evidence 之后的本地只读 operator triage package 入口。它只消费 `Controlled Smoke Result Evidence Handoff` 和 `Operator Remediation Handoff` 的脱敏 JSON 输出，pre-request 生成 triage package 后主动中止网络请求，避免误连真实环境。

常用私有变量：

- `wecomSourceControlledSmokeOperatorTriageResultEvidenceHandoff`：上一阶段 `Controlled Smoke Result Evidence Handoff` 的脱敏 JSON 输出。
- `wecomSourceControlledSmokeOperatorTriageRemediationHandoff`：上一阶段 `Operator Remediation Handoff` 的脱敏 JSON 输出。
- `wecomSourceControlledSmokeOperatorTriageMetadata`：可选脱敏值班 metadata；不得包含 token、Cookie、私有 URL、真实账号、手机号、邮箱、完整组织树、完整响应体、`configRef` 或 `secretRef`。
- `wecomSourceControlledSmokeOperatorTriageNote`：可选备注；不得写真实 WeCom 同步、真实 fixture/DB、Gateway/API/Insight 成功、authorization facts、production readiness、controlled smoke pass 或 full-success 外推。
- `wecomSourceControlledSmokeOperatorTriageRequireReady=true`：值班要求 triage package 必须 ready 时启用；否则只输出本地分类并中止请求。

典型输出：

- `ready-for-operator-triage-handoff`：只表示 Admin WeCom source 本地脱敏 operator triage package 可交接给后续 operator 复核。
- `blocked`：缺 result evidence/remediation handoff，或者上游 result evidence 已 blocked/partial、未知 alias、脱敏失败。
- `needs-user-action`：operator 还需要补齐 missing prerequisite、approval/action alias 或其他脱敏用户动作，输出会保留稳定 blocker alias 和最小解除条件。
- `hard-red-line`：输入包含真实 WeCom 同步、真实 controlled smoke、真实 fixture/DB、synthetic audit/projection、Gateway/API/Insight 成功、authorization facts、provider token、production readiness 或 full-success 外推。

本地无密 dry-run：

```powershell
node --test api-tests/bruno/aicodex-admin/scripts/wecomSourceControlledSmokeOperatorTriageHandoff.test.js
node -e "const {createWecomSourceControlledSmokeOperatorTriageHandoff}=require('./api-tests/bruno/aicodex-admin/scripts/wecomSourceControlledSmokeOperatorTriageHandoff'); console.log(createWecomSourceControlledSmokeOperatorTriageHandoff({resultEvidenceHandoffSummary:{status:'passed',release:'release_after_report',resultAliases:['wecom_source_controlled_smoke_result_passed'],resultCounts:{expected:2,observed:2,passed:2,partial:0,failed:0,blocked:0,missing:0,unauthorized:0},redactionCategory:'redacted',riskCategory:'low'},operatorRemediationHandoffSummary:{status:'ready',release:'release_after_report',reasonAlias:'ready',remediations:[],missingPrerequisites:[],redLineFlags:[]}},{sourceAlias:'local-dry-run'}))"
```

Controlled smoke operator triage handoff 只能写 `status`、`blockerAlias`、`remediationAlias`、`resultAliases`、`resultCounts`、`remediationAliases`、`redactionCategory`、`riskCategory`、`nextSteps`、`ownerHandoffLimits`、`minimumUnblockConditions`、`redLineFlags`、`missingPrerequisites`、`cannotInferBoundaries`、`triagePackageMetadata`、`doNotDispatchUntil` 和环境别名；不得写真实地址、token、Cookie、账号、手机号、邮箱、完整 organizationId、完整组织树、完整 WeCom/API/Gateway/Insight response、完整 diagnostics response、真实 fixture 或真实 DB 内容。`status=ready-for-operator-triage-handoff` 只表示 Admin WeCom source 本地脱敏 triage package 可交接，不能外推为真实 WeCom 同步成功、组织树非空、Gateway/API/Insight 成功、authorization facts 生效、生产就绪、controlled smoke pass 或 full-success。

### WeCom source controlled smoke operator decision handoff

`30-WeCom 同步/Controlled Smoke Operator Decision Handoff.yml` 是 preflight/execution/result/remediation/triage evidence 之后的本地只读 operator decision package 入口。它只消费前序 local-only helper 的脱敏 JSON 输出，pre-request 生成 decision package 后主动中止网络请求，避免误连真实环境。

常用私有变量：

- `wecomSourceControlledSmokeOperatorDecisionPreflightSummary`：上一阶段 `Controlled Smoke Preflight` 的脱敏 JSON 输出。
- `wecomSourceControlledSmokeOperatorDecisionExecutionHandoff`：上一阶段 `Controlled Smoke Execution Handoff` 的脱敏 JSON 输出。
- `wecomSourceControlledSmokeOperatorDecisionResultEvidenceHandoff`：上一阶段 `Controlled Smoke Result Evidence Handoff` 的脱敏 JSON 输出。
- `wecomSourceControlledSmokeOperatorDecisionRemediationHandoff`：上一阶段 `Operator Remediation Handoff` 的脱敏 JSON 输出。
- `wecomSourceControlledSmokeOperatorDecisionTriageHandoff`：上一阶段 `Controlled Smoke Operator Triage Handoff` 的脱敏 JSON 输出。
- `wecomSourceControlledSmokeOperatorDecisionMetadata`：可选脱敏值班 metadata；不得包含 token、Cookie、私有 URL、真实账号、手机号、邮箱、完整组织树、完整响应体、`configRef` 或 `secretRef`。
- `wecomSourceControlledSmokeOperatorDecisionNote`：可选备注；不得写真实 WeCom 同步、真实 controlled smoke、真实 fixture/DB、Gateway/API/Insight 成功、authorization facts、production readiness、controlled smoke pass 或 full-success 外推。
- `wecomSourceControlledSmokeOperatorDecisionRequireReady=true`：值班要求 decision package 必须 ready 时启用；否则只输出本地分类并中止请求。

典型输出：

- `ready-for-operator-decision-handoff`：只表示 Admin WeCom source 本地脱敏 operator decision package 可交接给 operator/release 负责人复核。
- `blocked`：上游 preflight/execution/result/remediation/triage 非 ready，或者存在未知 alias、脱敏失败。
- `needs-user-action`：operator 还需要补齐缺失前置 summary、approval/action alias 或其他脱敏用户动作。
- `hard-red-line`：输入包含真实 WeCom 同步、真实 controlled smoke、真实 fixture/DB、synthetic audit/projection、Gateway/API/Insight 成功、authorization facts、provider token、production readiness、controlled smoke pass 或 full-success 外推。

本地无密 dry-run：

```powershell
node --test api-tests/bruno/aicodex-admin/scripts/wecomSourceControlledSmokeOperatorDecisionHandoff.test.js
node -e "const {createWecomSourceControlledSmokeOperatorDecisionHandoff}=require('./api-tests/bruno/aicodex-admin/scripts/wecomSourceControlledSmokeOperatorDecisionHandoff'); console.log(createWecomSourceControlledSmokeOperatorDecisionHandoff({preflightSummary:{status:'ready-for-wecom-controlled-smoke-preflight'},executionHandoffSummary:{status:'ready-for-controlled-smoke-execution-handoff'},resultEvidenceHandoffSummary:{status:'passed',resultAliases:['wecom_source_controlled_smoke_result_passed'],redactionCategory:'redacted',riskCategory:'low'},operatorRemediationHandoffSummary:{status:'ready'},operatorTriageHandoffSummary:{status:'ready-for-operator-triage-handoff',blockerAlias:'none',remediationAlias:'wecom_source_operator_triage_package_ready',resultAliases:['wecom_source_controlled_smoke_result_passed'],redactionCategory:'redacted',riskCategory:'low'}}))"
```

Controlled smoke operator decision handoff 只能写 `status`、`decisionStatus`、`blockerAlias`、`remediationAlias`、`decisionOptions`、`nextOptions`、`ownerHandoffLimits`、`minimumUnblockConditions`、`redLineFlags`、`missingPrerequisites`、`redactionMetadata`、`cannotInferBoundaries`、`decisionPackageMetadata`、`doNotDispatchUntil` 和环境别名；不得写真实地址、token、Cookie、账号、手机号、邮箱、完整 organizationId、完整组织树、完整 WeCom/API/Gateway/Insight response、完整 diagnostics response、真实 fixture 或真实 DB 内容。`status=ready-for-operator-decision-handoff` 只表示 Admin WeCom source 本地脱敏 decision package 可交接，不能外推为真实 WeCom 同步成功、组织树非空、Gateway/API/Insight 成功、authorization facts 生效、生产就绪、controlled smoke pass 或 full-success。

### WeCom source controlled smoke operator action handoff

`30-WeCom 同步/Controlled Smoke Operator Action Handoff.yml` 是 operator decision 之后的本地只读 action package 入口。它只消费 `Controlled Smoke Operator Decision Handoff` 的脱敏 JSON 输出，pre-request 生成 owner-safe action package 后主动中止网络请求，避免误连真实环境。

常用私有变量：

- `wecomSourceControlledSmokeOperatorActionDecisionHandoff`：上一阶段 `Controlled Smoke Operator Decision Handoff` 的脱敏 JSON 输出。
- `wecomSourceControlledSmokeOperatorActionMetadata`：可选脱敏值班 metadata；不得包含 token、Cookie、私有 URL、真实账号、手机号、邮箱、完整组织树、完整响应体、`configRef` 或 `secretRef`。
- `wecomSourceControlledSmokeOperatorActionNote`：可选备注；不得写真实 WeCom 同步、真实 controlled smoke、真实 fixture/DB、Gateway/API/Insight 成功、authorization facts、organization tree rebuild、production readiness、controlled smoke pass 或 full-success 外推。
- `wecomSourceControlledSmokeOperatorActionRequireReady=true`：值班要求 action package 必须 ready 时启用；否则只输出本地分类并中止请求。

典型输出：

- `ready-for-operator-action`：只表示 Admin WeCom source 本地脱敏 operator action package 可交接给值班 operator 执行下一步。
- `blocked`：缺 decision package、上游 decision 未 ready、未知 alias 或脱敏失败。
- `needs-user-action`：operator 还需要补齐 approval/action alias 或其他脱敏用户动作。
- `hard-red-line`：输入包含真实 WeCom 同步、真实 controlled smoke、真实 fixture/DB、Gateway/API/Insight 成功、authorization facts、provider token、organization tree rebuild、production readiness、controlled smoke pass 或 full-success 外推。

本地无密 dry-run：

```powershell
node --test api-tests/bruno/aicodex-admin/scripts/wecomSourceControlledSmokeOperatorActionHandoff.test.js
node -e "const {createWecomSourceControlledSmokeOperatorActionHandoff}=require('./api-tests/bruno/aicodex-admin/scripts/wecomSourceControlledSmokeOperatorActionHandoff'); console.log(createWecomSourceControlledSmokeOperatorActionHandoff({operatorDecisionHandoffSummary:{status:'ready-for-operator-decision-handoff',release:'release_after_report',blockerAlias:'none',remediationAlias:'wecom_source_operator_decision_package_ready',resultAliases:['wecom_source_controlled_smoke_result_passed'],redactionMetadata:{category:'redacted',riskCategory:'low'},ownerHandoffLimits:[{alias:'wecom_source_controlled_smoke_operator_decision_handoff',owner:'admin_operator',minimumUnblockCondition:'decision package 已 ready'}]}}))"
```

Controlled smoke operator action handoff 只能写 `actionStatus`、`release`、`nextAction`、`blockerAlias`、`remediationAlias`、`decisionStatus`、`resultAliases`、`resultCounts`、`redactionCategory`、`riskCategory`、`nextSteps`、`ownerHandoffLimits`、`minimumUnblockConditions`、`redLineFlags`、`missingPrerequisites`、`cannotInferBoundaries`、`actionPackageMetadata`、`doNotDispatchUntil` 和环境别名；不得写真实地址、token、Cookie、账号、手机号、邮箱、完整 organizationId、完整组织树、完整 WeCom/API/Gateway/Insight response、完整 diagnostics response、真实 fixture 或真实 DB 内容。`actionStatus=ready-for-operator-action` 只表示 Admin WeCom source 本地脱敏 action package 可交接，不能外推为真实 WeCom 同步成功、组织树非空、Gateway/API/Insight 成功、authorization facts 生效、生产就绪、controlled smoke pass 或 full-success。

组织树运营 smoke 优先使用 `organizationTreeOperationsOrganization`，未设置时复用 `wecomOrganization`。如果要把“非空组织树能力”作为通过条件，还需要设置 `organizationTreeOperationsRequireNonEmpty=true`，并使用已知具备可管理组织树的测试账号或受控 fixture。

### Organization tree readiness summary

`40-组织树运营/Readiness Summary.yml` 是 Admin 组织树运营的只读汇总入口。它默认只读取 `/api/organization-tree-operations/diagnostics`，复用仓库内 `organizationTreeOperationsSmokeSummary.js`，输出脱敏 `status`、`aliases`、counts、检查状态、owner handoff 和最小解除条件。该入口不会触发 `refresh_read_model`、不会写真实 fixture、不会查询或清理真实 DB，也不会把 summary 写成 API/Gateway/Insight 授权事实。

默认情况下，summary 会把未提供的刷新状态标记为 `not_checked`，用于提醒 operator 还没有证明 `refresh_status` 路径。若要把刷新状态纳入通过条件，先运行只读 `40-组织树运营/刷新状态.yml`，再将脱敏响应 JSON 放入私有变量：

```text
organizationTreeOperationsRefreshStatusResponse={"status":"ok","data":{"triggerType":"refresh_status","status":"ok","traceId":"trace-redacted","diagnostics":{"summary":{"readModelSource":"platform_department"}}}}
organizationTreeOperationsRequireRefreshStatus=true
```

如果本次值班要求组织树响应必须来自单独入口或受控 fixture 证明，而不是只使用诊断 `nodes`，可将脱敏组织树响应放入私有变量，并要求 summary 必须 ready：

```text
organizationTreeOperationsTreeResponse={"status":"ok","data":{"nodes":[{"id":"dept-redacted"}]}}
organizationTreeOperationsRequireTreeResponse=true
organizationTreeOperationsRequireSummaryReady=true
```

稳定 alias 与 owner handoff：

- `empty_tree`：找 fixture owner 或 Admin source owner。最小解除条件是使用已知具备可管理组织树的测试账号或受控 fixture，并让 Admin 诊断/组织树响应证明 nodes 非空。
- `non_empty_fixture_missing`：找 fixture owner。表示本次 summary 未提供足够的非空组织树证明，不能外推为 Admin 非空组织树能力通过。
- `read_model_untrusted`：找 Admin read model owner。必须回到 Admin-owned `platform_department`、`mixed_platform_group`、`compat_group` 或等价可信 source；consumer-only 结果和 Insight fallback 不可作为通过条件。
- `source_connection_stale`：找 Admin source owner。检查 SourceConnection 状态、freshness、source snapshot 和同步批次；不得让 API/Insight 本地补算组织树或 scope。
- `lineage_missing`：找 Admin source owner。补齐脱敏 lineage、sourceVersion、orgVersion/scopeVersion 或 sync batch 摘要后重跑。
- `refresh_status_unavailable`：找 Admin operator。只读调用 `refresh_status`，确认返回 `traceId`、`triggerType=refresh_status` 和稳定诊断摘要。
- `sanitization_failed`：summary 输入包含疑似 token、Cookie、Authorization、secret/config ref、source tenant metadata、手机号、邮箱或完整响应体；删除敏感输入后重跑。

本地无密 dry-run：

```powershell
node --test api-tests/bruno/aicodex-admin/scripts/organizationTreeOperationsSmokeSummary.test.js
node -e "const {evaluateOrganizationTreeOperationsSmokeSummary}=require('./api-tests/bruno/aicodex-admin/scripts/organizationTreeOperationsSmokeSummary'); console.log(evaluateOrganizationTreeOperationsSmokeSummary({diagnosticsResponse:{status:'ok',data:{summary:{readModelSource:'platform_department',lineage:{available:true},sourceConnectionSummary:{total:1,statusCounts:{ENABLED:1},freshnessCounts:{FRESH:1}}},nodes:[{id:'dept-redacted'}],sourceConnections:[{status:'ENABLED',freshness:'FRESH'}]}}}))"
```

验证记录只能写 summary `status`、alias、reason、counts、owner、最小解除条件和环境别名；不得写真实地址、token、Cookie、账号、手机号、邮箱、完整 organizationId、完整组织树、完整 diagnostics response 或完整来源响应体。普通空树、consumer-only 结果或 Insight fallback 不能记录为 Admin 非空组织树运营能力通过。

### Organization tree evidence snapshot

`40-组织树运营/Evidence Snapshot.yml` 是 Admin 组织树运营的只读证据快照入口。它读取同一个诊断接口，并复用 `organizationTreeOperationsSmokeSummary.js` 的 readiness 规则，再由 `organizationTreeOperationsEvidenceSnapshot.js` 生成可提交/可回传的最小证据包。快照只保留 `status`、稳定 alias、counts、检查状态、owner handoff、最小解除条件、lease release 建议和不能外推边界。

Evidence snapshot 默认允许输出 `blocked` 或 `not_checked`，用于安全交接当前最小解除条件；如果本次值班要求必须 ready，再设置：

```text
organizationTreeOperationsRequireEvidenceReady=true
```

证据快照输入包含 token、Cookie、Authorization、Bearer、私有 URL、邮箱、手机号、账号字段、source tenant metadata、完整响应体字段或完整组织树节点列表迹象时，会 fail closed，并返回 `organization_tree_evidence_sanitization_failed`。此时只保留 alias、reason、owner handoff、最小解除条件和边界，不输出原始值。

本地无密 dry-run：

```powershell
node --test api-tests/bruno/aicodex-admin/scripts/organizationTreeOperationsEvidenceSnapshot.test.js
node -e "const {createOrganizationTreeOperationsEvidenceSnapshot}=require('./api-tests/bruno/aicodex-admin/scripts/organizationTreeOperationsEvidenceSnapshot'); console.log(createOrganizationTreeOperationsEvidenceSnapshot({diagnosticsResponse:{status:'ok',data:{summary:{readModelSource:'platform_department',lineage:{available:true},sourceConnectionSummary:{total:1,statusCounts:{ENABLED:1},freshnessCounts:{FRESH:1}}},nodes:[{id:'dept-redacted'}],sourceConnections:[{status:'ENABLED',freshness:'FRESH'}]}}}))"
```

Evidence snapshot 不能证明 `subjectCount>=1`，不能替代受控 60 smoke 或真实 fixture 授权，也不是 API/Gateway/Insight 授权事实。回传时只写快照 `status`、alias、counts、owner、最小解除条件和边界；不得写真实地址、token、Cookie、账号、手机号、邮箱、完整 organizationId、完整组织树、完整 diagnostics response 或完整来源响应体。

### Organization tree handoff summary

`40-组织树运营/Handoff Summary.yml` 是 Admin owner 给协调层或 operator 的只读交接摘要入口。它读取同一个诊断接口，先生成 evidence snapshot，再由 `organizationTreeOperationsHandoffSummary.js` 转换为更小的可复制摘要，只保留 `status`、`release`、`localBlockerCategory`、稳定 alias、counts、owner handoff、最小解除条件、`doNotDispatchUntil` 和不能外推边界。

Handoff summary 的 `release=release_after_report` 只表示该证据包可以交给协调层继续判断；它不能证明 `subjectCount>=1`，不能替代受控 60 smoke、真实 fixture 授权、真实 read model 重建或数据库核验，也不是 API/Gateway/Insight 授权事实。`release=hold` 时不得把空树、consumer-only、not checked 或 evidence snapshot 写成 full-success。

常见本地 blocker 分类：

- `none`：当前 handoff 可释放给协调层，但仍受不能外推边界约束。
- `local_evidence_not_checked`：本地证据未检查完整，例如缺少受控非空组织树响应。
- `fixture_or_local_check_blocked`：fixture、空树或只读刷新状态阻断，按 alias 的最小解除条件处理。
- `admin_source_or_read_model_blocked`：Admin-owned source/read model/lineage 阻断，必须回到 Admin owner 排障。
- `sanitization_failed`：输入或 operator metadata 含 token、Cookie、Bearer、私有 URL、账号、邮箱、手机号、完整组织树节点列表或完整响应体，删除后重跑。

如果值班要求 handoff 必须可释放，再设置：

```text
organizationTreeOperationsRequireHandoffRelease=true
```

可选设置 `organizationTreeOperationsHandoffSourceAlias` 为脱敏别名，例如 `local-dry-run` 或 `60-readonly-smoke`；不要写真实地址、账号或私有 URL。

本地无密 dry-run：

```powershell
node --test api-tests/bruno/aicodex-admin/scripts/organizationTreeOperationsHandoffSummary.test.js
node -e "const {createOrganizationTreeOperationsHandoffSummary}=require('./api-tests/bruno/aicodex-admin/scripts/organizationTreeOperationsHandoffSummary'); console.log(createOrganizationTreeOperationsHandoffSummary({summary:{status:'not_checked',aliases:['non_empty_fixture_missing'],counts:{nodeCount:0},handoffs:[{alias:'non_empty_fixture_missing',owner:'fixture_owner',minimumUnblockCondition:'受控 fixture 或测试账号证明 Admin-owned nodes 非空'}]}}))"
```

回传 handoff summary 时只写 `status`、`release`、`localBlockerCategory`、alias、counts、owner、最小解除条件、`doNotDispatchUntil` 和边界；不得写真实地址、token、Cookie、账号、手机号、邮箱、完整 organizationId、完整组织树、完整 diagnostics response 或完整来源响应体。

`40-组织树运营/重建read-model.yml` 会触发受控 read model 刷新路径，默认被脚本阻断。只有在明确的测试窗口、已确认测试账号/fixture、并接受可能创建来源同步 run 时，才在私有环境设置：

```text
organizationTreeOperationsRebuildEnabled=true
```

验证记录只能写入脱敏结果摘要，例如 health 通过、诊断字段存在、节点非空、`refresh_status` 返回 `traceId`、`refresh_read_model` 返回 `accepted/running/unavailable/error` 等；不得记录真实地址、token、Cookie、账号、手机号、邮箱、完整组织结构或完整响应体。

Gateway projection 观测 smoke 只读取 `/api/gateway-projection/observability`，用于确认 publisher/refresh worker 的启用状态、TTL/interval 关系和 latest publish audit 摘要。默认不要求 latest audit 存在；如果要把“发布链路最近确实执行过”作为通过条件，在私有环境设置：

```text
gatewayProjectionRequireLatestAudit=true
```

latest publish audit 存在时，smoke 会调用仓库内只读 preflight，验证 `sourceConnectionStatus` 兼容字段和 `sourceConnectionSummary` 结构化诊断。该 summary 只包含 source connection 总数、status/freshness 计数，以及 stale/unavailable/unknown freshness 布尔信号；不得包含 `sourceTenantId`、`metadata`、`configRef`、`secretRef`、token、Cookie 或完整响应体。`source_connection_stale`、`source_connection_disabled`、`unknown` 等分类只用于 admin producer 排障，不是 gateway authorization facts，也不能被 API/Insight 用于本地补算 projection、报表 scope 或 runtime allow/deny。

部署/运行态 shape preflight 的稳定阻断语义：

- `environment_deploy_stale`：缺 latest publish audit（且已启用 `gatewayProjectionRequireLatestAudit=true`）、latest audit 仍是旧 shape、缺 `sourceConnectionSummary`、缺 status/freshness counts 或缺 freshness 布尔信号。该 alias 表示当前部署包或运行态响应尚未包含 source freshness 诊断能力，不证明 Admin 代码实现失败，也不能记录为完整 projection 业务成功。最小解除条件是部署包含当前 Admin preflight/observability shape 的包，并让 `/api/gateway-projection/observability` 返回 `latestPublish.sourceConnectionSummary`。
- `no_publishable_subjects`：启用 subject/tombstone 最小数量断言后，latest audit 存在但 counts 低于阈值。该 alias 表示受控 fixture readiness 未就绪，不等同于部署包过期。
- `sanitization_failed`：响应中出现疑似敏感字段名或内容，例如 token 字段、Cookie、source tenant metadata、config/secret ref 或显式 Bearer 值。`projection_token_missing` 这类稳定诊断分类文本不是凭据泄漏。验证记录只能写 alias、reason、counts 和环境别名，不写完整响应体。

本地无密 dry-run 可直接调用 Node 测试或脚本函数，不需要真实地址或登录态：

```powershell
node --test api-tests/bruno/aicodex-admin/scripts/gatewayProjectionObservabilityPreflight.test.js
node -e "const {evaluateGatewayProjectionObservabilityPreflight}=require('./api-tests/bruno/aicodex-admin/scripts/gatewayProjectionObservabilityPreflight'); console.log(evaluateGatewayProjectionObservabilityPreflight({status:'ok',data:{publisher:{enabled:true,configured:true,freshnessTtlSeconds:1800},refresh:{enabled:true,intervalLessThanTtl:true}}},{requireLatestAudit:true}))"
```

如果要把“60 已具备可发布 subject fixture”作为通过条件，必须先由 operator 在私有测试窗口准备脱敏测试主体，并显式设置：

```text
gatewayProjectionRequireLatestAudit=true
gatewayProjectionMinSubjectCount=1
```

active subject fixture 的 admin 前置条件：

- `PlatformUser.OrganizationId` 指向目标测试组织。
- `PlatformUser.AdminSubject` 稳定且非空；不得用展示名、手机号或邮箱作为 join key。
- `PlatformUser.LifecycleStatus=ACTIVE`。
- `PlatformUser.MappingStatus=CONFIRMED`。
- 存在同 `organizationId + adminSubject` 的 `PlatformApiUserMapping`。
- `PlatformApiUserMapping.MappingStatus=CONFIRMED`，且 `ApiUserId` 非空。
- 组织快照有可用 `OrgSyncBatch.OrgVersion/FinishedAt` 或等价 source version，保证 lineage 可判定。

如需验证 tombstone subject，再准备一个非 active lifecycle 测试主体，并设置：

```text
gatewayProjectionMinTombstoneSubjectCount=1
```

tombstone subject 必须仍有确定 `ApiUserId`。`PlatformUser.MappingStatus=DISABLED` 只能用于 `DISABLED/DELETED/CONFLICTED/UNKNOWN/STALE` 等非 active lifecycle 的撤销或收敛，不允许发布 active subject。

旧 `ExternalIdentity.Lineage.apiSubjectId`、`User.Properties.apiUserId` 或 `User.Properties.aicodexApiUserId` 只能作为迁移候选来源，不能作为 runtime projection 的直接发布依据。真实 60 fixture 写入、数据库明细查询或清理动作需要用户明确授权；验证记录只能写入脱敏摘要，不得记录真实账号、手机号、邮箱、完整组织结构、token、Cookie 或完整 gateway 响应。

该接口和 smoke 只服务 admin producer 排障，不是 gateway authorization facts，也不允许 Insight 或 API 以此本地补算 projection。

### Gateway projection readiness summary

`50-Gateway Projection 观测/Readiness Summary.yml` 是 operator 的只读汇总入口。它读取 `/api/gateway-projection/observability`，复用仓库内 `gatewayProjectionReadinessSummary.js`，输出脱敏 `status`、`aliases`、counts、owner handoff 和最小解除条件。该入口不会触发 publish、refresh、mapping confirm、真实 fixture 写入，也不会查询 API/Insight/gateway store。

默认只检查部署包/source freshness observability shape，并把 mapping readiness 标记为 `not_checked`。如果 operator 已经通过只读接口拿到脱敏 `/api/get-platform-api-user-mapping-readiness` 响应，可将完整响应 JSON 放入私有环境变量：

```text
gatewayProjectionMappingReadinessResponse={"status":"ok","data":{"totalSubjectCount":1,"counts":{"active_publishable":1,"mapping_missing":0,"mapping_untrusted":0,"source_metadata_unavailable":0,"lineage_freshness_unavailable":0}}}
```

如果本次值班要求 mapping readiness 必须参与汇总，再设置：

```text
gatewayProjectionRequireMappingReadiness=true
```

稳定 alias 与 owner handoff：

- `environment_deploy_stale`：找 Admin deploy/runtime owner。最小解除条件是部署包含当前 Admin observability/preflight shape 的包，并让 latest publish audit 返回 `sourceConnectionSummary`、status/freshness counts 和 freshness 布尔信号。
- `source_connection_stale`：找 Admin source owner。只检查 Admin-owned source connection status/freshness、source snapshot、OrgSyncBatch 和 source version；不得让 API/Insight 本地补算 projection。
- `mapping_missing` / `mapping_untrusted`：找 Admin mapping operator。必须维护同 `organizationId + adminSubject` 的一等 `PlatformApiUserMapping.ApiUserId` 和可信 mapping 状态；不得使用 display name、手机号、邮箱、旧 lineage 或 `User.Properties.*apiUserId` 作为 runtime join key。
- `source_metadata_unavailable` / `lineage_freshness_unavailable`：找 Admin source owner，补齐 Admin 主模型的 orgVersion/sourceVersion/batch/freshness 元数据后重新读取 readiness。
- `no_publishable_subjects`：找 fixture owner。它表示受控 active/tombstone subject fixture 未满足私有阈值，不表示部署包旧，也不能记录为完整 projection 业务成功。
- `sanitization_failed`：summary 输入包含疑似凭据字段或值；删除 token、Cookie、secret/config ref、source tenant metadata 或完整响应体后重跑。

本地无密 dry-run：

```powershell
node --test api-tests/bruno/aicodex-admin/scripts/gatewayProjectionReadinessSummary.test.js
node -e "const {evaluateGatewayProjectionReadinessSummary}=require('./api-tests/bruno/aicodex-admin/scripts/gatewayProjectionReadinessSummary'); console.log(evaluateGatewayProjectionReadinessSummary({observabilityResponse:{status:'ok',data:{publisher:{enabled:true,configured:true,freshnessTtlSeconds:1800},refresh:{enabled:true,intervalLessThanTtl:true}}}}))"
```

验证记录只能写 summary `status`、alias、reason、counts、owner 和环境别名；不得写真实地址、token、Cookie、账号、手机号、邮箱、完整 organizationId、完整组织树、完整 gateway response 或完整 readiness candidates。

### Gateway projection release decision

`50-Gateway Projection 观测/Release Decision.yml` 是 operator 的本地 release decision guardrail 和 handoff summary 入口。它读取同一个 `/api/gateway-projection/observability` 响应，复用 `gatewayProjectionReleaseDecision.js` 把脱敏 preflight/readiness evidence 归类为 decision，并输出可复制的 `release`、`localBlockerCategory`、owner handoff、最小解除条件和 `doNotDispatchUntil`：

- `ready-for-controlled-smoke`：本地 evidence 已检查且没有 blocking alias，只能进入受控 smoke 判断。
- `blocked-by-source-freshness`：source freshness stale/unavailable/unknown 等 Admin source 阻断。
- `blocked-by-mapping-readiness`：`mapping_missing`、`mapping_untrusted`、`source_metadata_unavailable`、`lineage_freshness_unavailable` 或 lifecycle readiness 阻断。
- `blocked-by-contract-or-config`：部署 shape 旧、latest audit 缺失、subject fixture gate 未满足、敏感输入、contract/config 或未知 alias 阻断。
- `not-checked`：缺少 observability 或 required mapping readiness evidence。

Handoff action 口径：

- `ready-for-controlled-smoke`：`release=release_after_report`，只允许进入受控 smoke 准备；下一步仍使用私有环境阈值和脱敏 evidence 验证。
- `blocked-by-source-freshness`：找 `admin_source_owner`，最小解除条件是 Admin-owned source connection freshness、source snapshot、`OrgSyncBatch` 或 sourceVersion/freshness evidence 可判定。
- `blocked-by-mapping-readiness`：找 `admin_mapping_operator` 或 Admin source owner，补齐一等 `PlatformApiUserMapping.ApiUserId`、可信 mapping/lifecycle 状态和 source metadata；不得使用 display name、phone、email、legacy lineage 或 `User.Properties.*apiUserId` 作为 runtime join key。
- `blocked-by-contract-or-config`：找 deploy/config/contract owner 或 fixture owner，修复部署 shape、latest audit、subject fixture gate、contract/config 或 sanitization failure 后重跑。
- `not-checked`：找 `admin_operator`，先生成脱敏 observability preflight、readiness summary 和必要 mapping readiness evidence。

如果值班要求 release decision 必须达到受控 smoke 前置状态，再设置：

```text
gatewayProjectionRequireReleaseDecisionReady=true
gatewayProjectionRequireMappingReadiness=true
gatewayProjectionReleaseDecisionSourceAlias=local-dry-run
```

本地无密 dry-run：

```powershell
node --test api-tests/bruno/aicodex-admin/scripts/gatewayProjectionReleaseDecision.test.js
node -e "const {createGatewayProjectionReleaseDecisionHandoff}=require('./api-tests/bruno/aicodex-admin/scripts/gatewayProjectionReleaseDecision'); console.log(createGatewayProjectionReleaseDecisionHandoff({observabilityResponse:{status:'ok',data:{publisher:{enabled:true,configured:true,freshnessTtlSeconds:1800},refresh:{enabled:true,intervalLessThanTtl:true},latestPublish:{projectionBatchId:'batch-redacted',subjectCount:1,tombstoneSubjectCount:0,sourceConnectionStatus:'ENABLED',sourceConnectionSummary:{total:1,statusCounts:{ENABLED:1},freshnessCounts:{FRESH:1},hasStaleFreshness:false,hasUnavailableFreshness:false,hasUnknownFreshness:false}}}},mappingReadinessResponse:{status:'ok',data:{totalSubjectCount:1,counts:{active_publishable:1}}}},{requireMappingReadiness:true,sourceAlias:'local-dry-run'}))"
```

Release decision handoff 只代表本地 Admin preflight/readiness evidence 分类，不是真实 publish 成功、gateway ingestion 成功、authorization facts 生效或完整 projection 业务成功。验证记录只能写 `decision`、`status`、`release`、`localBlockerCategory`、alias、owner、最小解除条件、`doNotDispatchUntil` 和环境别名；不得写真实地址、token、Cookie、账号、手机号、邮箱、完整 organizationId、完整组织树、完整 gateway response、完整 readiness candidates 或完整 source metadata。

### Gateway projection controlled smoke preflight handoff

`50-Gateway Projection 观测/Controlled Smoke Preflight Handoff.yml` 是进入受控 smoke 准备前的只读交接入口。它默认读取 `/api/gateway-projection/observability`，本地生成 Admin release decision handoff 和 Admin readiness summary，并通过私有脱敏变量接收 API diagnostics decision evidence：

```text
gatewayProjectionApiDiagnosticsDecision={"status":"ok","decision":"ready","aliases":[]}
gatewayProjectionRequireMappingReadiness=true
gatewayProjectionControlledSmokePreflightSourceAlias=local-dry-run
```

如果协调层已提供脱敏 Admin evidence，也可直接传入，避免重复生成：

```text
gatewayProjectionAdminReleaseDecisionHandoff={"status":"ready","release":"release_after_report","decision":"ready-for-controlled-smoke","aliases":[]}
gatewayProjectionAdminReadinessSummary={"status":"ok","aliases":[],"mappingReadiness":{"status":"ok","counts":{"active_publishable":1}}}
```

稳定 decision 与 owner 口径：

- `ready-for-controlled-smoke-prep`：`release=release_after_report`，只允许进入受控 smoke 准备；不得写成真实 publish、gateway ingestion、authorization facts 或 full-success。
- `blocked-by-admin-release-decision`：找 Admin release/operator owner，先解除 release decision handoff 中的本地 blocker。
- `blocked-by-admin-source-freshness`：找 `admin_source_owner`，最小解除条件是 Admin-owned source connection freshness、source snapshot、`OrgSyncBatch` 或 sourceVersion/freshness evidence 可判定。
- `blocked-by-mapping-readiness`：找 `admin_mapping_operator`，补齐一等 `PlatformApiUserMapping.ApiUserId`、可信 mapping/lifecycle 状态或 Admin source metadata；不得使用 display name、phone、email、legacy lineage 或 `User.Properties.*apiUserId` 作为 runtime join key。
- `blocked-by-api-diagnostics`：找 `api_diagnostics_owner`，由 API owner 提供脱敏 diagnostics decision clear evidence；Admin 不查询 API/Insight/Gateway DB、不读取私有 URL 或原始 API response。
- `blocked-by-contract-or-redaction`：输入存在未知 contract、未知 alias、token、Cookie、私有 endpoint、真实账号、手机号、邮箱、完整 organizationId、完整组织树、完整响应体、source tenant metadata、configRef 或 secretRef。
- `not-checked`：缺少 required Admin release、Admin readiness/source/mapping 或 API diagnostics evidence；下一步只收集只读脱敏 evidence。

如果值班要求该 handoff 必须 ready，再设置：

```text
gatewayProjectionRequireControlledSmokePreflightReady=true
gatewayProjectionRequireMappingReadiness=true
```

本地无密 dry-run：

```powershell
node --test api-tests/bruno/aicodex-admin/scripts/gatewayProjectionControlledSmokePreflightHandoff.test.js
node -e "const {createGatewayProjectionControlledSmokePreflightHandoff}=require('./api-tests/bruno/aicodex-admin/scripts/gatewayProjectionControlledSmokePreflightHandoff'); console.log(createGatewayProjectionControlledSmokePreflightHandoff({adminReleaseDecisionHandoff:{status:'ready',release:'release_after_report',decision:'ready-for-controlled-smoke',aliases:[]},adminReadinessSummary:{status:'ok',aliases:[],mappingReadiness:{status:'ok',counts:{active_publishable:1}}},apiDiagnosticsDecision:{status:'ok',decision:'ready',aliases:[]}}, {sourceAlias:'local-dry-run'}))"
```

Controlled smoke preflight handoff 只能写 `decision`、`status`、`release`、`localBlockerCategory`、alias、owner、最小解除条件、`doNotDispatchUntil` 和环境别名；不得写真实地址、token、Cookie、账号、手机号、邮箱、完整 organizationId、完整组织树、完整 gateway/API response、完整 readiness candidates 或完整 source metadata。

### Gateway projection controlled smoke release runbook

`50-Gateway Projection 观测/Controlled Smoke Release Runbook.yml` 是进入受控 smoke 发布交接前的只读 runbook/guardrail。它默认读取 `/api/gateway-projection/observability`，本地生成 Admin release decision handoff、Admin readiness summary 和 controlled smoke preflight handoff，再输出更小的可复制 runbook 摘要：

- `status`
- `release`
- `reason`
- `operatorNextActions`
- `missingPrerequisites`
- `hardRedLineFlags`
- `redactedEvidenceHints`
- `ownerHandoffs`
- `minimumUnblockConditions`
- `doNotDispatchUntil`

如果协调层已经提供脱敏 evidence，可直接传入，避免重复生成：

```text
gatewayProjectionAdminReleaseDecisionHandoff={"status":"ready","release":"release_after_report","decision":"ready-for-controlled-smoke","aliases":[]}
gatewayProjectionControlledSmokePreflightHandoff={"status":"ready","release":"release_after_report","decision":"ready-for-controlled-smoke-prep","aliases":[]}
gatewayProjectionControlledSmokeReleaseRunbookEvidenceSummary={"sourceAlias":"local-dry-run","evidenceHints":[{"sourceAlias":"admin-release","status":"ready","decision":"ready-for-controlled-smoke","alias":"ready_for_controlled_smoke","owner":"admin_operator"}]}
```

稳定阻断口径：

- `controlled_smoke_release_runbook_prerequisite_missing`：缺 release decision alias、preflight alias、handoff 或脱敏 evidence summary。下一步只补齐只读脱敏 evidence。
- `controlled_smoke_release_runbook_red_line_blocked`：输入包含 token、Cookie、私有 endpoint、真实账号、手机号、邮箱、完整 organizationId、完整组织树、完整响应体、真实 fixture/DB/publish/ingestion/read model rebuild 信号，或把结果写成 full-success。
- `controlled_smoke_release_runbook_blocking_alias`：release decision 或 preflight 仍是 blocked/hold/not-checked/未知 alias。按 owner handoff 解除最小条件后重跑。
- `controlled_smoke_release_runbook_ready`：只允许进入受控 smoke 准备；不得写成真实 publish、gateway ingestion、authorization facts 或 full-success。

如果值班要求 runbook 必须 ready，再设置：

```text
gatewayProjectionRequireControlledSmokeReleaseRunbookReady=true
gatewayProjectionRequireMappingReadiness=true
gatewayProjectionControlledSmokeReleaseRunbookSourceAlias=local-dry-run
```

本地无密 dry-run：

```powershell
node --test api-tests/bruno/aicodex-admin/scripts/gatewayProjectionControlledSmokeReleaseRunbook.test.js
node -e "const {createGatewayProjectionControlledSmokeReleaseRunbook}=require('./api-tests/bruno/aicodex-admin/scripts/gatewayProjectionControlledSmokeReleaseRunbook'); console.log(createGatewayProjectionControlledSmokeReleaseRunbook({releaseDecisionAlias:'ready-for-controlled-smoke',controlledSmokePreflightAlias:'ready-for-controlled-smoke-prep',releaseDecisionHandoff:{status:'ready',release:'release_after_report',decision:'ready-for-controlled-smoke',aliases:[]},controlledSmokePreflightHandoff:{status:'ready',release:'release_after_report',decision:'ready-for-controlled-smoke-prep',aliases:[]},evidenceSummary:{sourceAlias:'local-dry-run',evidenceHints:[{sourceAlias:'admin-release',status:'ready',decision:'ready-for-controlled-smoke',alias:'ready_for_controlled_smoke',owner:'admin_operator'}]}},{sourceAlias:'local-dry-run'}))"
```

Controlled smoke release runbook 只能写 `status`、`reason`、alias、owner、最小解除条件、red-line flag、`doNotDispatchUntil` 和环境别名；不得写真实地址、token、Cookie、账号、手机号、邮箱、完整 organizationId、完整组织树、完整 gateway/API response、完整 readiness candidates、完整 source metadata、真实 fixture 或真实 DB 内容。`status=ready` 不是 controlled smoke 已通过，不能外推为 API/Gateway/Insight 成功。

### Gateway projection controlled smoke evidence readiness

`50-Gateway Projection 观测/Controlled Smoke Evidence Readiness.yml` 是进入受控 smoke evidence review 前的本地只读前置校验。它只消费私有变量里的脱敏 evidence bundle，pre-request 生成 readiness 结果后会主动中止网络请求，避免误连真实环境。

需要协调层或 operator 先提供这些脱敏变量：

```text
gatewayProjectionAdminReleaseDecisionHandoff={"status":"ready","release":"release_after_report","decision":"ready-for-controlled-smoke","aliases":[]}
gatewayProjectionControlledSmokePreflightHandoff={"status":"ready","release":"release_after_report","decision":"ready-for-controlled-smoke-prep","aliases":[]}
gatewayProjectionControlledSmokeReleaseRunbook={"status":"ready","release":"release_after_report","reason":"controlled_smoke_release_runbook_ready","missingPrerequisites":[],"hardRedLineFlags":[]}
gatewayProjectionApiDiagnosticsEvidence={"status":"ready","decision":"api-diagnostics-clear","aliases":[]}
gatewayProjectionControlledSmokeEvidenceRedactionSignal=sanitized
gatewayProjectionControlledSmokeEvidenceReadinessSourceAlias=local-dry-run
```

稳定 readiness 状态：

- `ready-for-controlled-smoke-evidence-review`：只允许进入受控 smoke evidence review，`release=release_after_report` 不能外推为真实 smoke 通过。
- `missing-admin-preflight`：Admin release decision、controlled smoke preflight 或 release runbook 缺失、阻断或仍有 blocking alias。
- `missing-api-diagnostics`：API diagnostics readiness/release runbook evidence 缺失、阻断、失败、过期、拒绝或未知；由 API diagnostics owner 提供脱敏证据。
- `redaction-required`：输入含 token、Cookie、私有 endpoint、真实账号、手机号、邮箱、完整 organizationId、完整组织树、完整响应体或 full diagnostics response。
- `red-line-blocked`：输入含真实 publish、gateway ingestion、authorization facts、fixture/DB 写入、read model rebuild、mapping confirm 等真实环境写入信号。
- `overclaim-full-success`：输入把 Admin evidence readiness 写成 full-success、controlled smoke 已通过、生产就绪或 API/Gateway/Insight 成功。

如果值班要求 readiness 必须达到 evidence review 前置状态，再设置：

```text
gatewayProjectionRequireControlledSmokeEvidenceReadinessReady=true
```

本地无密 dry-run：

```powershell
node --test api-tests/bruno/aicodex-admin/scripts/gatewayProjectionControlledSmokeEvidenceReadiness.test.js
node -e "const {createGatewayProjectionControlledSmokeEvidenceReadiness}=require('./api-tests/bruno/aicodex-admin/scripts/gatewayProjectionControlledSmokeEvidenceReadiness'); console.log(createGatewayProjectionControlledSmokeEvidenceReadiness({adminReleaseDecision:{status:'ready',release:'release_after_report',decision:'ready-for-controlled-smoke',aliases:[]},controlledSmokePreflight:{status:'ready',release:'release_after_report',decision:'ready-for-controlled-smoke-prep',aliases:[]},controlledSmokeReleaseRunbook:{status:'ready',release:'release_after_report',reason:'controlled_smoke_release_runbook_ready',missingPrerequisites:[],hardRedLineFlags:[]},apiDiagnostics:{status:'ready',decision:'api-diagnostics-clear',aliases:[]},redactionSignal:'sanitized'},{sourceAlias:'local-dry-run'}))"
```

Controlled smoke evidence readiness 只能写 `status`、`reason`、alias、owner、最小解除条件、redaction/red-line flag、`doNotDispatchUntil` 和环境别名；不得写真实地址、token、Cookie、账号、手机号、邮箱、完整 organizationId、完整组织树、完整 gateway/API response、完整 diagnostics response、完整 readiness candidates、真实 fixture 或真实 DB 内容。`status=ready-for-controlled-smoke-evidence-review` 不是 controlled smoke 已通过，不能外推为 API/Gateway/Insight 成功、生产就绪或 full-success。

### Gateway projection operator remediation handoff

`50-Gateway Projection 观测/Operator Remediation Handoff.yml` 是 Admin operator 本地排障交接入口。它只消费私有变量里的脱敏 readiness、release decision、controlled smoke preflight/runbook/evidence readiness 和 blocking alias，pre-request 生成 handoff 后主动中止网络请求，避免误连真实环境。

可选输入变量：

```text
gatewayProjectionReadinessSummary={"status":"blocked","aliases":["mapping_missing"],"mappingReadiness":{"counts":{"mapping_missing":1}}}
gatewayProjectionReleaseDecisionHandoff={"status":"blocked","release":"hold","decision":"blocked-by-mapping-readiness","aliases":["mapping_missing"]}
gatewayProjectionControlledSmokePreflightHandoff={"status":"blocked","release":"hold","decision":"blocked-by-mapping-readiness","aliases":["mapping_missing"]}
gatewayProjectionControlledSmokeReleaseRunbook={"status":"blocked","release":"hold","missingPrerequisites":["controlled_smoke_preflight_missing"],"hardRedLineFlags":[]}
gatewayProjectionControlledSmokeEvidenceReadiness={"status":"missing-admin-preflight","missingPrerequisites":["controlled_smoke_preflight_missing"],"redactionFlags":[],"hardRedLineFlags":[]}
gatewayProjectionOperatorRemediationBlockingAliases=["mapping_missing","controlled_smoke_preflight_missing"]
gatewayProjectionOperatorRemediationSourceAlias=local-dry-run
```

稳定 remediation 分类与 owner：

- `mapping_missing`、`mapping_untrusted`、`lifecycle_not_publishable`：`mapping-readiness`，owner 为 `admin_mapping_operator`。
- `source_metadata_unavailable`、`lineage_freshness_unavailable`、`source_connection_stale`：Admin source/freshness 排障，owner 为 `admin_source_owner`。
- `publisher_disabled`、`refresh_disabled`、`gateway_contract_mismatch`：Admin deploy/runtime/contract 排障，owner 为 `admin_deploy_owner`、`admin_runtime_owner` 或 `admin_contract_owner`。
- `no_publishable_subjects`、`active_fixture_missing`、`tombstone_fixture_missing`：受控 fixture 前置条件，owner 为 `fixture_owner`。
- `api_diagnostics_missing`：只要求 API diagnostics owner 提供脱敏 evidence；Admin 不查询 API/Insight/Gateway 私有库。
- `controlled_smoke_preflight_missing`、`controlled_smoke_release_runbook_prerequisite_missing`、`controlled_smoke_evidence_not_checked`：只补齐 Admin 只读 evidence，owner 为 `admin_operator`。
- `sanitization_failed`、`real_environment_write_signal`、`full_success_overclaim`：停止外派，先删除敏感值、真实写入信号或 full-success 外推。
- 未知 alias 会落到 `unknown-admin-remediation`，owner 为 `admin_operator`，必须回到 Admin projection readiness/runbook 收集稳定 alias。

如果值班要求 operator handoff 必须 ready，再设置：

```text
gatewayProjectionRequireOperatorRemediationReady=true
```

本地无密 dry-run：

```powershell
node --test api-tests/bruno/aicodex-admin/scripts/gatewayProjectionOperatorRemediationHandoff.test.js
node -e "const {createGatewayProjectionOperatorRemediationHandoff}=require('./api-tests/bruno/aicodex-admin/scripts/gatewayProjectionOperatorRemediationHandoff'); console.log(createGatewayProjectionOperatorRemediationHandoff({readinessSummary:{status:'blocked',aliases:['mapping_missing'],mappingReadiness:{counts:{mapping_missing:1}}},blockingAliases:['controlled_smoke_preflight_missing']},{sourceAlias:'local-dry-run'}))"
```

Operator remediation handoff 只能写 `status`、`release`、`reason`、counts、alias、owner、动作清单、最小解除条件、`doNotDispatchUntil` 和环境别名；不得写真实地址、token、Cookie、账号、手机号、邮箱、完整 organizationId、完整组织树、完整 gateway/API response、完整 diagnostics response、完整 readiness candidates、真实 fixture 或真实 DB 内容。`status=ready-for-operator-handoff` 只表示 Admin operator handoff 可交接，不能外推为 projection full-success、controlled smoke 已通过、生产就绪、API/Gateway/Insight 成功、gateway ingestion 成功或 authorization facts 生效。

### Gateway projection remediation result evidence handoff

`50-Gateway Projection 观测/Remediation Result Evidence Handoff.yml` 是 operator 完成 remediation 后交回 Admin owner 的本地只读结果证据入口。它只消费脱敏 alias、status 和 counts 摘要，pre-request 生成 handoff 后主动中止网络请求，避免误连真实环境。

可选输入变量：

```text
gatewayProjectionMappingRemediationResult={"status":"cleared","aliases":["mapping_remediation_cleared","mapping_confirmed_api_user_id","mapping_status_trusted","lifecycle_readiness_confirmed"]}
gatewayProjectionSourceFreshnessRemediationResult={"status":"cleared","aliases":["source_freshness_remediation_cleared","source_snapshot_fresh","org_sync_batch_fresh"]}
gatewayProjectionDeployRuntimeResult={"status":"confirmed","aliases":["deploy_runtime_shape_confirmed","current_observability_shape_confirmed"]}
gatewayProjectionFixtureAuthorizationResult={"status":"authorized","aliases":["fixture_authorized","subject_count_ge_1_authorized"],"counts":{"subjectCount":1}}
gatewayProjectionControlledSmokeEvidenceResult={"status":"cleared","aliases":["controlled_smoke_evidence_prerequisites_clear","api_diagnostics_clear"]}
gatewayProjectionRemediationResultSourceAlias=local-dry-run
```

稳定结果口径：

- `ready-for-controlled-smoke-evidence-review`：只允许进入下一轮 controlled smoke evidence review 或 preflight。
- `mapping_remediation_not_cleared` / `mapping_user_authorization_required`：找 `admin_mapping_operator`，补齐一等 `PlatformApiUserMapping.ApiUserId`、可信 mapping status 和 lifecycle readiness。
- `source_freshness_remediation_not_cleared`：找 `admin_source_owner`，补齐 Admin-owned source snapshot、`OrgSyncBatch` 或 sourceVersion/freshness 证据。
- `deploy_runtime_shape_not_confirmed`：找 `admin_deploy_owner`，只读确认当前 runtime/observability shape。
- `fixture_authorization_required`：找 `fixture_owner`，必须具备已授权 controlled fixture 或 `subjectCount>=1` 脱敏证据。
- `controlled_smoke_evidence_not_cleared` / `api_diagnostics_missing`：分别回到 Admin operator 或 API diagnostics owner 补齐脱敏 evidence。
- `sanitization_failed`、`real_environment_write_signal`、`full_success_overclaim`：停止外派，先删除敏感值、真实写入信号或 full-success 外推。
- 未知 result alias 会保持 blocked，必须替换为稳定 Admin owner result alias。

如果值班要求 result evidence 必须 ready，再设置：

```text
gatewayProjectionRequireRemediationResultReady=true
```

本地无密 dry-run：

```powershell
node --test api-tests/bruno/aicodex-admin/scripts/gatewayProjectionRemediationResultEvidenceHandoff.test.js
node -e "const {createGatewayProjectionRemediationResultEvidenceHandoff}=require('./api-tests/bruno/aicodex-admin/scripts/gatewayProjectionRemediationResultEvidenceHandoff'); console.log(createGatewayProjectionRemediationResultEvidenceHandoff({mappingRemediationResult:{status:'cleared',aliases:['mapping_remediation_cleared','mapping_confirmed_api_user_id','mapping_status_trusted','lifecycle_readiness_confirmed']},sourceFreshnessRemediationResult:{status:'cleared',aliases:['source_freshness_remediation_cleared','source_snapshot_fresh']},deployRuntimeResult:{status:'confirmed',aliases:['deploy_runtime_shape_confirmed']},fixtureAuthorizationResult:{status:'authorized',aliases:['fixture_authorized','subject_count_ge_1_authorized'],counts:{subjectCount:1}},controlledSmokeEvidenceResult:{status:'cleared',aliases:['controlled_smoke_evidence_prerequisites_clear','api_diagnostics_clear']}},{sourceAlias:'local-dry-run'}))"
```

Remediation result evidence handoff 只能写 `status`、`reason`、`evidenceAliases`、`ownerHandoffs`、`minimumUnblockConditions`、`nextSafeAction`、`doNotDispatchUntil`、`nonExtrapolation` 和环境别名；不得写真实地址、token、Cookie、账号、手机号、邮箱、完整 organizationId、完整组织树、完整 gateway/API response、完整 diagnostics response、完整 readiness candidates、真实 fixture 或真实 DB 内容。`status=ready-for-controlled-smoke-evidence-review` 只表示 Admin remediation result evidence 可进入下一轮 review/preflight，不能外推为真实 publish、Gateway ingestion、authorization facts 生效、API/Insight/Gateway 成功、生产就绪或 full-success。

### Gateway projection controlled smoke execution handoff

`50-Gateway Projection 观测/Controlled Smoke Execution Handoff.yml` 是受控 smoke 执行前的本地只读交接入口。它只消费 preflight、evidence readiness、release runbook、operator remediation handoff 和 remediation result evidence handoff 的脱敏摘要，pre-request 生成 handoff 后主动中止网络请求，避免误连真实环境。

可选输入变量：

```text
gatewayProjectionControlledSmokePreflightHandoff={"status":"ready","release":"release_after_report","decision":"ready-for-controlled-smoke-prep","aliases":["ready_for_controlled_smoke_prep"]}
gatewayProjectionControlledSmokeEvidenceReadiness={"status":"ready-for-controlled-smoke-evidence-review","release":"release_after_report","reason":"controlled_smoke_evidence_ready_for_review","missingPrerequisites":[],"hardRedLineFlags":[]}
gatewayProjectionControlledSmokeReleaseRunbook={"status":"ready","release":"release_after_report","reason":"controlled_smoke_release_runbook_ready","missingPrerequisites":[],"hardRedLineFlags":[]}
gatewayProjectionOperatorRemediationHandoff={"status":"ready-for-operator-handoff","release":"release_after_report","reason":"operator_remediation_handoff_ready","ownerHandoffs":[]}
gatewayProjectionRemediationResultEvidenceHandoff={"status":"ready-for-controlled-smoke-evidence-review","reason":"remediation_result_evidence_ready","evidenceAliases":["mapping_remediation_cleared","source_freshness_remediation_cleared","deploy_runtime_shape_confirmed","fixture_authorized","subject_count_ge_1_authorized","controlled_smoke_evidence_prerequisites_clear","api_diagnostics_clear"]}
gatewayProjectionControlledSmokeExecutionRedactionSignal=sanitized
gatewayProjectionControlledSmokeExecutionScope=local-readonly-controlled-smoke-execution-handoff
gatewayProjectionControlledSmokeExecutionSourceAlias=local-dry-run
```

稳定执行前交接口径：

- `ready-for-controlled-smoke-execution`：只允许进入 controlled smoke execution preparation，不表示 smoke 已通过。
- `controlled_smoke_execution_prerequisite_missing`：缺 preflight、evidence readiness、release runbook、operator remediation 或 remediation result evidence summary。
- `sanitization_failed`：输入包含 token、Cookie、私有 endpoint、真实账号、手机号、邮箱、完整 organizationId、完整组织树、完整响应体或 credential-like data。
- `real_fixture_signal`、`real_db_write_signal`、`production_like_signal`、`real_gate_signal`、`real_environment_write_signal`：输入含真实 fixture、DB 写入、生产/类生产、真实 gate、publish、gateway ingestion、authorization facts、read model rebuild 或 mapping confirm 信号。
- `full_success_overclaim`：输入把 Gateway allow、API authorization report full-success、Insight success、production readiness、controlled smoke pass 或 full-success 当作已证明。
- `unknown_controlled_smoke_execution_alias`：未知脱敏 alias 必须替换为稳定 Admin owner handoff alias 后重跑。

如果值班要求 execution handoff 必须 ready，再设置：

```text
gatewayProjectionRequireControlledSmokeExecutionReady=true
```

本地无密 dry-run：

```powershell
node --test api-tests/bruno/aicodex-admin/scripts/gatewayProjectionControlledSmokeExecutionHandoff.test.js
node -e "const {createGatewayProjectionControlledSmokeExecutionHandoff}=require('./api-tests/bruno/aicodex-admin/scripts/gatewayProjectionControlledSmokeExecutionHandoff'); console.log(createGatewayProjectionControlledSmokeExecutionHandoff({preflightSummary:{status:'ready',release:'release_after_report',decision:'ready-for-controlled-smoke-prep',aliases:['ready_for_controlled_smoke_prep']},evidenceReadinessSummary:{status:'ready-for-controlled-smoke-evidence-review',release:'release_after_report',reason:'controlled_smoke_evidence_ready_for_review',missingPrerequisites:[],hardRedLineFlags:[]},releaseRunbookSummary:{status:'ready',release:'release_after_report',reason:'controlled_smoke_release_runbook_ready',missingPrerequisites:[],hardRedLineFlags:[]},operatorRemediationHandoffSummary:{status:'ready-for-operator-handoff',release:'release_after_report',reason:'operator_remediation_handoff_ready',ownerHandoffs:[]},remediationResultEvidenceHandoffSummary:{status:'ready-for-controlled-smoke-evidence-review',reason:'remediation_result_evidence_ready',evidenceAliases:['mapping_remediation_cleared','source_freshness_remediation_cleared','deploy_runtime_shape_confirmed','fixture_authorized','subject_count_ge_1_authorized','controlled_smoke_evidence_prerequisites_clear','api_diagnostics_clear']},redactionSignal:'sanitized',executionScope:'local-readonly-controlled-smoke-execution-handoff'},{sourceAlias:'local-dry-run'}))"
```

Controlled smoke execution handoff 只能写 `status`、`blockerAlias`、`remediationAlias`、`missingPrerequisites`、`operatorActions`、`ownerHandoffLimits`、`redLineFlags`、`cannotInferBoundaries`、`evidencePackageMetadata`、`doNotDispatchUntil` 和环境别名；不得写真实地址、token、Cookie、账号、手机号、邮箱、完整 organizationId、完整组织树、完整 gateway/API response、完整 diagnostics response、完整 readiness candidates、真实 fixture 或真实 DB 内容。`status=ready-for-controlled-smoke-execution` 只表示 Admin 本地脱敏执行前交接包可交给 operator 进入执行准备，不能外推为真实 publish、Gateway ingestion、authorization facts 生效、API/Insight/Gateway 成功、生产就绪、controlled smoke 已通过或 full-success。

### Gateway projection controlled smoke result evidence handoff

`50-Gateway Projection 观测/Controlled Smoke Result Evidence Handoff.yml` 是受控 smoke 执行结果材料的本地只读 evidence handoff。它只消费 controlled smoke execution handoff、脱敏结果状态、结果 alias、计数摘要、redaction/risk 分类和 operator next action，pre-request 生成 handoff 后主动中止网络请求，避免误连真实环境。

本入口用于回答“这份执行结果材料是否可交接给后续操作者复核”，不是运行 controlled smoke。它不会触发真实 publish、Gateway ingestion、endpoint/provider token、fixture/DB 写入、真实 controlled smoke、gate 或 authorization fact 变更。

常用私有变量：

- `gatewayProjectionControlledSmokeExecutionHandoff`：上一阶段 `Controlled Smoke Execution Handoff` 的脱敏 JSON 输出。
- `gatewayProjectionControlledSmokeResultStatus`：脱敏结果状态，允许 `passed`、`passed-with-observations` 或 `ready-for-handoff` 进入交接；`failed`、`partial`、`blocked`、`missing` 或未知状态会 fail closed。
- `gatewayProjectionControlledSmokeResultAliases`：脱敏稳定 alias，例如 `controlled_smoke_result_ready_for_handoff`。
- `gatewayProjectionControlledSmokeResultCounts`：脱敏计数摘要，例如 `{"expected":3,"observed":3,"passed":3,"failed":0,"partial":0,"blocked":0,"missing":0,"unauthorized":0}`。
- `gatewayProjectionControlledSmokeResultRedactionCategory`：redaction 分类，例如 `sanitized`。
- `gatewayProjectionControlledSmokeResultRiskCategory`：风险分类，例如 `low`。
- `gatewayProjectionControlledSmokeResultOperatorNextAction`：后续操作者动作，只写脱敏复核或交接动作。
- `gatewayProjectionControlledSmokeResultOperatorMetadata`：可选的脱敏 operator metadata；不得包含 token、Cookie、私有 URL、真实账号、手机号、邮箱、完整组织树、完整响应体、`configRef` 或 `secretRef`。
- `gatewayProjectionControlledSmokeResultOperatorNote`：可选备注；不得写 Gateway allow、API authorization report full-success、Insight success、production readiness、real publish success、Gateway ingestion success、authorization facts success、controlled smoke pass 或 full-success 外推。
- `gatewayProjectionRequireControlledSmokeResultReady=true`：值班要求 result evidence handoff 必须 ready 时启用；否则只输出本地结果并中止请求。

典型输出：

- `ready-for-result-evidence-handoff`：只表示 Admin owner 本地脱敏 controlled smoke 执行结果材料可交接给后续操作者复核。
- `controlled_smoke_result_evidence_missing`：缺 execution handoff、result status、result alias、counts、redactionCategory 或 riskCategory。
- `controlled_smoke_result_not_handoff_ready`：结果状态不是可交接状态。
- `controlled_smoke_result_count_alias_mismatch`：ready alias 与 failed/partial/blocked/missing/unauthorized 等计数不一致。
- `unknown_controlled_smoke_result_alias`：输入包含未定义的结果 alias。
- `sanitization_failed`：输入包含疑似敏感字段或真实标识。
- `full_success_overclaim`：输入把本地结果 evidence 写成 API/Gateway/Insight、production readiness、controlled smoke pass 或 full-success。

Controlled smoke result evidence handoff 只能写 `status`、`blockerAlias`、`remediationAlias`、`resultAliases`、`resultCounts`、`redactionCategory`、`riskCategory`、`operatorActions`、`ownerHandoffLimits`、`redLineFlags`、`missingPrerequisites`、`cannotInferBoundaries`、`doNotDispatchUntil` 和环境别名；不得写真实地址、token、Cookie、账号、手机号、邮箱、完整 organizationId、完整组织树、完整 gateway/API response、完整 diagnostics response、完整 readiness candidates、真实 fixture 或真实 DB 内容。`status=ready-for-result-evidence-handoff` 只表示 Admin 本地脱敏执行结果材料可交接，不能外推为真实 publish、Gateway ingestion、authorization facts 生效、API/Insight/Gateway 成功、生产就绪、controlled smoke 已通过、controlled smoke pass 或 full-success。

### Gateway projection controlled smoke release summary handoff

`50-Gateway Projection 观测/Controlled Smoke Release Summary Handoff.yml` 是受控 smoke 结果材料之后的本地只读 release summary 交接入口。它只消费 `Controlled Smoke Result Evidence Handoff` 的脱敏 JSON 输出、release summary 状态、稳定 alias、计数摘要、redaction/risk 分类和 operator next action，pre-request 生成 handoff 后主动中止网络请求，避免误连真实环境。

本入口用于把操作者提供的脱敏 controlled-smoke result/evidence summary 分类为可交接的 release summary、blocked、needs-user-action 或 hard-red-line。它不会运行真实 controlled smoke，不触发真实 publish、Gateway ingestion、endpoint/provider token、fixture/DB 写入、gate、mapping confirm 或 authorization fact 变更。

常用私有变量：

- `gatewayProjectionControlledSmokeResultEvidenceHandoff`：上一阶段 `Controlled Smoke Result Evidence Handoff` 的脱敏 JSON 输出。
- `gatewayProjectionControlledSmokeReleaseSummaryStatus`：脱敏 release summary 状态；`ready-for-handoff`、`summary-ready` 或 `release-summary-ready` 可进入交接，`needs-user-action` 会保留为用户动作分支。
- `gatewayProjectionControlledSmokeReleaseSummaryAliases`：脱敏稳定 alias，例如 `controlled_smoke_release_summary_ready` 或 `controlled_smoke_release_summary_needs_user_action`。
- `gatewayProjectionControlledSmokeReleaseSummaryCounts`：脱敏计数摘要，例如 `{"sectionsExpected":4,"sectionsObserved":4,"blockedItems":0,"needsUserActionItems":0,"hardRedLineItems":0}`。
- `gatewayProjectionControlledSmokeReleaseSummaryRedactionCategory`：redaction 分类，例如 `sanitized`。
- `gatewayProjectionControlledSmokeReleaseSummaryRiskCategory`：风险分类，例如 `low`。
- `gatewayProjectionControlledSmokeReleaseSummaryOperatorNextAction`：后续操作者动作，只写脱敏复核、交接或用户动作。
- `gatewayProjectionControlledSmokeReleaseSummaryOperatorMetadata`：可选的脱敏 operator metadata；不得包含 token、Cookie、私有 URL、真实账号、手机号、邮箱、完整组织树、完整响应体、`configRef` 或 `secretRef`。
- `gatewayProjectionControlledSmokeReleaseSummaryOperatorNote`：可选备注；不得写 Gateway allow、API authorization report full-success、Insight success、production readiness、real publish success、Gateway ingestion success、authorization facts success、controlled smoke pass 或 full-success 外推。
- `gatewayProjectionRequireControlledSmokeReleaseSummaryReady=true`：值班要求 release summary handoff 必须 ready 时启用；否则只输出本地分类并中止请求。

典型输出：

- `ready-for-release-summary-handoff`：只表示 Admin owner 本地脱敏 release summary 可交接给后续 operator 复核。
- `blocked`：缺 result evidence handoff、release summary status/alias/counts、redaction/risk 分类，或者 alias/counts 不一致、未知 alias、脱敏失败。
- `needs-user-action`：operator 还需要补齐 approval/action alias 或其他脱敏用户动作，输出会保留稳定 blocker alias 和最小解除条件。
- `hard-red-line`：输入包含真实 publish、Gateway ingestion、authorization facts、fixture/DB、production-like endpoint、真实 gate、controlled smoke pass 或 full-success 外推。

本地无密 dry-run：

```powershell
node --test api-tests/bruno/aicodex-admin/scripts/gatewayProjectionControlledSmokeReleaseSummaryHandoff.test.js
node -e "const {createGatewayProjectionControlledSmokeReleaseSummaryHandoff}=require('./api-tests/bruno/aicodex-admin/scripts/gatewayProjectionControlledSmokeReleaseSummaryHandoff'); console.log(createGatewayProjectionControlledSmokeReleaseSummaryHandoff({resultEvidenceHandoffSummary:{status:'ready-for-result-evidence-handoff',release:'release_after_report',resultAliases:['controlled_smoke_result_ready_for_handoff'],resultCounts:{expected:3,observed:3,passed:3,failed:0,partial:0,blocked:0,missing:0,unauthorized:0},redactionCategory:'sanitized',riskCategory:'low'},releaseSummaryStatus:'ready-for-handoff',releaseSummaryAliases:['controlled_smoke_release_summary_ready'],releaseSummaryCounts:{sectionsExpected:4,sectionsObserved:4,blockedItems:0,needsUserActionItems:0,hardRedLineItems:0},redactionCategory:'sanitized',riskCategory:'low'},{sourceAlias:'local-dry-run'}))"
```

Controlled smoke release summary handoff 只能写 `status`、`classification`、`blockerAlias`、`remediationAlias`、`releaseSummaryAliases`、`releaseSummaryCounts`、`redactionCategory`、`riskCategory`、`operatorActions`、`ownerHandoffLimits`、`minimumUnblockConditions`、`redLineFlags`、`missingPrerequisites`、`cannotInferBoundaries`、`doNotDispatchUntil` 和环境别名；不得写真实地址、token、Cookie、账号、手机号、邮箱、完整 organizationId、完整组织树、完整 gateway/API response、完整 diagnostics response、完整 readiness candidates、真实 fixture 或真实 DB 内容。`status=ready-for-release-summary-handoff` 只表示 Admin 本地脱敏 release summary 可交接，不能外推为真实 publish、Gateway ingestion、authorization facts 生效、API/Insight/Gateway 成功、生产就绪、controlled smoke pass 或 full-success。

### Gateway projection controlled smoke operator triage handoff

`50-Gateway Projection 观测/Controlled Smoke Operator Triage Handoff.yml` 是 release summary 之后的本地只读 operator triage package 入口。它只消费 `Controlled Smoke Release Summary Handoff` 和 `Controlled Smoke Result Evidence Handoff` 的脱敏 JSON 输出，pre-request 生成 triage package 后主动中止网络请求，避免误连真实环境。

本入口用于把 release summary/result evidence 转换成 operator 可复制的下一步、稳定 blocker alias、最小解除条件和不能外推边界。它不会运行真实 controlled smoke，不触发真实 publish、Gateway ingestion、endpoint/provider token、fixture/DB 写入、mapping confirm、gate 或 authorization fact 变更。

常用私有变量：

- `gatewayProjectionControlledSmokeReleaseSummaryHandoff`：上一阶段 `Controlled Smoke Release Summary Handoff` 的脱敏 JSON 输出。
- `gatewayProjectionControlledSmokeResultEvidenceHandoff`：上一阶段 `Controlled Smoke Result Evidence Handoff` 的脱敏 JSON 输出。
- `gatewayProjectionControlledSmokeOperatorTriageMetadata`：可选脱敏值班 metadata；不得包含 token、Cookie、私有 URL、真实账号、手机号、邮箱、完整组织树、完整响应体、`configRef` 或 `secretRef`。
- `gatewayProjectionControlledSmokeOperatorTriageNote`：可选备注；不得写 Gateway allow、API authorization report full-success、Insight success、production readiness、real publish success、Gateway ingestion success、authorization facts success、controlled smoke pass 或 full-success 外推。
- `gatewayProjectionRequireControlledSmokeOperatorTriageReady=true`：值班要求 triage package 必须 ready 时启用；否则只输出本地分类并中止请求。

典型输出：

- `ready-for-operator-triage-handoff`：只表示 Admin owner 本地脱敏 operator triage package 可交接给后续 operator 复核。
- `blocked`：缺 release summary/result evidence handoff，或者上游 release summary 已 blocked、未知 alias、脱敏失败。
- `needs-user-action`：operator 还需要补齐 approval/action alias 或其他脱敏用户动作，输出会保留稳定 blocker alias 和最小解除条件。
- `hard-red-line`：输入包含真实 publish、真实 controlled smoke、Gateway ingestion、authorization facts、fixture/DB、production-like endpoint、真实 gate、controlled smoke pass 或 full-success 外推。

本地无密 dry-run：

```powershell
node --test api-tests/bruno/aicodex-admin/scripts/gatewayProjectionControlledSmokeOperatorTriageHandoff.test.js
node -e "const {createGatewayProjectionControlledSmokeOperatorTriageHandoff}=require('./api-tests/bruno/aicodex-admin/scripts/gatewayProjectionControlledSmokeOperatorTriageHandoff'); console.log(createGatewayProjectionControlledSmokeOperatorTriageHandoff({releaseSummaryHandoffSummary:{status:'ready-for-release-summary-handoff',release:'release_after_report',classification:'release-summary',releaseSummaryAliases:['controlled_smoke_release_summary_ready'],releaseSummaryCounts:{sectionsExpected:4,sectionsObserved:4,blockedItems:0,needsUserActionItems:0,hardRedLineItems:0},redactionCategory:'sanitized',riskCategory:'low'},resultEvidenceHandoffSummary:{status:'ready-for-result-evidence-handoff',release:'release_after_report',resultAliases:['controlled_smoke_result_ready_for_handoff'],resultCounts:{expected:3,observed:3,passed:3,failed:0,partial:0,blocked:0,missing:0,unauthorized:0},redactionCategory:'sanitized',riskCategory:'low'}},{sourceAlias:'local-dry-run'}))"
```

Controlled smoke operator triage handoff 只能写 `status`、`blockerAlias`、`remediationAlias`、`releaseSummaryAliases`、`resultAliases`、`releaseSummaryCounts`、`resultCounts`、`redactionCategory`、`riskCategory`、`nextSteps`、`ownerHandoffLimits`、`minimumUnblockConditions`、`redLineFlags`、`missingPrerequisites`、`cannotInferBoundaries`、`triagePackageMetadata`、`doNotDispatchUntil` 和环境别名；不得写真实地址、token、Cookie、账号、手机号、邮箱、完整 organizationId、完整组织树、完整 gateway/API response、完整 diagnostics response、完整 readiness candidates、真实 fixture 或真实 DB 内容。`status=ready-for-operator-triage-handoff` 只表示 Admin 本地脱敏 triage package 可交接，不能外推为真实 publish、真实 controlled smoke、Gateway ingestion、authorization facts 生效、API/Insight/Gateway 成功、生产就绪、controlled smoke pass 或 full-success。

### Gateway projection controlled smoke operator decision handoff

`50-Gateway Projection 观测/Controlled Smoke Operator Decision Handoff.yml` 是 operator triage 之后的本地只读决策包入口。它只消费 `Controlled Smoke Operator Triage Handoff`、`Controlled Smoke Result Evidence Handoff`、`Controlled Smoke Execution Handoff` 和 `Controlled Smoke Release Summary Handoff` 的脱敏 JSON 输出，pre-request 生成 compact decision package 后主动中止网络请求，避免误连真实环境。

本入口用于帮助 operator 判断下一步 Admin-side action：交接脱敏 decision package、清除 blocker 后重跑、补齐用户动作，或因硬红线停止派发。它不会运行真实 controlled smoke，不触发真实 publish、Gateway ingestion、endpoint/provider token、fixture/DB 写入、mapping confirm、gate 或 authorization fact 变更。

常用私有变量：

- `gatewayProjectionControlledSmokeOperatorTriageHandoff`：上一阶段 `Controlled Smoke Operator Triage Handoff` 的脱敏 JSON 输出。
- `gatewayProjectionControlledSmokeResultEvidenceHandoff`：上一阶段 `Controlled Smoke Result Evidence Handoff` 的脱敏 JSON 输出。
- `gatewayProjectionControlledSmokeExecutionHandoff`：上一阶段 `Controlled Smoke Execution Handoff` 的脱敏 JSON 输出。
- `gatewayProjectionControlledSmokeReleaseSummaryHandoff`：上一阶段 `Controlled Smoke Release Summary Handoff` 的脱敏 JSON 输出。
- `gatewayProjectionControlledSmokeOperatorDecisionMetadata`：可选脱敏值班 metadata；不得包含 token、Cookie、私有 URL、真实账号、手机号、邮箱、完整组织树、完整响应体、`configRef` 或 `secretRef`。
- `gatewayProjectionControlledSmokeOperatorDecisionNote`：可选备注；不得写真实 publish、Gateway ingestion、authorization facts、production readiness、controlled smoke pass 或 full-success 外推。
- `gatewayProjectionRequireControlledSmokeOperatorDecisionReady=true`：值班要求 decision package 必须 ready 时启用；否则只输出本地分类并中止请求。

典型输出：

- `ready-for-operator-decision-handoff`：只表示 Admin owner 本地脱敏 operator decision package 可交接给值班 operator 复核。
- `blocked`：缺 triage/result/execution/release-summary handoff、上游 handoff 未 ready、未知 alias 或脱敏失败。
- `needs-user-action`：operator 还需要补齐 approval/action alias 或其他脱敏用户动作，输出会保留稳定 blocker alias 和最小解除条件。
- `hard-red-line`：输入包含真实 publish、真实 controlled smoke、Gateway ingestion、authorization facts、fixture/DB、production-like endpoint、真实 gate、controlled smoke pass 或 full-success 外推。

本地无密 dry-run：

```powershell
node --test api-tests/bruno/aicodex-admin/scripts/gatewayProjectionControlledSmokeOperatorDecisionHandoff.test.js
node -e "const {createGatewayProjectionControlledSmokeOperatorDecisionHandoff}=require('./api-tests/bruno/aicodex-admin/scripts/gatewayProjectionControlledSmokeOperatorDecisionHandoff'); console.log(createGatewayProjectionControlledSmokeOperatorDecisionHandoff({operatorTriageHandoffSummary:{status:'ready-for-operator-triage-handoff',release:'release_after_report',blockerAlias:'none',remediationAlias:'operator_triage_package_ready'},resultEvidenceHandoffSummary:{status:'ready-for-result-evidence-handoff',release:'release_after_report',resultAliases:['controlled_smoke_result_ready_for_handoff'],resultCounts:{expected:3,observed:3,passed:3,failed:0,partial:0,blocked:0,missing:0,unauthorized:0},redactionCategory:'sanitized',riskCategory:'low'},executionHandoffSummary:{status:'ready-for-controlled-smoke-execution',release:'release_after_report',blockerAlias:'none',remediationAlias:'controlled_smoke_execution_prerequisites_clear'},releaseSummaryHandoffSummary:{status:'ready-for-release-summary-handoff',release:'release_after_report',classification:'release-summary',releaseSummaryAliases:['controlled_smoke_release_summary_ready'],releaseSummaryCounts:{sectionsExpected:4,sectionsObserved:4,blockedItems:0,needsUserActionItems:0,hardRedLineItems:0},redactionCategory:'sanitized',riskCategory:'low'}},{sourceAlias:'local-dry-run'}))"
```

Controlled smoke operator decision handoff 只能写 `status`、`release`、`nextAdminAction`、`blockerAlias`、`remediationAlias`、`releaseSummaryAliases`、`resultAliases`、`releaseSummaryCounts`、`resultCounts`、`redactionCategory`、`riskCategory`、`nextSteps`、`ownerHandoffLimits`、`minimumUnblockConditions`、`redLineFlags`、`missingPrerequisites`、`cannotInferBoundaries`、`decisionPackageMetadata`、`doNotDispatchUntil` 和环境别名；不得写真实地址、token、Cookie、账号、手机号、邮箱、完整 organizationId、完整组织树、完整 gateway/API response、完整 diagnostics response、完整 readiness candidates、真实 fixture 或真实 DB 内容。`status=ready-for-operator-decision-handoff` 只表示 Admin 本地脱敏 decision package 可交接，不能外推为真实 publish、真实 controlled smoke、Gateway ingestion、authorization facts 生效、API/Insight/Gateway 成功、生产就绪、controlled smoke pass 或 full-success。

### Gateway projection controlled smoke operator action handoff

`50-Gateway Projection 观测/Controlled Smoke Operator Action Handoff.yml` 是 operator decision 之后的本地只读 action package 入口。它只消费 `Controlled Smoke Operator Decision Handoff` 的脱敏 JSON 输出，pre-request 生成 owner-safe action package 后主动中止网络请求，避免误连真实环境。

本入口用于帮助 operator 从 decision package 得到可复制的 `actionStatus`、`nextAction`、`blockerAlias`、owner、最小解除条件、`doNotDispatchUntil` 和不能外推边界。它不会运行真实 controlled smoke，不触发真实 publish、Gateway ingestion、endpoint/provider token、fixture/DB 写入、mapping confirm、read model rebuild、gate 或 authorization fact 变更。

常用私有变量：

- `gatewayProjectionControlledSmokeOperatorDecisionHandoff`：上一阶段 `Controlled Smoke Operator Decision Handoff` 的脱敏 JSON 输出。
- `gatewayProjectionControlledSmokeOperatorActionMetadata`：可选脱敏值班 metadata；不得包含 token、Cookie、私有 URL、真实账号、手机号、邮箱、完整组织树、完整响应体、`configRef` 或 `secretRef`。
- `gatewayProjectionControlledSmokeOperatorActionNote`：可选备注；不得写真实 publish、真实 controlled smoke、Gateway ingestion、authorization facts、production readiness、controlled smoke pass 或 full-success 外推。
- `gatewayProjectionRequireControlledSmokeOperatorActionReady=true`：值班要求 action package 必须 ready 时启用；否则只输出本地分类并中止请求。

典型输出：

- `ready-for-operator-action`：只表示 Admin owner 本地脱敏 operator action package 可交接给值班 operator 执行下一步。
- `blocked`：缺 decision package、上游 decision 未 ready、未知 alias 或脱敏失败。
- `needs-user-action`：operator 还需要补齐 approval/action alias 或其他脱敏用户动作，输出会保留稳定 blocker alias 和最小解除条件。
- `hard-red-line`：输入包含真实 publish、真实 controlled smoke、Gateway ingestion、authorization facts、fixture/DB、production-like endpoint、真实 gate、read model rebuild、controlled smoke pass 或 full-success 外推。

本地无密 dry-run：

```powershell
node --test api-tests/bruno/aicodex-admin/scripts/gatewayProjectionControlledSmokeOperatorActionHandoff.test.js
node -e "const {createGatewayProjectionControlledSmokeOperatorActionHandoff}=require('./api-tests/bruno/aicodex-admin/scripts/gatewayProjectionControlledSmokeOperatorActionHandoff'); console.log(createGatewayProjectionControlledSmokeOperatorActionHandoff({operatorDecisionHandoffSummary:{status:'ready-for-operator-decision-handoff',release:'release_after_report',blockerAlias:'none',remediationAlias:'operator_decision_package_ready',ownerHandoffLimits:[{alias:'controlled_smoke_operator_decision_handoff',owner:'admin_operator',minimumUnblockCondition:'decision package 已 ready'}],releaseSummaryAliases:['controlled_smoke_release_summary_ready'],resultAliases:['controlled_smoke_result_ready_for_handoff'],redactionCategory:'sanitized',riskCategory:'low'}},{sourceAlias:'local-dry-run'}))"
```

Controlled smoke operator action handoff 只能写 `actionStatus`、`release`、`nextAction`、`blockerAlias`、`remediationAlias`、`decisionStatus`、`releaseSummaryAliases`、`resultAliases`、`releaseSummaryCounts`、`resultCounts`、`redactionCategory`、`riskCategory`、`nextSteps`、`ownerHandoffLimits`、`minimumUnblockConditions`、`redLineFlags`、`missingPrerequisites`、`cannotInferBoundaries`、`actionPackageMetadata`、`doNotDispatchUntil` 和环境别名；不得写真实地址、token、Cookie、账号、手机号、邮箱、完整 organizationId、完整组织树、完整 gateway/API response、完整 diagnostics response、完整 readiness candidates、真实 fixture 或真实 DB 内容。`actionStatus=ready-for-operator-action` 只表示 Admin 本地脱敏 action package 可交接，不能外推为真实 publish、真实 controlled smoke、Gateway ingestion、authorization facts 生效、API/Insight/Gateway 成功、生产就绪、controlled smoke pass 或 full-success。

### Gateway projection controlled smoke operator readiness handoff

`50-Gateway Projection 观测/Controlled Smoke Operator Readiness Handoff.yml` 是 operator action 之后的本地只读 readiness package 入口。它只消费 `Controlled Smoke Operator Action Handoff` 的脱敏 JSON 输出，pre-request 生成可交接 readiness package 后主动中止网络请求，避免误连真实环境。

本入口用于帮助协调层和值班 operator 判断 action package 是否满足本地交接条件，并复制 `readinessStatus`、`readyChecks`、`blockedAlias`、owner、最小解除条件、`evidenceReferences`、`doNotDispatchUntil` 和不能外推边界。它不会运行真实 controlled smoke，不触发真实 publish、Gateway ingestion、endpoint/provider token、fixture/DB 写入、mapping confirm、read model rebuild、gate 或 authorization fact 变更。

常用私有变量：

- `gatewayProjectionControlledSmokeOperatorActionHandoff`：上一阶段 `Controlled Smoke Operator Action Handoff` 的脱敏 JSON 输出。
- `gatewayProjectionControlledSmokeOperatorReadinessMetadata`：可选脱敏值班 metadata；不得包含 token、Cookie、私有 URL、真实账号、手机号、邮箱、完整组织树、完整响应体、`configRef` 或 `secretRef`。
- `gatewayProjectionControlledSmokeOperatorReadinessNote`：可选备注；不得写真实 publish、真实 controlled smoke、Gateway ingestion、authorization facts、mapping confirm、read model rebuild、production readiness、controlled smoke pass 或 full-success 外推。
- `gatewayProjectionRequireControlledSmokeOperatorReadinessReady=true`：值班要求 readiness package 必须 ready 时启用；否则只输出本地分类并中止请求。

典型输出：

- `ready-for-operator-readiness-handoff`：只表示 Admin owner 本地脱敏 operator readiness package 可交接。
- `blocked`：缺 action package、上游 action 未 ready、未知 alias 或脱敏失败。
- `needs-user-action`：operator 还需要补齐 approval/action alias 或其他脱敏用户动作，输出会保留稳定 blocker alias 和最小解除条件。
- `hard-red-line`：输入包含真实 publish、真实 controlled smoke、Gateway ingestion、authorization facts、fixture/DB、production-like endpoint、真实 gate、mapping confirm、read model rebuild、controlled smoke pass 或 full-success 外推。

本地无密 dry-run：

```powershell
node --test api-tests/bruno/aicodex-admin/scripts/gatewayProjectionControlledSmokeOperatorReadinessHandoff.test.js
node -e "const {createGatewayProjectionControlledSmokeOperatorReadinessHandoff}=require('./api-tests/bruno/aicodex-admin/scripts/gatewayProjectionControlledSmokeOperatorReadinessHandoff'); console.log(createGatewayProjectionControlledSmokeOperatorReadinessHandoff({operatorActionHandoffSummary:{actionStatus:'ready-for-operator-action',release:'release_after_report',blockerAlias:'none',remediationAlias:'operator_action_package_ready',ownerHandoffLimits:[{alias:'controlled_smoke_operator_action_handoff',owner:'admin_operator',minimumUnblockCondition:'action package 已 ready'}],actionPackageMetadata:{sourceAlias:'local-action',generatedAt:'2026-06-13T19:40:00.000Z',packageShape:'admin-gateway-projection-controlled-smoke-operator-action-handoff/v1'},redactionCategory:'sanitized',riskCategory:'low'}},{sourceAlias:'local-dry-run'}))"
```

Controlled smoke operator readiness handoff 只能写 `readinessStatus`、`release`、`nextAction`、`blockedAlias`、`remediationAlias`、`actionStatus`、`readyChecks`、`ownerSafeNextActions`、`ownerHandoffLimits`、`minimumUnblockConditions`、`evidenceReferences`、`redLineFlags`、`missingPrerequisites`、`cannotInfer`、`cannotInferBoundaries`、`readinessPackageMetadata`、`doNotDispatchUntil` 和环境别名；不得写真实地址、token、Cookie、账号、手机号、邮箱、完整 organizationId、完整组织树、完整 gateway/API response、完整 diagnostics response、完整 readiness candidates、真实 fixture 或真实 DB 内容。`readinessStatus=ready-for-operator-readiness-handoff` 只表示 Admin 本地脱敏 readiness package 可交接，不能外推为真实 publish、真实 controlled smoke、Gateway ingestion、authorization facts 生效、API/Insight/Gateway 成功、生产就绪、controlled smoke pass 或 full-success。

### Platform API mapping readiness

`/api/get-platform-api-user-mapping-readiness` 是 Admin-only 只读诊断接口，用于在写入 60 fixture 前判断当前组织是否具备可发布 subject 前置条件。它只读取 Admin 主模型和 `PlatformApiUserMapping`，不会创建、更新或确认 mapping，也不会写 gateway authorization facts。

建议排查顺序：

1. 在后台 Platform API 映射页选择目标测试组织，打开“用户映射”页签。
2. 查看“可发布主体 readiness”摘要：
   - `active_publishable` 大于 0：存在 active subject 的发布前置条件。
   - `tombstone_publishable` 大于 0：存在 tombstone subject 的发布前置条件。
   - `mapping_missing` 大于 0：说明缺少同 `organizationId + adminSubject` 的一等 `PlatformApiUserMapping.ApiUserId`。
   - `mapping_untrusted` 大于 0：说明 mappingStatus 或平台用户 mappingStatus 不可信。
   - `lineage_freshness_unavailable` 大于 0：说明 source version、batch 或 freshness 相关元数据不足。
3. 只把 readiness counts、category、status 和稳定 reason code 写入验证记录；不要记录真实账号、手机号、邮箱、完整组织结构、完整 organizationId 或完整响应体。
4. 如果需要把 `subjectCount>=1` 作为 60 smoke 通过条件，必须先取得用户授权，由 operator 准备受控测试主体和 confirmed mapping，再启用 subject count 断言。

`subjectCount=0 + mapping_missing` 只能说明 producer 可诊断但当前无可发布 subject fixture，不能记录为完整 projection 业务成功。

readiness 响应会返回 `remediationGuidance`。验证记录只写 `category`、`code`、counts 和脱敏 alias，不写完整响应体或完整 organizationId。常用处置口径：

- `mapping_missing` / `mapping_missing_requires_confirmed_api_user_mapping`：在 Admin 映射页定位同一 `organizationId + adminSubject`，由具备授权的 operator 维护一等 `PlatformApiUserMapping.ApiUserId` 并确认 mappingStatus。不得用 display name、手机号、邮箱、旧 lineage 或 `User.Properties.*apiUserId` 作为 runtime projection join key。
- `mapping_untrusted` / `mapping_untrusted_requires_confirmed_status`：检查 `PlatformUser.MappingStatus` 和 `PlatformApiUserMapping.MappingStatus`。active subject 必须全部为 `CONFIRMED`；非 active tombstone 只能使用 `CONFIRMED` 或 `DISABLED` mapping 中已有的确定 `ApiUserId`。
- `lifecycle_not_publishable` / `lifecycle_not_publishable_requires_supported_state`：等待或触发已授权的 Admin source 同步，让 lifecycle 收敛到 `ACTIVE` 或受支持的 tombstone 状态；不可把空 lifecycle、未知来源或展示字段推断成 active。
- `source_metadata_unavailable` / `source_metadata_unavailable_requires_admin_source_snapshot`：只检查 Admin-owned source connection、OrgSyncBatch 和平台主模型快照；不得查询 API/Insight/gateway store 或写 gateway authorization facts。
- `lineage_freshness_unavailable` / `lineage_freshness_unavailable_requires_org_version_and_batch`：检查 `PlatformUser.OrgVersion`、`LastSeenBatchId`、`OrgSyncBatch.OrgVersion` 和 freshness 元数据，修复或等待 Admin source 同步后重新读取 readiness。
- `active_publishable` / `tombstone_publishable`：只表示 Admin producer 具备对应 subject 前置条件。它不是 API/Insight 授权成功证明，也不能替代受控 smoke 的 subject count gate。

### Gateway projection manual publish console

`/api/gateway-projection/manual-publish` 是 Admin-only 受控手动 publish 入口，用于 operator 在 source readiness、mapping readiness 和 freshness 前置条件检查后触发一次 `BuildAndPublishOrganization` attempt。该入口会复用服务间 projection publisher 配置，返回脱敏 result envelope；它不会维护 mapping，不写 gateway resource authorization facts，不写权限矩阵，也不证明 API/Gateway/Insight 授权成功。

建议使用后台 Platform API 映射页的“用户映射”页签操作：

1. 先查看“可发布主体 readiness”，确认 `active_publishable` 或 `tombstone_publishable` 大于 0。
2. 确认 publisher 配置、source freshness、lineage 和 SourceConnection 状态不是 blocked。
3. 点击“Gateway projection 手动发布 / 手动发布”，只记录响应中的 `status`、`accepted`、`idempotent`、`retryable`、`projectionBatchId`、subject counts、`skippedByReason`、`failureCategory` 和 `durationMs`。
4. 若要在真实测试环境验证 `subjectCount>=1` 或 gateway ingestion 结果，必须由主控授权另派 fixture/smoke 任务；不要在本 runbook 中写真实 token、Cookie、私有 URL、账号、手机号、邮箱、完整 organizationId、完整组织树或完整响应体。

稳定失败分类示例：

- `publisher_disabled`：Admin producer 配置未启用；需要 Admin operator 确认是否允许打开 projection publisher。
- `projection_token_missing`：缺少服务间 endpoint/token；只能通过私有环境配置补齐，不得提交凭据。
- `source_connection_stale` / `source_connection_disabled`：回到 Admin source owner 修复 SourceConnection/freshness。
- `lineage_invalid`：缺少 sourceVersion、OrgSyncBatch 或等价 lineage 元数据。
- `no_publishable_subjects`：当前无可发布 active/tombstone subject；回到 mapping readiness 处理。
