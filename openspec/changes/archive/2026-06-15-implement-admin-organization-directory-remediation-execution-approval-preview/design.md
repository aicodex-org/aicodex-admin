## Context

Admin 组织目录质量控制台已具备三层只读能力：remediation plan 用于按 reason 聚合优先级，action drafts 将某类 action 转成 `manual_review_only` 草案，preflight 在未来执行前检查 blocker、样例和安全清单。本 change 在同一 Admin owner 边界内增加 execution approval preview，供 operator 进入审批流程前查看审批包。

现有实现已经有 organization-scoped controller/router/authz、setting allowlist、前端 backend wrapper、drawer/panel 交互和脱敏 sample 模型。本 change 不引入 API/Gateway/Insight 事实源，也不新增真实修复写入。

## Goals / Non-Goals

**Goals:**

- 基于既有 action draft + preflight 结果生成只读 approval preview。
- 明确输出 `executionMode=manual_review_only`、`autoExecutionAllowed=false`，避免被误解为可执行修复。
- 给 operator 展示 risk level、审批要求、operator checklist、blocked reasons、safe/export summary 和 sample stable hashes。
- 在 web-admin action draft / preflight 区域提供审批预览入口、状态展示和脱敏 JSON 复制/导出。
- 覆盖 blocked、ready、empty/no-sample、missing preflight、risk-level、export redaction 的测试和 changed-function coverage。

**Non-Goals:**

- 不执行 remediation，不写组织主数据，不修复 membership/user/department 关系。
- 不触发 gateway projection publish，不写 Gateway facts，不查询 API/Gateway/Insight 内部库。
- 不新增跨 owner 持久审批流、工单系统、审批人配置中心或真实审批提交。
- 不修改 Feishu/WeCom 组织同步实现，不触碰 projection cleanup execute readiness 写集。

## Decisions

1. **Approval preview 作为派生只读对象，不新增持久表。**
   - 方案：新增 service/helper 聚合 action draft 和 preflight 输出，按 request scope、draft/preflight 标识、action alias、count、blocked reasons 和 sample hashes 计算稳定 `approvalPreviewId` / `approvalPreviewHash`。
   - 理由：P0 只需要审批前预览，不需要持久审批生命周期；复用既有 read model 可避免发明新的 owner 数据源。
   - 替代方案：新增 approval preview store。当前没有真实审批提交和执行状态，不需要引入迁移和状态一致性成本。

2. **只以 Admin-owned read model 为事实源。**
   - 方案：service 复用 remediation action draft 与 preflight helper，所有过滤仍在 organization、draft/action/reason/entity/source/keyword/limit/topN 维度内完成。
   - 理由：保持 Admin 是组织主数据和 remediation owner，preview 只是 Admin 生产侧诊断与人工审批准备。
   - 替代方案：读取 Gateway ingestion 或 API runtime 状态。该方案违反 owner 边界，本 change 明确排除。

3. **fail-closed readiness 和风险分级。**
   - 方案：缺少 organization、无匹配 draft、缺失/blocked preflight、内部错误、ready filter 空态都不得返回可自动执行状态；`autoExecutionAllowed` 始终为 `false`。`riskLevel` 从 blocked reasons、affected count、action alias、sample availability 派生为稳定枚举。
   - 理由：审批预览用于人工决策而非执行放行，任何不确定性都应保守呈现。

4. **脱敏 export summary 与 sample hashes。**
   - 方案：导出 JSON 仅包含 stable hash、display-safe label、entity/source/quality/reason/lifecycle、sourceConnectionIdHash、org/source version 等字段；不返回手机号、邮箱、source payload、token/Cookie、私有 URL、完整组织树。
   - 理由：operator 需要可复制/可归档摘要，但不能把审批包变成敏感数据泄漏通道。

5. **前端嵌入既有 action draft drawer/preflight 区域。**
   - 方案：在同一 drawer/panel 中增加“审批预览”按钮或区域，复用现有 loading/error/empty/export 模式和 Setting allowlist。
   - 理由：用户路径是从 remediation plan 到 draft，再到 preflight/approval preview；不需要新页面或路由。

## Risks / Trade-offs

- [Risk] 派生 ID/hash 未持久化，不能作为长期审批记录主键。→ Mitigation：字段命名为 preview，exportSummary 标明来源和 generatedAt；真实审批流后续另行设计。
- [Risk] 仅 Admin read model 可能无法证明下游最终执行状态。→ Mitigation：文案和 spec 明确这是 Admin producer diagnostics，不代表 Gateway/API/Insight 授权事实。
- [Risk] 样例或摘要可能意外包含敏感展示字段。→ Mitigation：后端集中构建 sample stable hashes/export summary，前后端测试覆盖 redaction，不透传 raw payload。
- [Risk] 未来真实执行可能需要更严格 approval policy。→ Mitigation：P0 输出 `requiredApprovals` 和 `operatorChecklist`，但不实现审批提交或执行。

## Migration Plan

- 无数据库迁移。
- 发布时新增只读 API endpoint、authz allowlist 和前端调用；旧 plan/draft/preflight API 保持兼容。
- 回滚时移除前端入口即可停止用户访问，后端只读 endpoint 不写入数据。

## Open Questions

无。P0 固定为 `manual_review_only` 只读审批预览，不需要产品决策即可实施。
