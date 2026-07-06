## Why

60 环境截图显示 Admin `Insight Admin Provider 交接` 页面已经 P0 可用，但 partial 状态下主动作语义仍不够稳：用户可能误以为点击按钮会打包真实凭据，或者必须先修复凭据引用才能生成交接包。

本 change 只把“可生成的是元数据交接包，不含真实凭据；真实凭据在 Insight Profile 绑定补齐”提升到默认层主决策信息，不改变后端 contract，不做 Admin secure handoff，也不新增 Admin secret 管理中心。

## What Changes

- partial/missing 状态的默认 warning 文案改为主决策表达：可生成元数据交接包；真实凭据需导入 Insight Profile 后绑定 `manual/secretRef` 凭据解析器补齐。
- 主按钮从泛化 `生成 Admin 交接包` 收敛为 `生成元数据交接包`，生成后按钮为 `重新生成元数据交接包`。
- 下一步文案改为中文动作前置：`导入 Insight Profile 后，绑定 manual/secretRef 凭据解析器`。
- 存在阻断时默认层展示第一条阻断和建议动作，不要求用户先展开诊断详情才知道阻断是什么。
- 仅低成本补齐诊断展开按钮 `aria-expanded` / `aria-label`。

## Capabilities

### Modified Capabilities

- `admin-enterprise-identity-usage-access-entry`: 澄清 partial 状态下可生成的交接包类型、真实凭据后续绑定位置和默认可见阻断摘要。

## Impact

- 影响 `web-admin/src/ApplicationAccessServiceCredentialGovernancePanel.tsx` 默认层文案、按钮标签和默认可见阻断摘要。
- 影响 zh/en locale 和 `ApplicationUsageAccessPage.test.tsx`。
- 不改后端 payload、copy-safe package schema、API/Gateway/Insight contract。
