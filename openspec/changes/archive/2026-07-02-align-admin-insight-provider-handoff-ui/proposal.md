## Why

总控 `one-time-credential-handoff` 已把 P0 边界收敛为：Admin 只提供 Insight Admin Provider 的 copy-safe 元数据交接、owner/readiness/diagnostic 摘要和 manual/secretRef 绑定指引，不实现 Admin secure handoff，也不把 Admin 做成另一个用量 provider 配置中心。

现有 `应用接入 / 用量接入` 页面已经具备服务凭据治理交接包能力，但入口名称和部分提示仍容易被理解成“在 Admin 配置用量 provider”。需要把 Admin 侧产品表达进一步收口为 Insight Admin Provider 交接/状态页，避免 operator 把 copy-safe handoff 误解为运行态凭据闭环。

## What Changes

- 调整 Admin 前端入口和主面板文案，使其明确表达“Insight Admin Provider 交接/状态”。
- 默认展示 Admin 侧 owner/readiness/alias/next action 摘要和三条固定 wrapper 能力边界：`current-user`、`current-user/scope`、`current-user/organization-tree`。
- copy-safe handoff 生成和复制提示明确说明：包只包含 Admin 身份、组织、resolver、projection/trust 与服务凭据引用摘要；Insight P0 仍需 manual/secretRef binding。
- 异常态下一步指向 Admin owner 补配置或交由 Insight manual/secretRef 绑定排查，不引导用户在 Admin 中配置 API/Gateway 用量 provider。

## Non-Goals

- 不实现 Admin secure handoff。
- 不新增 grant、issuer、redeem、confirm、revoke 或 receiver registration API。
- 不输出 token、secret、Authorization、Cookie、DSN、完整私有 URL、raw payload、raw id、真实账号或完整组织树。
- 不修改 API/Gateway/Insight contract，不改变既有 wrapper 路由行为。

## Impact

- Affected UI: `web-admin/src/ApplicationUsageAccessPage.tsx`、`web-admin/src/ApplicationAccessServiceCredentialGovernancePanel.tsx`。
- Affected tests: `web-admin/src/ApplicationUsageAccessPage.test.tsx`。
- Affected OpenSpec: `admin-enterprise-identity-usage-access-entry` delta。
