## Why

群组列表页已经接入企业控制台风格查询工具栏，但表格主体仍保留旧后台的重按钮、重边框和长字段直铺展示。管理员在 `/groups` 扫描群组、组织、父级和成员时，操作列、固定列阴影、排序提示和长 ID 叠加产生明显视觉噪声。

本 change 对群组列表页做局部视觉密度 polish，降低操作列和长字段负担；同时按验收反馈修正群组页和组织页共享“更多筛选”展示方式，使高级筛选以内联搜索区展开，并保持查询、筛选、排序、分页、上传、下载和删除禁用语义不变。

## What Changes

- 调整群组列表表格列渲染，使长群组 ID、组织 ID、父级 ID 和显示名称在表格内截断展示，并通过 tooltip/title 保留完整值。
- 将用户列表从不受控的长标签串调整为更适合表格扫描的有限展示，超出数量以低权重计数提示保留可见上下文。
- 降低操作列视觉权重：编辑保留为清晰可点的行内主操作，删除改为更轻量的危险操作；有子群组时继续禁用删除并保留原因提示。
- 降低群组列表表格的固定列阴影、表头分割线和边框噪声，并把排序提示限定在排序图标 hover/focus 上。
- 保持群组列表工具栏动作分组、查询、重置、类型筛选、添加、下载模板和上传入口行为不变。
- 将群组页和组织页共享“更多筛选”从遮挡正文的浮层纠偏为工具栏内部向下展开的搜索区，并统一高级筛选字段 label 的英文冒号。

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `admin-enterprise-organization-identity-center`: 补充群组列表表格视觉密度、长字段扫描、操作列降噪、更多筛选内联展开和业务语义兼容要求。

## Impact

- 主要前端文件：`web-admin/src/GroupListPage.tsx`、`web-admin/src/GroupListPage.test.tsx`、`web-admin/src/OrganizationListPage.tsx`、`web-admin/src/OrganizationListPage.test.tsx`、`web-admin/src/common/EnterpriseListQueryToolbar.tsx`、`web-admin/src/common/EnterpriseListQueryToolbar.test.tsx`。
- 局部样式：`web-admin/src/App.less` 中限定 `.group-list-table`、群组行内渲染类名和共享查询工具栏高级筛选区样式。
- OpenSpec：为 `admin-enterprise-organization-identity-center` 添加群组列表视觉密度和更多筛选内联展开 delta。
- 不新增 API，不修改后端、认证、授权、路由、数据模型、组织同步、OAuth/OIDC、Gateway 或 `test`。
- 不处理侧栏折叠按钮、标签栏关闭动作、侧栏父子选中态；这些由独立 change 负责。
