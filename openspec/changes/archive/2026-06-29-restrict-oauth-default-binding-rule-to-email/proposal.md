## Why

企业身份源通过 OIDC 扫码登录时，未配置 `bindingRule` 的运行时默认规则会按 `Email`、`Phone`、`Name` 依次查找既有用户。`Name` 在企业微信、飞书、后续钉钉等来源之间不稳定，`Phone` 也存在格式、权限和复用风险，默认自动合并过宽会把不同外部身份误绑定到同一个 Admin 用户。

当前需要把默认自动合并收紧到邮箱，保留显式配置能力，并在 UI 中展示实际运行时默认规则，避免管理员误解空配置的含义。

## What Changes

- 将 OAuth/OIDC Provider 登录 fallback 绑定规则的未配置默认值从 `Email + Phone + Name` 改为 `Email only`。
- 默认邮箱匹配在邮箱为空时不执行自动合并，避免空值误匹配。
- 显式配置的 `Phone`、`Name` 规则保持可用；本 change 不删除既有可配置项。
- 应用 Provider 配置 UI 在 `bindingRule` 未配置时展示运行时默认规则为邮箱匹配。
- 增加后端和前端 focused 测试覆盖默认规则与 UI 展示。

## Capabilities

### New Capabilities

- 无。

### Modified Capabilities

- `admin-application-identity-source-bindings`: 收紧 Provider 登录 fallback 用户绑定默认规则，并要求 UI 展示未配置时的有效运行时默认规则。

## Impact

- 后端：`admin/controllers/auth.go` 中 Provider 登录 fallback 用户绑定逻辑。
- 前端：应用编辑页 Provider 表格中的 `bindingRule` 配置展示。
- 测试：新增或调整后端绑定规则测试、前端 Provider 表格测试与 i18n 文案。
- 数据：不做历史用户、mapping 表或 token 表迁移；历史误合并数据仍需按专项清理处理。
