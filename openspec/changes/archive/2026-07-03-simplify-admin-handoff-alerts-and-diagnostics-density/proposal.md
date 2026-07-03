## Why

60 环境截图显示 Admin `Insight Admin Provider 交接` 页面虽然状态语义已经正确，但 partial 默认态仍同时出现顶部阻断、copy-safe 操作区黄色提示和醒目的 P0 边界说明，视觉上像告警堆叠。展开诊断后信息已分组，但阻断项和能力项仍偏卡片化，技术 alias/route 过早铺开，影响实施/运维快速判断下一步。

## What Changes

- 默认态只保留一条主阻断叙事：顶部状态摘要与下一步继续保留，主提示统一说明缺少凭据引用；copy-safe 操作区改为中性说明。
- 将 `Admin 只交付 copy-safe metadata...` 边界说明降级为低噪信息行，不作为默认视觉焦点。
- 优化诊断展开密度：阻断项改为紧凑表格/列表，可用能力改为紧凑 chips 或小列表，技术证据进一步收敛，必要 alias/route 仍可访问但不铺满默认详情。
- 保持 `生成 Admin 交接包` 主动作、copy-safe 脱敏边界和 `manual/secretRef binding` 指引；不改后端 contract，不实现 Admin secure handoff。

## Capabilities

### New Capabilities

- 无。

### Modified Capabilities

- `admin-enterprise-identity-usage-access-entry`: 收敛 Admin Provider 交接页 partial 默认态告警数量，并要求诊断详情使用更紧凑的信息结构。

## Impact

- 影响 `web-admin/src/ApplicationAccessServiceCredentialGovernancePanel.tsx` 的默认态和诊断详情布局。
- 影响 `web-admin/src/ApplicationUsageAccessPage.test.tsx` 等相关 Jest 断言。
- 可能影响 zh/en locale 文案；不影响 API/Gateway/Insight contract、后端字段或凭据生命周期。
