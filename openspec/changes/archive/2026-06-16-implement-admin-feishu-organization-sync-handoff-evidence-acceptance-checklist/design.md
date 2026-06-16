## Context

现有 Feishu/Lark organization sync handoff evidence 已通过 `GET /api/feishu-org-sync/handoff-evidence` 暴露只读、脱敏、Admin-owned 的交接证据，并在前端页面支持复制/导出 JSON。真实联调进入手动验收阶段后，operator 需要更明确地区分：

- 哪些项由 Admin 本地元数据推导。
- 哪些项属于 provider/Gateway/Insight owner，Admin 不能推断。
- 哪些项需要人工复核或阻断后续交接。
- 证据是否已脱敏、是否有 retention/redaction 标记，是否存在 no-fallback 情况。

本任务只增强现有 evidence read model 和 UI，不新增同步写入、不读取真实 Feishu/Lark secret、不调用 Contact v3。

## Goals / Non-Goals

**Goals:**

- 在 handoff evidence 响应中新增 `acceptanceChecklist`，表达 derived/manual-review-only 的验收项。
- 覆盖 provider-owned evidence missing、manual review actions、cannotInfer、noFallback、redaction/retention 和 safe hash/alias 标记。
- 前端展示 checklist 摘要、条目、provider missing、manual actions、cannotInfer/noFallback，并支持复制/导出脱敏 JSON 和 Markdown。
- 对 loading/empty/error/provider missing/cannotInfer/noFallback/copy/export 状态补测试。

**Non-Goals:**

- 不证明 provider truth、真实租户同步成功、Gateway 消费、Insight 验收或生产 readiness。
- 不调用 Feishu/Lark Contact v3，不触发 dry-run 或正式同步。
- 不修改 User/Group/Platform/organization master data，不发布 Gateway facts。
- 不触碰 OIDC/auth center shell、WeCom homepage login/admin config、cleanup approval 或 organization remediation notes 写集。

## Decisions

1. **Checklist 嵌入现有 evidence 响应。**
   - 原因：前端已经围绕 handoff evidence 加载、刷新和导出；checklist 是 evidence 的派生视图，独立 endpoint 会增加状态一致性和权限面。
   - 替代方案：新增 `/acceptance-checklist` endpoint。未采用，因为没有独立事实源，也不需要额外查询参数。

2. **Checklist 全部由本地 evidence 派生。**
   - 原因：任务边界要求 Admin 只读本地同步元数据；因此每个 item 都携带 `source="admin_local_metadata"` 或 `source="external_owner_required"`，并显式 `manualReviewOnly=true`。
   - 替代方案：把 provider missing 项标记为 failed。未采用，因为 provider-owned 缺口不是 Admin 的失败，只能提示 manual review。

3. **使用 alias/status/action，而不是自由文本作为主要机器契约。**
   - 原因：便于 UI、导出和测试稳定断言；自由文本仅作为 operator-facing safe summary。
   - 状态集合：`passed`、`needs_review`、`blocked`、`missing`、`cannot_infer`。

4. **Markdown 导出只在前端生成。**
   - 原因：后端 JSON 是 canonical evidence；Markdown 是 operator handoff 便利格式，不需要服务端模板或存储。

## Risks / Trade-offs

- [Risk] Checklist 被误解为真实租户验收通过。→ 在后端字段和 UI 文案中固定输出 `manualReviewOnly`、`derived`、`cannotInfer` 和 `noFallback`，避免 “success/prod ready” 表述。
- [Risk] 导出内容泄露 source id 或用户信息。→ 复用现有 safe marker/hash，并在后端/前端测试中断言不包含 raw id、手机号、邮箱、token、secret。
- [Risk] 增大 Feishu 页面信息密度。→ 使用紧凑表格、标签和折叠/列表型展示，不新增营销式说明区。
- [Risk] provider-owned missing 项造成误报。→ 将其归类为 `external_owner_required` 和 `needs_review`，不阻断现有配置/同步操作。
