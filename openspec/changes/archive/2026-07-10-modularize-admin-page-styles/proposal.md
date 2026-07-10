## Why

`web-admin/src/App.less` 仍同时承载全局后台壳、身份控制台页面、列表页入口和编辑页入口；`styles/list-pages.less`、`styles/large-edit-pages.less` 也在多轮列表页/编辑页迁移后继续增长。后续还要改造更多编辑页和列表页，如果不先整理样式模块边界，review、定位和复用都会变慢。

## What Changes

- 将后台页面样式按工程归属拆成更小的 Less 模块，并通过聚合 import 保持现有 cascade 顺序。
- 覆盖全局后台壳/工作区 tabs、身份控制台页面样式、列表页样式集合、编辑页样式集合。
- 保留现有 selector、DOM class、视觉 token 和业务页面作用域，不做页面视觉重做。
- 补充样式模块边界测试和迁移文档，约束后续页面改造优先写入对应模块。

## Capabilities

### New Capabilities

- 无。

### Modified Capabilities

- `admin-enterprise-identity-console-shell`: 补充后台页面样式模块化边界要求，确保共享 shell、列表页和编辑页样式可以按模块维护且不改变现有页面行为。

## Impact

- 影响前端样式文件组织：`web-admin/src/App.less`、`web-admin/src/styles/**/*.less`。
- 影响样式 contract 测试和设计迁移文档。
- 不改变后端 API、权限、保存 payload、路由、i18n 文案或运行时数据契约。
