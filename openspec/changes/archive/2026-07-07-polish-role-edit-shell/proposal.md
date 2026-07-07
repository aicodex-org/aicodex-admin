## Why

角色编辑页仍使用旧式 Card 标题按钮、正文底部重复按钮和全宽表单行，和组织编辑页已经形成的固定编辑框架体验不一致。角色页字段量适合做轻量单页正文样板，用来沉淀后续 Role、Group、Permission、Invitation 等身份对象编辑页的共享头部、正文容器和底部操作栏规则。

## What Changes

- 将角色编辑页迁移为共享编辑框架：顶部返回路径、对象标题、未保存状态、正文分区和底部固定操作栏。
- 移除旧 Card title 内保存按钮和正文底部重复按钮，统一按钮顺序为 `取消`、`保存`、`保存并返回`。
- 将角色字段分为 `基础信息` 与 `授权范围` 两个区块，不新增 Tabs。
- 为角色 `名称`、`显示名称` 增加红色必填标识和保存前校验；校验失败时阻止调用保存 API。
- 为角色字段补充更具体的 tooltip 与 zh/en locale，避免继续使用不清晰的通用说明。
- 将群组编辑页的头部、正文容器、字段网格和固定底部操作栏挂到同一套 `identity-object-edit-*` 中性样式，保留单页正文和成员摘要专属样式。
- 保留现有 RoleBackend API、保存 payload、保存后路由更新、保存失败回滚角色名、新增取消删除临时角色和 `/roles` 返回语义。
- 不修改权限编辑页、角色列表页、后端 API、权限模型或角色授权关系语义。

## Capabilities

### New Capabilities

无。

### Modified Capabilities

- `admin-enterprise-identity-console-shell`: 增加角色编辑页轻量单页正文、共享编辑框架、必填校验、授权范围分区和固定底部操作栏要求。

## Impact

- Affected code: `web-admin/src/RoleEditPage.tsx`, `web-admin/src/GroupEditPage.tsx`, `web-admin/src/ManagementPage.tsx`, `web-admin/src/RolePermissionEditPages.test.tsx`, `web-admin/src/GroupEditPage.test.tsx`, `web-admin/src/ManagementPage.shell.test.tsx`, `web-admin/src/App.less`, `web-admin/src/locales/en/data.json`, `web-admin/src/locales/zh/data.json`.
- Affected docs/specs: this OpenSpec change and related main specs after archive.
- Affected validation: OpenSpec strict validate, incremental TypeScript gate, `yarn typecheck`, focused role/permission edit tests, and local browser smoke when preview/login state is available.
