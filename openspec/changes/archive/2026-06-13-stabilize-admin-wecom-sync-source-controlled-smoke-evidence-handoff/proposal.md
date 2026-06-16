# Admin WeCom source controlled smoke evidence handoff

## Why

已有 WeCom source readiness handoff、release decision guardrail 和 controlled smoke preflight，可以把 Admin-owned source 侧进入受控 smoke 前的准备条件分类为脱敏 alias。但后续 owner 仍缺少一份稳定、可复制、可校验的 evidence handoff 摘要，用来交接“当前证据能做什么、缺什么、下一步由谁处理、哪些红线不能越过”。

如果没有该 handoff，operator 容易把 preflight ready 误写成真实 WeCom 同步成功、组织树非空、Gateway/API/Insight 成功、authorization facts 生效、生产就绪或 full-success。

## What Changes

- 新增本地只读 `wecomSourceControlledSmokeEvidenceHandoff` helper，输入只接受脱敏 readiness/release/preflight summary。
- 输出稳定 `status`、`reasonAlias`、operator next actions、missing prerequisites、redaction checks、hard red-line flags 和不能外推边界。
- 新增 focused Node 测试，覆盖 pass、缺少前置、脱敏失败、红线信号和 full-success overclaim。
- 新增 Bruno 只读入口和 operator README，明确这是 evidence handoff，不执行真实 controlled smoke。
- 更新 `wecom-organization-sync` 规格，声明 Admin WeCom source controlled-smoke evidence handoff 的可验收行为。

## Non-Goals

- 不触发真实 WeCom 同步，不创建 sync run，不查询或写入真实 DB，不写真实 fixture。
- 不证明组织树非空、Gateway/API/Insight 成功、authorization facts 生效、生产就绪或 full-success。
- 不修改 Gateway Projection、组织树、API、Insight/Gateway 仓库或跨 owner contract 字段。
- 不收集 token、Cookie、私有 URL、真实账号、完整组织树、完整响应体或敏感日志。
- 不把本地 handoff 扩展为跨 owner 发布审批系统或生产环境 smoke 执行器。

## Impact

- Admin owner 范围：Bruno collection、本地 Node helper、focused 测试、OpenSpec 主规格和 operator README。
- Operator 将获得稳定状态：`ready-for-controlled-smoke-evidence-handoff`、`missing-readiness-summary`、`missing-release-summary`、`missing-preflight-summary`、`redaction-required`、`hard-red-line-blocked`、`overclaim-full-success`。
