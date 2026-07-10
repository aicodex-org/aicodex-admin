## 1. 样式模块拆分

- [x] 1.1 将 `App.less` 中的全局后台壳、身份控制台页面、响应式规则和登录页样式拆入具名模块，并保持顶层 import 顺序等价。
- [x] 1.2 将 `styles/list-pages.less` 拆为列表页聚合入口和 `styles/list/` 子模块，保留现有列表 selector 与 cascade。
- [x] 1.3 将 `styles/large-edit-pages.less` 拆为编辑页聚合入口和 `styles/edit/` 子模块，保留现有编辑页 selector、mixin 与 cascade。

## 2. 测试与文档

- [x] 2.1 更新样式 contract 测试，覆盖新的聚合入口、子模块路径和关键 selector 边界。
- [x] 2.2 更新大型编辑页迁移指南或相关设计文档，说明后台页面样式模块归属和后续写入规则。

## 3. 验证

- [x] 3.1 运行聚焦 Jest 测试、`yarn typecheck --pretty false`、`yarn build`、增量 TypeScript 门禁、`openspec validate` 和 `git diff --check`。
- [x] 3.2 启动本地前端代理 60 测试后台或等价预览，使用浏览器 smoke 检查代表性列表页和编辑页无明显样式断裂、console error 或页面级横向溢出。
- [x] 3.3 更新 `verification.md`，记录验证命令、结果、覆盖率适用性和剩余风险。
