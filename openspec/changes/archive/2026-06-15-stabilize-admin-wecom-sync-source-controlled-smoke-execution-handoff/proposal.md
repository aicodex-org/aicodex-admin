# Admin WeCom source controlled smoke execution handoff

## Why

WeCom source readiness、release decision、controlled smoke preflight、evidence handoff 和 operator remediation handoff 已能产出脱敏前置证据，但 operator 仍缺少一份真实 controlled smoke 前的执行交接摘要。没有该摘要时，后续 owner 容易把“可准备执行”误写成真实 WeCom 同步成功、组织树非空、Gateway/API/Insight 成功、authorization facts 生效、生产就绪或 full-success。

## What Changes

- 新增本地只读 `wecomSourceControlledSmokeExecutionHandoff` helper，消费脱敏 preflight/evidence/remediation summary。
- 输出稳定 `status`、`decision`、`reasonAlias`、引用摘要、blocker reasons、redaction checks、hard red-line flags、owner handoff、最小解除条件和不能外推边界。
- 新增 focused Node 测试，覆盖 ready、缺少前置、remediation blocker、脱敏失败、真实执行红线和 full-success overclaim。
- 新增 Bruno 只读入口和 WeCom 同步 README 指引，明确该入口只生成执行交接证据，不执行真实 smoke。
- 更新 `wecom-organization-sync` 规格，声明 controlled-smoke execution handoff 的 fail-closed 行为。

## Non-Goals

- 不执行真实 controlled smoke，不触发真实 WeCom 同步，不创建 sync run，不写真实 fixture 或 DB。
- 不查询 API、Insight、Gateway 数据，也不证明组织树非空、Gateway/API/Insight 成功、authorization facts 生效、生产就绪或 full-success。
- 不修改 Gateway Projection、API、Insight、真实 Gateway、真实 DB、真实 WeCom 凭据或生产/类生产配置。
- 不收集 token、Cookie、私有 URL、真实账号、完整组织树、完整响应体或敏感日志。

## Impact

- Admin owner 范围：Bruno collection、本地 Node helper、focused 测试、WeCom 同步 README、OpenSpec change 和 `wecom-organization-sync` 主规格。
- Operator 将获得稳定状态：`ready-for-controlled-smoke-execution-handoff`、`missing-controlled-smoke-preflight-summary`、`missing-controlled-smoke-evidence-handoff-summary`、`missing-operator-remediation-handoff-summary`、`blocked-prerequisite`、`redaction-required`、`hard-red-line-blocked`、`overclaim-full-success`。
