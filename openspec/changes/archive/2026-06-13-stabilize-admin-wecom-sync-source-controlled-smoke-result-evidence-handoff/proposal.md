# Admin WeCom source controlled smoke result evidence handoff

## Why

WeCom source readiness、release decision、controlled smoke preflight、evidence handoff、operator remediation handoff 和 execution handoff 已能产出脱敏前置证据，但真实 controlled smoke 之后仍缺少一份 Admin owner 内可交接的 result evidence handoff。没有该本地摘要时，operator 容易把局部结果、缺失 evidence、未部署或未授权状态误写成真实 WeCom 同步成功、组织树非空、Gateway/API/Insight 成功、authorization facts 生效、生产就绪或 full-success。

## What Changes

- 新增本地只读 `wecomSourceControlledSmokeResultEvidenceHandoff` helper，消费脱敏 execution handoff summary 和本地 result evidence summary。
- 输出稳定 `status`、`release`、`reasonAlias`、`resultAliases`、`resultCounts`、`missingPrerequisites`、`ownerHandoffLimits`、`operatorActions`、`redLineFlags`、`cannotInferBoundaries` 和 `evidenceShapeVersion`。
- 新增 focused Node 测试，覆盖 `passed`、`partial-handoff`、`blocked`、`needs-user-action`、缺少 evidence、未部署、未授权、脱敏失败、真实环境红线和 full-success overclaim。
- 新增 Bruno 只读入口和 WeCom 同步 README/operator 指引，说明如何准备、校验和交接 result evidence。
- 更新 `wecom-organization-sync` 规格，声明 controlled-smoke result evidence handoff 的可验证行为和边界。

## Non-Goals

- 不执行真实 controlled smoke，不触发真实 WeCom 同步，不创建 sync run，不写真实 fixture、真实 DB 或 synthetic audit/projection 数据。
- 不查询 API、Insight、Gateway 数据，也不证明组织树非空、Gateway/API/Insight 成功、authorization facts 生效、生产就绪或 full-success。
- 不修改 Gateway Projection、API、Insight、真实 Gateway、真实 DB、真实 WeCom 凭据或生产/类生产配置。
- 不收集 token、Cookie、私有 URL、真实账号、完整组织树、完整响应体或敏感日志。

## Impact

- Admin owner 范围：Bruno collection、本地 Node helper、focused 测试、WeCom 同步 README、OpenSpec change 和 `wecom-organization-sync` 主规格。
- Operator 将获得稳定状态：`passed`、`partial-handoff`、`blocked`、`needs-user-action` 和硬红线下的 `blocked` fail-closed 输出；所有输出只代表本地脱敏 result evidence handoff，不代表真实 downstream 成功。
