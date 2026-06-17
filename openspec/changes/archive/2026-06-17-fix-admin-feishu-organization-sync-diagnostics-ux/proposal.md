## Why

飞书组织同步验收时发现两个体验问题：绑定诊断把同一飞书身份经同步映射和扫码登录属性进入本地用户的情况误判为“本地用户多租户”，同时 dry-run 历史和验收资料默认暴露过多工程审计细节，干扰 operator 判断正式同步是否可继续。

## What Changes

- 修正 Feishu/Lark user binding conflict diagnostics 的本地用户多租户判定：同一本地用户下的记录若能通过 `user_id`、`open_id`、`union_id` 或 `lark` 稳定标识连通，应视为同一身份，不因 tenant alias 来源不同而报高风险冲突。
- 将飞书组织同步页面的 dry-run 历史默认收起，只在标题摘要中提示最近预览情况，展开后再显示脱敏历史表和详情。
- 收敛“验收资料” Drawer 的默认信息密度：默认显示脱敏结论、阻断、建议下一步和无法证明项，内部 alias、hash、版本、逐项 checklist 仅在“详细清单和安全别名”展开区显示。
- 保留复制/导出脱敏 JSON/Markdown 能力，不读取真实 Feishu/Lark secret，不触发真实租户同步，不写 User/Group/Platform 主数据。

## Capabilities

### New Capabilities

无。

### Modified Capabilities

- `feishu-organization-sync`: 调整绑定冲突诊断判定和飞书组织同步页面的 dry-run history / handoff evidence 默认展示层级。

## Impact

- 后端: `admin/object/feishu_organization_sync_user_binding_conflict.go` 及聚焦单测。
- 前端: `web-admin/src/FeishuOrganizationSyncPage.js` 及页面聚焦测试。
- OpenSpec: `openspec/specs/feishu-organization-sync/spec.md` 的诊断和验收 UI 要求。
- 验证: target OpenSpec strict、`git diff --check`、Go object focused tests、web-admin incremental TypeScript gate、FeishuOrganizationSyncPage Jest、前端 build/typecheck 按改动风险执行。
