## Context

Admin 侧 Gateway Projection 只读工具已经能生成以下脱敏证据：

- readiness summary：deployment shape、source freshness、mapping readiness、fixture 前置条件。
- release decision：是否可进入受控 smoke 准备。
- controlled smoke preflight/release runbook/evidence readiness：受控 smoke 前置证据是否齐备。

本 change 在这些证据之上提供统一 remediation handoff wrapper，目标是让 operator 直接看到“谁处理、做什么、最小解除条件是什么、不能外推到哪里”。

## Goals

- 将常见 blocker alias 映射为稳定 remediation category、owner、action list、minimum unblock condition 和 `doNotDispatchUntil`。
- 覆盖 mapping missing/untrusted、source freshness stale、publisher/refresh disabled、contract/version mismatch、empty subject/tombstone fixture missing、controlled smoke preflight/evidence 未满足。
- 对敏感字段、完整响应体、真实写入信号和 full-success 外推 fail closed。
- 只输出脱敏 alias、counts、owner、动作、最小解除条件和边界，不回显原始 evidence。

## Non-Goals

- 不连接真实 Admin/API/Insight/Gateway 环境。
- 不创建或修改 fixture、DB、mapping、gateway authorization facts。
- 不读取完整组织树、真实账号、私有 URL、token、Cookie 或原始响应体。
- 不改变 API diagnostics、Gateway ingestion 或 Insight consumer 的 owner 边界。

## Decisions

- Decision: 使用 CommonJS 纯函数 helper，并沿用现有 Bruno scripts 的 fail-closed pattern。
  Rationale: 现有 Gateway Projection helper 均以 Node `require` 和 `node:test` 验证，保持一致可降低维护成本。
- Decision: Bruno 入口采用 local-only pre-request，生成结果后主动中止网络请求。
  Rationale: 本任务只做 operator remediation 包装，不应误连真实环境。
- Decision: remediations 只保存稳定 alias/counts，不保存完整 evidence。
  Rationale: prompt 要求验证记录和提交物必须脱敏。

## Risks / Trade-offs

- Risk: operator 将 remediation handoff 当成真实修复已完成。
  Mitigation: 输出 `release=hold`，ready 也只表示 handoff 可交接；保留不能外推边界。
- Risk: 新 alias 没有显式映射。
  Mitigation: fallback 到 `unknown-admin-remediation`，owner 为 `admin_operator`，要求回到 Admin projection readiness/runbook。
- Risk: API/Insight blocker 被 Admin 单侧处理。
  Mitigation: API diagnostics alias 显式指向 `api_diagnostics_owner`，并禁止 Admin 查询 API/Insight/Gateway 私有库。
