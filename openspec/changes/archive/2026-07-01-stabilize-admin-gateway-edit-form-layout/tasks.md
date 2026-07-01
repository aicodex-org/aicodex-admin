## 1. OpenSpec 与范围确认

- [x] 1.1 创建并验证本 change 的 proposal、design、delta spec 和任务清单，明确只修 LLM AI / Gateway 编辑页内部布局。
- [x] 1.2 完成实施前 review，确认不触碰组织、用户、应用、Provider、Syncer 页面。

## 2. 布局契约测试

- [x] 2.1 为 Agent、Entry、MCP Server、Site、Rule 编辑页补充聚焦 Jest 断言，先验证缺少 scoped class hook 的失败状态。
- [x] 2.2 测试覆盖页面级 hook、卡片级 hook 和普通字段行契约，不断言保存 payload 或后端 API 行为。

## 3. 实现

- [x] 3.1 为目标编辑页增加 `admin-gateway-edit-page`、`admin-gateway-edit-card` 和普通字段行 class hook。
- [x] 3.2 在 `App.less` 中增加限定到上述 hook 的 scoped CSS，修复普通字段行 label/control 布局并保护嵌套表格/表达式编辑器。

## 4. 验证与收口

- [x] 4.1 运行 OpenSpec、增量 TypeScript gate、`yarn typecheck`、聚焦 Jest、`yarn build` 和 diff check。
- [x] 4.2 使用浏览器 smoke 在 1280px 桌面宽度验证核心目标页面布局契约；若真实后端不可用，记录 fixture DOM/布局验证口径。
- [x] 4.3 更新 `verification.md`，完成归档前 review、archive、单 commit 收敛和 self-closeout。
