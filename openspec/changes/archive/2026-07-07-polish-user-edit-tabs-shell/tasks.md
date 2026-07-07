## 1. OpenSpec 准备

- [x] 1.1 创建 proposal、design、delta specs 和 tasks，并运行 OpenSpec strict validate。

## 2. 用户编辑页壳层改造

- [x] 2.1 新增共享 `LargeEditShell`，让组织、用户、群组共用头部、滚动正文和底部动作栏结构。
- [x] 2.2 在 `UserEditPage.tsx` 增加固定业务 active tab、dirty、submitting 状态和返回路径 helper。
- [x] 2.3 将用户编辑页正文改为参考组织页的固定业务 tabs，并保留 hash 恢复当前分组。
- [x] 2.4 增加顶部返回路径、用户标题、未保存状态、正文滚动区和底部固定操作栏。
- [x] 2.5 保留用户保存、保存并返回、returnUrl/sessionStorage fallback、失败 owner/name 回滚和新增取消删除临时用户语义。

## 3. 样式、i18n 与测试

- [x] 3.1 为用户编辑壳增加 scoped 样式、暗黑主题和窄屏换行规则。
- [x] 3.2 补齐新增用户编辑页文案的 zh/en locale。
- [x] 3.3 更新 `UserEditPage.test.tsx` 覆盖固定业务 tabs、hash、固定操作栏、dirty 确认、提交中防重复和旧字段回调。
- [x] 3.4 运行组织、群组聚焦测试，确认共享壳替换不改变单正文/多 tabs 正文业务行为。

## 4. 验证

- [x] 4.1 运行 `git diff --check`、incremental TypeScript gate、`yarn typecheck` 和聚焦 Jest。
- [x] 4.2 如本地前端预览可用，连接 60 测试后台做用户编辑页浏览器 smoke；如不可用，记录限制。
