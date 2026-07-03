## Why

Admin `Insight Admin Provider 交接` 页面已经完成旧入口清理和 copy-safe package/Profile 字段对齐，但 60 截图显示默认层仍把 wrapper capability、owner alias 和 owner evidence 诊断信息铺在首屏。操作者需要先理解多组内部能力与 alias，才能判断“能不能生成交接包、下一步该做什么”，这偏离了当前 P0 的交接动作优先路线。

本 change 将默认层收敛为低噪声的交接动作页面：首屏只回答状态、目标消费方、包类型、下一步和生成动作；详细 wrapper/owner/capability 证据保留在默认收起的诊断详情中。

## What Changes

- 调整 `/application-usage-access` 默认呈现层：以整体交接状态、目标消费方 `Insight`、包类型 `copy-safe metadata`、下一步 action 和 `生成 Admin 交接包` 为首屏核心。
- 将 wrapper routes、owner alias、稳定 alias、逐项 capability/evidence 明细从默认层移入默认收起的 `诊断详情` / `技术细节`。
- 当存在缺失项时，默认层只显示一个阻断摘要和一个修复建议，不铺多张不可用能力卡。
- 保留 copy-safe package 生成、复制和脱敏边界，不新增后端字段、不实现 Admin secure handoff、不引入 credential lifecycle。
- 更新前端测试与 i18n，覆盖默认低噪声、详情展开、旧入口不可见和 package 生成行为。

## Capabilities

### New Capabilities

无。

### Modified Capabilities

- `admin-enterprise-identity-usage-access-entry`: 收敛 `Insight Admin Provider` 默认 UI 层级，使诊断信息默认折叠，交接动作成为主路径。

## Impact

- Affected frontend: `web-admin/src/ApplicationAccessServiceCredentialGovernancePanel.tsx`、相关 i18n 和 Jest。
- Affected OpenSpec: `admin-enterprise-identity-usage-access-entry`。
- No backend contract, Admin secure handoff, API/Gateway/Insight contract, secret store, credential issuer/revoke lifecycle, DB migration, or runtime credential value handling changes.
