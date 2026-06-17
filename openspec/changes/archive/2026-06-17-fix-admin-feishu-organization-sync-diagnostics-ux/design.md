## Context

飞书组织同步已经具备配置、dry-run preview/history、binding conflict diagnostics、handoff evidence 和 acceptance checklist。60 测试环境的真实验收数据暴露出一个判定偏差：同一飞书用户先由通讯录同步写入 `feishu_user_mapping`，后由飞书扫码登录写入本地 User 的 Lark/Feishu 属性时，二者可能带有不同的 tenant alias，但共享同一个稳定身份标识。现有诊断按 `tenant_key + user_id` 简单计数，会把这种正常融合路径误判为高风险多租户复用。

同一页面还把 dry-run 历史和 handoff checklist 的工程审计信息直接铺在主流程里。对 operator 来说，正式同步记录、当前阻断、建议动作比 preview 历史和内部 alias 更重要。

## Goals / Non-Goals

**Goals:**

- 避免将同步映射和扫码登录属性的同一 Feishu/Lark 身份误判为本地用户多租户风险。
- 保留真正多身份复用的高风险诊断：同一本地用户关联多个互不连通的 Feishu/Lark 身份时仍需提示。
- 让 fly-run/dry-run history 成为可展开的审计资料，而不是首屏主信息。
- 让验收资料 Drawer 默认面向 operator 决策，只展示脱敏摘要、阻断、下一步和不可证明项。
- 内部 alias/hash/checklist 明细仍可展开查看、复制、导出，满足审计和交接。

**Non-Goals:**

- 不新增后端 API、数据库表、迁移或真实租户调用。
- 不改变正式同步、dry-run preview、history 记录、handoff evidence 生成语义。
- 不修改企业微信同步、API/Gateway/Insight 或扫码登录认证链路。
- 不迁移整个 legacy `.js` 页面到 TSX；本次只做 scoped bugfix/UX polish。

## Decisions

1. 使用身份连通聚类修正多租户判定。
   - 对同一本地用户的 mapping 记录和 User 属性记录收集 `user_id`、`open_id`、`union_id`、`lark`。
   - 任一稳定标识相同即合并为同一身份 cluster。
   - 仅当 cluster 数量大于 1 时报告 `local_user_multi_tenant`。

2. Dry-run 历史默认折叠。
   - 标题展示最近记录数量和最新预览时间。
   - 展开后仍显示脱敏 history table 和详情 Drawer。
   - 刷新按钮保留在折叠标题区域，并阻止触发展开事件。

3. 验收资料 Drawer 分为默认决策层和展开审计层。
   - 默认层：readiness、source type、已脱敏标记、safe summary、阻断、建议下一步、无法证明项、summary counts。
   - 展开层：版本、execution mode、safe source hashes、provider-owned evidence aliases、manual actions、cannotInfer/noFallback 和 checklist table。
   - alias 默认转换为中文 operator 标签；原始 alias 只在展开层可见。

## Risks / Trade-offs

- [Risk] 仅按共享稳定标识聚类可能把数据质量差但共享 open_id/union_id 的记录视为同一身份。
  Mitigation: 这些标识来自 Feishu/Lark 身份链路，属于本能力当前可用的最强稳定标识；多个完全不连通身份仍会报高风险。
- [Risk] 默认折叠 dry-run history 可能让少数审计场景多一次点击。
  Mitigation: 标题保留最近摘要，展开后原表格和详情功能不删减。
- [Risk] Drawer 默认隐藏内部 alias 可能影响排障效率。
  Mitigation: “详细清单和安全别名”保留完整脱敏 alias 和 checklist，复制/导出不受影响。
