## Context

Admin remediation 审批包目前可以生成 approval preview 和派生 approval packet audit。Audit 的 P0 范围是 `derived_non_persistent`，用于展示审批包摘要、风险、事件可用性和脱敏导出，不记录真实用户点击或持久审批事件。Operator 仍需要一份可复制、可导出的交接备注草稿，把审批包上下文转成便于人工 review 协作的说明。

现有实现已有 organization-scoped controller/router/authz、Setting allowlist、前端 backend wrapper、drawer/panel 交互、脱敏 sample/export 模型和 approval packet audit service。本 change 复用这些边界，不新增 API/Gateway/Insight 事实源，也不新增真实修复写入。

## Goals / Non-Goals

**Goals:**

- 基于 existing approval packet audit + approval preview + preflight + action draft metadata 生成只读 handoff note 草稿。
- 明确 P0 notes scope 为 `derived_note_draft` / `not_persisted`，不作为合规持久审计。
- 给 operator 展示 handoff summary、risk/status/checklist summary、cannotInfer、operator next steps、sample stable hashes 和 JSON/Markdown export。
- 在 web-admin approval preview / approval packet audit 区域提供备注入口、状态展示和脱敏 JSON/Markdown 复制/导出。
- 覆盖 ready、blocked、empty/missing packet、cannotInfer、long text、error、export redaction 的测试和 changed-function coverage。

**Non-Goals:**

- 不执行 remediation，不写组织主数据，不修复 membership/user/department 关系。
- 不触发 gateway projection publish，不写 Gateway facts，不查询 API/Gateway/Insight 内部库。
- 不新增持久 notes store、真实审批提交、评论系统、工单系统或审批执行流。
- 不修改 Feishu/WeCom 组织同步实现，不触碰其它同步或 projection 写集。

## Decisions

1. **Operator notes 作为派生只读草稿，P0 不新增持久表。**
   - 方案：新增 service/helper 复用 approval packet audit 输出，按 organization、packet/preview/draft/action、risk/status、blocked reasons、required approvals、checklist digest 和 sample hashes 计算稳定 `noteId` / `noteHash`。
   - 理由：当前需求是人工协作备注草稿，不是合规审计或真实评论系统；派生草稿避免引入幂等写入、迁移、保留期清理和权限编辑语义。
   - 替代方案：新增 Admin-owned notes store。当前 P0 不需要真实保存或协作编辑，推迟到明确产品策略后再设计。

2. **Markdown 和 JSON 都由后端脱敏生成。**
   - 方案：后端输出 `exportSummary` 和 `markdownSummary`，仅包含 stable hash、display-safe label、risk/checklist/status/reason/version summary、manual_review_only、cannotInfer。
   - 理由：前端只负责展示、复制和下载，避免前端拼接时误透传 raw payload 或真实主体信息。

3. **cannotInfer 显式列出不可推断内容。**
   - 方案：notes 固定包含不能从 Admin read model 推断的事项，例如真实人员身份、手机号/邮箱、source payload、Gateway/API 执行状态、自动修复可行性。
   - 理由：handoff notes 需要帮助 operator 和 reviewer 理解边界，防止把草稿误认为可执行审批结论。

4. **fail-closed 和只读边界。**
   - 方案：缺少 organization、invalid filter、ready filter 空态、缺失 packet 或内部错误都不得返回可执行状态；`executionMode` 始终为 `manual_review_only`，`autoExecutionAllowed` 始终为 `false`。
   - 理由：备注草稿用于人工协作，不能成为敏感信息泄漏或误执行入口。

5. **前端嵌入既有 approval packet audit 区域。**
   - 方案：在 approval packet audit 面板中增加“交接备注”按钮或区域，复用现有 loading/error/empty/copy/export 模式和 Setting allowlist。
   - 理由：用户路径是从 approval preview 到 approval packet audit，再生成 handoff notes，不需要新页面或路由。

## Risks / Trade-offs

- [Risk] 派生 notes 未持久化，不能证明 operator 真实交接或阅读。Mitigation：响应和 spec 明确 `noteScope=derived_note_draft` 与 `retentionPolicy=not_persisted`；后续真实协作流另行引入 Admin-owned notes store。
- [Risk] Markdown 文案可能被误解为审批结论。Mitigation：固定包含 `manual_review_only`、`autoExecutionAllowed=false` 和 cannotInfer。
- [Risk] 样例或摘要可能意外包含敏感字段。Mitigation：后端集中构建 export/markdown，前后端测试覆盖 redaction，不透传 raw payload。

## Migration Plan

- 无数据库迁移。
- 发布时新增只读 API endpoint、authz allowlist 和前端调用；旧 plan/draft/preflight/approval preview/audit API 保持兼容。
- 回滚时移除前端入口即可停止用户访问，后端只读 endpoint 不写入数据。

## Open Questions

无。P0 固定为非持久化、`manual_review_only`、只读 handoff note 草稿，不需要产品决策即可实施。
