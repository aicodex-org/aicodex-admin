## Why

60 环境截图显示 Admin `Insight Admin Provider 交接` 页面仍有两处低价值技术噪声：

- 默认层展示 `Admin secure handoff 不在 P0` 这类内部路线语言。
- 展开诊断里展示 `环境维护项 / 环境配置 / 在部署配置或外部 secret system 中维护`，容易把用户带回底层运维路径。

当前 P0 路线不变：Admin 只交付 copy-safe metadata，不保存真实凭据，不做 Admin secure handoff，也不成为 secret 管理中心。默认 UI 和诊断展开层应更产品化，只表达交接包只含元数据/引用、不传真实凭据，以及真正可用于判断的阻断和能力证据。

## What Changes

- 将默认层边界说明改为产品化文案：`Admin 交接包只包含元数据，不传递真实凭据。`
- 展开诊断的 owner evidence 过滤 `keep_in_env` 环境维护项，避免出现 `环境维护项`、`环境配置`、`部署配置`、`外部 secret system` 等非主流程动作。
- 保留阻断项、可用能力、wrapper route 和其他 owner evidence 技术证据。
- 不改变后端 contract、copy-safe package schema、API/Gateway/Insight contract。

## Capabilities

### Modified Capabilities

- `admin-enterprise-identity-usage-access-entry`: 收敛 Admin handoff 默认层和诊断展开层文案，减少内部路线语言和底层 secret 落点提示。

## Impact

- 影响 `web-admin/src/ApplicationAccessServiceCredentialGovernancePanel.tsx` 的默认边界文案和诊断 owner evidence 渲染条件。
- 影响 zh/en locale 与 `ApplicationUsageAccessPage.test.tsx` 断言。
- 不新增 UI 流程，不改后端接口，不实现 Admin secure handoff。
