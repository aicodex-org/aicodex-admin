## 1. 提案与实施前检查

- [x] 1.1 完成 `proposal.md`、`design.md`、delta spec 和 `tasks.md`。
- [x] 1.2 运行 `openspec validate migrate-provider-edit-shell --strict`。
- [x] 1.3 完成实施前 review，确认范围不改变 Provider contract。

## 2. Provider 编辑页改造

- [x] 2.1 将 `ProviderEditPage.tsx` 接入 `LargeEditShell`，统一头部、面包屑、滚动正文和底部动作栏。
- [x] 2.2 将 Provider 基础字段迁移到共享 `LargeEditSection` / `LargeEditFieldRow`，保留动态 Provider helper 输出和字段默认值逻辑。
- [x] 2.3 移除旧 Card title 操作区和页面外层重复底部按钮，保存、保存并返回、添加态取消继续调用既有方法。
- [x] 2.4 新增或接入最小 Provider 编辑页样式模块，复用公共 large edit mixin 和 legacy row 样式。

## 3. 测试与验证

- [x] 3.1 补充 Provider 编辑页聚焦测试，覆盖共享编辑壳、动作栏、基础字段和重复按钮移除。
- [x] 3.2 运行 Provider 编辑页相关前端测试和 `yarn typecheck`。
- [x] 3.3 运行 `yarn build` 或等价前端构建验证。
- [x] 3.4 启动本地前端代理 60 后台，使用浏览器验证 Provider 编辑页桌面布局。
- [x] 3.5 更新 `verification.md`，记录命令、浏览器验证、覆盖率处置和剩余风险。
