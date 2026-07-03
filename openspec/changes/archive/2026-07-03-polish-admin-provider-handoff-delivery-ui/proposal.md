## Why

上一轮已把 `用量接入 / Admin Provider` 页对齐为 Insight Admin Provider 的 copy-safe 交接页，但默认首屏仍把 wrapper route、owner alias 和缺失 key 铺得过重。实施/运维在 P0 需要先判断“能不能生成、下一步做什么、交给谁、交什么包”，再按需查看技术细节。

## What Changes

- 将默认摘要调整为交接状态、下一步、目标消费方和包类型四个面向操作的字段。
- 将 wrapper 能力和 owner evidence 默认文案改成人话状态，隐藏 raw route、alias、owner evidence 细节到 `技术细节`。
- 强化主操作 `生成 Admin 交接包`，并在缺项时明确是可生成部分包还是需补齐后生成。
- 收敛 P0 边界说明为低噪提示，继续明确 Admin 不做 secure handoff，也不配置 API/Gateway 用量 provider。

## Capabilities

### New Capabilities

无。

### Modified Capabilities

- `admin-enterprise-identity-usage-access-entry`: 调整 `用量接入 / Admin Provider` 页面默认呈现层级和交接动作要求。

## Impact

- Affected UI: `web-admin/src/ApplicationAccessServiceCredentialGovernancePanel.tsx`、`web-admin/src/App.less`。
- Affected i18n: `web-admin/src/locales/zh/data.json`、`web-admin/src/locales/en/data.json`。
- Affected tests: `web-admin/src/ApplicationUsageAccessPage.test.tsx`；导航测试仅作为回归门禁运行。
- Affected OpenSpec: `admin-enterprise-identity-usage-access-entry` delta。
- No backend/API/Gateway/Insight contract change.
