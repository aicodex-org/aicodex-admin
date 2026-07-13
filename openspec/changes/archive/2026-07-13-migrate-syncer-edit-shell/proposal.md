## Why

Syncer 编辑页仍使用旧 Card 标题操作区和页面底部重复按钮，长表单也依赖页面内联 `Row/Col` 间距。组织、用户、应用、Provider 等编辑页已经使用共享大型编辑页壳，Syncer 需要按同一边界收敛，避免身份源编辑体验继续分叉。

## What Changes

- 将 `/syncers/:syncerName` 的 Syncer 新增/编辑页接入 `LargeEditShell`，统一返回、面包屑、对象标题、滚动正文和固定底部动作栏。
- 移除 Card title 和页面正文末尾的重复保存操作，只保留共享壳底部的取消、保存、保存并返回。
- 将基本信息、连接配置、映射与状态作为三个页内 tabs，复用大型编辑页公共正文边界和最小 Syncer 私有样式，保持动态类型字段和编辑态保存契约。
- 修正新增流程：点击添加只进入本地草稿编辑页，点击保存时才创建 Syncer，取消不产生后端写入。
- 增加聚焦前端测试和浏览器验证，覆盖共享壳、唯一动作栏、关键动态字段及页面级 overflow。
- 不新增 Syncer API，不改变保存 payload、类型默认值、数据库连接测试、既有记录删除、路由跳转或真实同步行为。

## Capabilities

### New Capabilities

- 无。

### Modified Capabilities

- `admin-enterprise-identity-console-shell`: Syncer 等长编辑页应直接复用共享大型编辑壳，并允许正文按稳定配置域使用 tabs，不再保留旧 Card 标题操作区。
- `admin-enterprise-identity-auth-source-center`: Syncer 编辑页应使用共享大型编辑壳，同时保持既有同步配置、连接测试和保存契约。

## Impact

- 影响前端代码：`web-admin/src/SyncerEditPage.tsx`、新增聚焦测试、`web-admin/src/styles/edit/syncer-edit.less` 和大型编辑页样式聚合入口。
- 影响 OpenSpec：`admin-enterprise-identity-console-shell` 与 `admin-enterprise-identity-auth-source-center` delta specs。
- 不涉及后端 API、数据库结构、权限模型、真实数据库连接、外部目录同步或 `test` 分支。
