## Context

`RoleEditPage.tsx` 是 TSX legacy class component，当前字段包括组织、名称、显示名称、描述、关联用户、关联群组、关联角色、域名和启用状态。页面承担角色元信息与授权范围维护，不只是只读摘要；现有测试 `RolePermissionEditPages.test.tsx` 已覆盖 Role 与 Permission 两类编辑页，迁移时需要避免影响 PermissionEditPage。

## Goals / Non-Goals

**Goals:**

- 让角色、群组编辑页使用组织编辑页同一类共享编辑框架：头部返回路径、未保存状态、正文容器和固定底部操作栏一致。
- 角色字段按 `基础信息` 与 `授权范围` 分区，保持单页扫描效率。
- 为 `名称`、`显示名称` 增加必填标识和保存前校验。
- 保留现有角色保存、保存并返回、新增取消删除临时角色、保存失败回滚角色名和 `/roles` 返回语义。
- 为名称、类型相近字段和启用状态补充角色上下文 tooltip，避免通用文案造成误解。

**Non-Goals:**

- 不做 Tabs。
- 不修改权限编辑页。
- 不修改角色列表页、角色权限模型、Casbin 行为、后端 API 或授权关系语义。
- 不把 `users`、`groups`、`roles` 改为只读摘要；角色编辑页仍负责维护授权范围。

## Decisions

### 共享编辑框架与单页正文

页面框架：

- Header：返回按钮、路径 `组织账号 / 角色 /`、标题 `编辑角色（显示名称）` 或 `新建角色`、未保存状态。
- Body：根据对象复杂度选择正文模式。组织使用 Tabs；角色、群组使用单页区块。
  - 角色单页正文包含两个分区。
  - `基础信息`：组织、名称、显示名称、描述、启用状态。
  - `授权范围`：关联用户、关联群组、关联角色、域名。
- Footer：固定底部操作栏，按钮顺序为 `取消`、`保存`、`保存并返回`。

角色页字段比群组页多，但仍不足以拆 Tabs。分区比 Tabs 更适合一次性扫描元信息与授权范围。

### 保存、取消与校验

保存前校验 `role.name` 和 `role.displayName` 的 trim 后值。失败时展示字段错误、页面错误提示，并阻止调用 `RoleBackend.updateRole`。

任意字段变更标记 dirty；保存成功清除 dirty。返回和取消触发 dirty 确认。新增模式取消确认后继续调用 `deleteRole()`，避免留下预创建角色。

保存成功后：

- `保存` 停留在编辑页并推送 `/roles/:owner/:name`。
- `保存并返回` 返回 `/roles`。

保存失败继续回滚 `name` 到进入页面时的 `roleName`，保持既有错误处理语义。

### 样式边界

本 change 使用中性 `identity-object-edit-*` 样式作为单页编辑正文在共享编辑框架下的基础，避免继续复制 `group-edit-*`/`role-edit-*` 大块样式。角色页仍保留 `role-edit-page` 和 `role-edit-card` scoped class，群组页仍保留 `group-edit-page` 和 `group-edit-card` scoped class，保证测试、smoke 和后续局部修复定位稳定。

群组页保留单页内容结构，不引入 Tabs；仅把标题区、滚动正文、表单网格、字段行、固定底部操作栏收敛到同一套中性样式。成员摘要、成员标签和成员管理入口仍使用 `group-edit-*` 专属样式。

群组和角色详情路由必须和组织详情路由一样走 `admin-shell-route-scroll-without-card`，不能再被 `content-warp-card` 包裹；否则编辑框架无法撑满路由高度，底部操作栏会跟随正文内容停在页面中部。

## Risks / Trade-offs

- [Risk] 中性样式同时覆盖角色页和群组页，后续局部调整可能误伤另一页。
  - Mitigation: 页面保留 `role-edit-*` / `group-edit-*` scoped class；业务专属样式不并入中性规则。
- [Risk] 授权范围多选字段较多，固定底部操作栏可能让用户误以为局部变更立即生效。
  - Mitigation: 保持 dirty 状态和底部全局保存语义；本 change 不新增即时保存按钮。
- [Risk] 测试文件同时覆盖 PermissionEditPage，角色页改造可能误伤权限页。
  - Mitigation: 只调整 RoleEditPage 相关断言，保留 PermissionEditPage 测试覆盖。
