## 1. 复现与定位

- [x] 1.1 在 60 测试环境复现 Insight 发起 Admin OIDC 授权页白屏，并记录脱敏页面状态、console 错误 alias 和触发步骤。
- [x] 1.2 定位 translator TypeError 的具体文件、函数和调用链，确认根因位于授权页/i18n 初始化边界。

## 2. 聚焦测试

- [x] 2.1 补充最小单测或组件测试，先复现授权页 translator 输入异常导致白屏的行为。
- [x] 2.2 确认新测试在修复前因预期原因失败。

## 3. 实现修复

- [x] 3.1 在登录/授权页 i18n/translator 边界做最小修复，确保缺失资源或未初始化状态下不抛出整页白屏异常。
- [x] 3.2 保持普通后台页面、OIDC 签发、token/userinfo/scope 和编辑页布局行为不变。

## 4. 验证与交付

- [x] 4.1 运行聚焦测试、`git diff --check`、OpenSpec strict validate、前端增量 TS gate 和必要的 typecheck/build。
- [x] 4.2 在 60 测试环境完成脱敏浏览器 smoke：Admin 授权页非白屏，Insight 回跳后用量页不再提示 Admin 登录态不可用；若需要环境变更则记录 blocker 并停在 RC。
- [x] 4.3 更新验证记录和最终 RC 回传，明确 changed files、验证证据、剩余风险、`push_test=false` 和是否需要 master decision。
