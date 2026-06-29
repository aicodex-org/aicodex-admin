## Context

当前 OAuth/OIDC Provider 登录链路会先按 Provider 专属外部标识查找用户，例如 WeCom `wecom` 字段、Lark/Feishu 标识等。未找到时，登录链路会进入 `bindingRule` fallback 逻辑，尝试按应用 Provider 配置的字段绑定既有 Admin 用户。

现有运行时在 `bindingRule == nil` 时会把默认规则设为 `Email`、`Phone`、`Name`。这使未显式配置的应用在扫码登录时可能按用户名或手机号自动合并用户。跨 WeCom、Feishu 和未来 DingTalk 等企业身份源时，`Name` 不具备稳定唯一性，`Phone` 受权限、格式和历史数据影响，不适合成为隐式默认合并依据。

## Goals / Non-Goals

**Goals:**

- 将未配置 `bindingRule` 的运行时默认规则收紧为 `Email`。
- 默认邮箱匹配只在 Provider 返回非空邮箱时执行。
- 显式配置的 `Phone`、`Name` 规则保持可用，并避免空值字段误匹配。
- 应用 Provider 配置 UI 明确展示未配置时的有效运行时默认规则。
- 用 focused 测试覆盖默认规则和 UI 展示，降低扫码登录误合并回归风险。

**Non-Goals:**

- 不删除 `Phone` 或 `Name` 作为显式可配置规则。
- 不迁移历史用户、mapping 表或 token 表。
- 不改变 Provider 专属外部标识优先匹配逻辑。
- 不新增组织、同步来源或用户绑定数据模型。

## Decisions

1. **默认规则使用局部 effective rules，不回写 `ProviderItem.BindingRule`**

   `bindingRule == nil` 表示管理员未配置规则。后端在函数内计算 `effectiveRules := []string{"Email"}`，而不是把默认值写回结构体。这样可以避免登录运行时产生隐藏副作用，也让 API 返回仍能区分“未配置”和“显式配置”。

2. **Email-only 作为默认自动合并规则**

   邮箱在企业身份源之间比用户名更稳定，也比手机号更少受到格式、权限和复用影响。Phone/Name 继续作为显式规则保留，管理员确实需要时可以配置，但不会在空配置下隐式参与自动合并。

3. **字段值为空时跳过对应规则**

   即使某个规则被显式配置，也不应拿空邮箱、空手机号或空用户名去查询既有用户。该防护可以避免空字段匹配到历史脏数据。

4. **UI 展示有效默认规则，而不是自动保存默认值**

   前端在 `bindingRule` 未配置时展示“运行时默认按邮箱匹配”之类提示，但不把 `["Email"]` 写入保存 payload。这样既说明真实运行时行为，又不破坏未配置状态。

## Risks / Trade-offs

- **风险：依赖默认手机号或用户名自动合并的旧应用登录行为变严。**
  缓解：显式配置 `Phone` 或 `Name` 仍可保留旧行为；UI 展示默认规则帮助管理员发现需要显式配置的应用。

- **风险：邮箱缺失的 Provider 用户默认不再自动合并。**
  缓解：这是 fail closed 行为，避免错误绑定；需要支持时应由管理员显式配置更强约束下的 Phone/Name 规则。

- **风险：历史已误合并用户不会自动拆分。**
  缓解：本 change 只阻断新增默认误合并；历史数据清理按专项脚本或人工流程处理。
