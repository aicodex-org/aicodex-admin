## 1. Context And Proposal Readiness

- [x] 1.1 审计资源、证书、密钥、Webhook 回调、Webhook 事件列表的现有列、搜索字段、后端 fetch 参数和关键操作。
- [x] 1.2 对照 `ApplicationListPage`、组织/群组/用户列表和共享组件，确认可复用的列表壳、查询工具栏、样式类和测试方式。
- [x] 1.3 完成实施前 review，运行 `openspec validate "polish-application-access-list-table-density" --strict` 和 `git diff --check`。

## 2. Test First

- [x] 2.1 为目标页面补充失败测试，验证统一 `ListPageTable` 与 `EnterpriseListQueryToolbar` 渲染。
- [x] 2.2 补充主搜索和更多筛选映射测试，验证请求仍使用既有 `field`、`value`、分页和排序参数。
- [x] 2.3 补充或保留关键操作测试，覆盖上传/删除/下载/新增/Webhook 事件重放和详情查看不被样式改造破坏。

## 3. Implementation

- [x] 3.1 资源列表对齐公共列表壳、主搜索、更多筛选、列密度和低噪声操作入口。
- [x] 3.2 证书列表对齐公共列表壳、主搜索、更多筛选、列密度和下载/删除操作入口。
- [x] 3.3 密钥列表对齐公共列表壳、主搜索、更多筛选、列密度和新增/删除操作入口。
- [x] 3.4 Webhook 回调列表对齐公共列表壳、主搜索、更多筛选、列密度和新增/删除操作入口。
- [x] 3.5 Webhook 事件列表对齐公共列表壳、状态筛选、主搜索、更多筛选、列密度、详情和重放操作入口。
- [x] 3.6 若目标页或直接触达 helper 仍为 JS 且迁移低风险，则迁移为 TS/TSX；若无需迁移，在验证记录中说明。

## 4. Validation And Closeout Evidence

- [x] 4.1 运行聚焦 Jest 测试并确认新增测试先失败后通过。
- [x] 4.2 运行 `yarn typecheck --pretty false` 和 `git diff --check`。
- [x] 4.3 可行时启动本地预览并检查目标页面的列表密度、搜索、更多筛选和关键操作入口。
- [x] 4.4 更新 `verification.md`，记录命令、结果、覆盖率/无法测量说明、TS 迁移结论和剩余风险。
