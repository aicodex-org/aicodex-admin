## Context

Admin 组织目录质量控制台已形成只读 remediation 决策链路：plan 用于聚合 reason/action，action drafts 用于生成 `manual_review_only` 草案，preflight 用于检查执行前 blocker，approval preview 用于组装人工审批包。当前缺口是 operator 无法在 Admin 内按审批包维度查看生成、复制、导出、状态和风险摘要的只读历史/审计视图。

现有实现已有 organization-scoped controller/router/authz、Setting allowlist、前端 backend wrapper、drawer/panel 交互和脱敏 sample/export 模型。本 change 复用这些边界，不新增 API/Gateway/Insight 事实源，也不新增真实修复写入。

## Goals / Non-Goals

**Goals:**

- 基于既有 approval preview + preflight + action draft 元数据生成只读 approval packet audit/search/history。
- 明确 P0 storage scope 为 `derived_non_persistent`，不落库，不把复制/导出 UI 动作写成持久事件。
- 给 operator 展示 packet hash、approval preview hash、event/status summary、risk level、affected count、blocked reasons、required approvals、operator checklist digest、sample stable hashes、export summary、storage scope 和 retention policy。
- 在 web-admin action draft / preflight / approval preview 区域提供审计入口、状态展示和脱敏 JSON 复制/导出。
- 覆盖 ready、blocked、empty、missing preview、risk/status summary、export redaction、long text 和 disabled 的测试和 changed-function coverage。

**Non-Goals:**

- 不执行 remediation，不写组织主数据，不修复 membership/user/department 关系。
- 不触发 gateway projection publish，不写 Gateway facts，不查询 API/Gateway/Insight 内部库。
- 不新增跨 owner 持久审批流、工单系统、审批人配置中心或真实审批提交。
- 不修改 Feishu/WeCom 组织同步实现，不触碰其它 projection cleanup 或同步写集。

## Decisions

1. **Approval packet audit 作为派生只读对象，P0 不新增持久表。**
   - 方案：新增 service/helper 复用 execution approval preview 输出，按 organization、draft/preflight 标识、approval preview hash、action alias、risk、blocked reasons、required approvals 和 sample hashes 计算稳定 `packetAuditId` / `packetHash`。
   - 理由：P0 需要 operator 检索和导出审批包摘要，但没有真实审批提交、执行状态或合规保留要求；派生视图可避免引入幂等写入、迁移、保留期清理和事件一致性成本。
   - 替代方案：新增 Admin-owned 审计表。当前没有真实写事件来源，持久化会让复制/导出行为被误解为审计事实，推迟到真实审批/执行流再设计。

2. **历史视图为 deterministic history，不声明完整持久事件账本。**
   - 方案：每个 packet audit record 输出 `eventTypes`，至少包含 `generated_preview`、`available_for_copy`、`available_for_export`，并通过 `storageScope=derived_non_persistent`、`retentionPolicy=not_persisted` 明确范围。
   - 理由：operator 需要知道这个审批包可用于哪些只读操作，但 P0 不记录真实点击事件，避免制造不存在的审计强度。

3. **只以 Admin-owned read model 为事实源。**
   - 方案：service 复用 approval preview helper；过滤仍限制在 organization、packet/preview/draft/action/reason/entity/source/risk/status/keyword/limit/topN 维度。
   - 理由：保持 Admin 是组织主数据和 remediation owner，audit 只是 Admin 生产侧诊断和人工审批准备，不代表 Gateway/API/Insight 授权事实。

4. **fail-closed 和脱敏导出。**
   - 方案：缺少 organization、invalid filter、ready filter 空态、缺失 preview 或内部错误都不得返回可执行状态；`executionMode` 始终为 `manual_review_only`，`autoExecutionAllowed` 始终为 `false`。导出 JSON 仅包含 stable hash、display-safe label、source/status/reason/version/risk/checklist/approval summary。
   - 理由：审计视图用于人工决策和证据整理，不能成为敏感信息泄漏或误执行入口。

5. **前端嵌入既有 drawer/panel。**
   - 方案：在 approval preview 区域增加“审批包审计”按钮或区域，复用现有 loading/error/empty/copy/export 模式和 Setting allowlist。
   - 理由：用户路径是从 plan 到 draft、preflight、approval preview 再到 audit/history，不需要新页面或路由。

## Risks / Trade-offs

- [Risk] 派生 audit record 未持久化，不能证明 operator 真实复制/导出时间。Mitigation：响应和 spec 明确 `derived_non_persistent` 与 `not_persisted`；后续真实审批/执行流另行引入 Admin-owned audit store。
- [Risk] deterministic history 可能被误认为完整事件账本。Mitigation：字段使用 available/generated summary，并在 exportSummary 中说明 storage scope。
- [Risk] 仅 Admin read model 不能反映下游执行状态。Mitigation：文案和 spec 明确这是 Admin producer diagnostics，不代表 Gateway/API/Insight 事实。
- [Risk] 样例或摘要可能意外包含敏感展示字段。Mitigation：后端集中构建 sample stable hashes/export summary，前后端测试覆盖 redaction，不透传 raw payload。

## Migration Plan

- 无数据库迁移。
- 发布时新增只读 API endpoint、authz allowlist 和前端调用；旧 plan/draft/preflight/approval preview API 保持兼容。
- 回滚时移除前端入口即可停止用户访问，后端只读 endpoint 不写入数据。

## Open Questions

无。P0 固定为非持久化、`manual_review_only`、只读 approval packet audit/search/history，不需要产品决策即可实施。
