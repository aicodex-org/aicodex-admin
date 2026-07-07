## 1. OpenSpec 与实施边界

- [x] 1.1 创建并校验 `proposal.md`、`design.md`、delta specs 和 `tasks.md`。
- [x] 1.2 确认角色编辑页迁移范围不包含权限编辑页、角色列表页、后端 API 或权限模型语义变更。

## 2. 角色编辑页结构迁移

- [x] 2.1 在 `RoleEditPage.tsx` 增加 dirty、validation 和 submitting 状态。
- [x] 2.2 将旧 Card title 保存按钮和正文底部重复按钮迁移为顶部返回路径、基础信息/授权范围区块和底部固定操作栏。
- [x] 2.3 保留组织、名称、显示名称、描述、关联用户、关联群组、关联角色、域名和启用状态的字段 handler 与保存 payload 语义。
- [x] 2.4 保留新增模式取消删除临时角色、保存失败回滚角色名、保存停留和 `/roles` 返回语义。

## 3. 校验、i18n 与样式

- [x] 3.1 为角色 `名称`、`显示名称` 增加必填红星和保存前校验。
- [x] 3.2 为新增标题、路径、未保存状态、确认、校验、分区标题和字段 tooltip 补充 zh/en locale。
- [x] 3.3 在 `App.less` 增加中性 `identity-object-edit-*` scoped 样式，并保留角色页 scoped class。
- [x] 3.4 将群组编辑页头部、正文容器、字段网格和固定底部操作栏接入同一套中性样式，保留单页正文与成员摘要专属样式。
- [x] 3.5 将群组、角色详情路由纳入 cardless large edit page 路径，避免外层 content Card 破坏编辑框架高度和底部操作栏位置。

## 4. 测试与验证

- [x] 4.1 更新 `RolePermissionEditPages.test.tsx` 覆盖角色单页编辑壳、固定操作栏、必填校验、dirty 取消/返回确认、保存/保存并返回和新增取消清理。
- [x] 4.2 保持 PermissionEditPage 现有测试通过，确认本 change 未改权限编辑页行为。
- [x] 4.3 运行 OpenSpec strict validate、`git diff --check`、incremental TypeScript gate、`yarn typecheck` 和聚焦 Jest。
- [x] 4.4 如本地预览可用，使用前端代理 60 测试后台检查角色编辑页浅色/暗色视觉、无横向溢出和无新增 console/page error。
