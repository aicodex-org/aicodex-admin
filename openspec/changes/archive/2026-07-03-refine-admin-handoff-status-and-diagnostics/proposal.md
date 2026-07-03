## Why

60 截图显示 Admin `Insight Admin Provider 交接` 页面在 partial 状态下同时出现黄色阻断和绿色“材料已齐”，容易让操作者误判整体已 ready。`诊断详情` 入口也过于像普通折叠文本，不能清楚表达有多少阻断、多少能力可用，以及哪些内容属于 P0 外边界。

本 change 对默认层状态语义和诊断详情呈现做小范围产品化修复：让 copy-safe 元数据可生成和 Profile 凭据闭环缺失两个概念分开表达，并把诊断详情升级为摘要加分组详情。

## What Changes

- partial/missing 状态下，copy-safe 交接操作区不再显示绿色“材料已齐”，改为中性/黄色提示“可生成元数据包，但仍缺凭据引用”。
- 默认层明确区分 `交接材料元数据可生成` 与 `Profile 凭据闭环可完成`，缺 resolver 凭据引用时继续保留生成按钮，但整体不表达为 complete/ready。
- `诊断详情` 改为紧凑诊断摘要行，默认显示阻断数、可用能力数和 `Admin secure handoff 不在 P0` 边界，并提供明确的 `查看诊断详情` / `收起诊断详情` 动作。
- 展开后按 `阻断项`、`可用能力`、`技术证据` 三组展示；阻断项优先展示 owner、reason 和 next action；wrapper route、owner alias 等仍只在技术证据组出现。
- 保持 copy-safe package 生成/复制、脱敏边界和 Admin P0 边界，不新增后端契约、不实现 Admin secure handoff、不改 API/Gateway/Insight contract。

## Capabilities

### New Capabilities

无。

### Modified Capabilities

- `admin-enterprise-identity-usage-access-entry`: 收敛 Admin Provider handoff 默认层状态语义，并规范诊断摘要与分组详情。

## Impact

- Affected frontend: `web-admin/src/ApplicationAccessServiceCredentialGovernancePanel.tsx`、相关 zh/en i18n 和 Jest。
- Affected OpenSpec: `admin-enterprise-identity-usage-access-entry`。
- No backend/API/Gateway/Insight contract, Admin secure handoff, credential lifecycle, DB migration, or runtime credential value handling changes.
