## 1. Backend Binding Rule

- [x] 1.1 增加后端 focused 回归测试，覆盖未配置 `bindingRule` 时仅按非空邮箱作为默认规则。
- [x] 1.2 增加后端 focused 回归测试，证明未配置 `bindingRule` 时不会按手机号或用户名匹配。
- [x] 1.3 增加后端 focused 回归测试，证明空字段会被跳过，且显式 `Phone` / `Name` 规则仍可用。
- [x] 1.4 实现运行时 effective binding rules，不回写或修改 `ProviderItem.BindingRule`。

## 2. Provider Binding UI

- [x] 2.1 增加或更新前端 focused 测试，覆盖 `bindingRule` 未配置时展示有效默认邮箱规则。
- [x] 2.2 更新 Provider 绑定 UI，展示未配置时的运行时默认规则，但不把默认值持久化为表单数据。
- [x] 2.3 增加 zh/en locale 文案，说明新的绑定规则提示。

## 3. Validation

- [x] 3.1 运行当前 change 的严格 OpenSpec 校验。
- [x] 3.2 运行 OAuth Provider fallback 绑定行为的后端 focused 测试。
- [x] 3.3 运行 Provider 绑定 UI 行为的前端 focused 测试。
- [x] 3.4 运行适用的前端 typecheck/build 检查和 `git diff --check`。
