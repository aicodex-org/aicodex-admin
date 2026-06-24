## Why

`/users` 当前仍以数据库导出式字段展示为主：组织 ID、应用 ID、技术用户名和头像破图占据主扫描路径，表格横向滚动明显，且验证状态使用禁用 switch 容易被误解为可操作控件。群组页和组织页已经完成列表密度收敛，用户页需要按同一套列表页经验补齐，避免身份控制台内同类列表体验割裂。

## What Changes

- 将用户页顶部从强“账号生命周期工作台”形态降级为紧凑用户列表上下文，保留结果数、账号状态摘要和主要写操作。
- 复用共享列表页表格壳与查询工具栏模式，把用户页默认列收敛到可扫描的账号识别、联系方式、来源/归属、验证状态、更新时间和操作。
- 接入共享查询工具栏的更多筛选区域，用户页更多筛选保持现有单字段后端查询契约，不引入当前页多字段假过滤。
- 抽齐组织、群组、用户列表共享文本/链接/状态/操作样式 class，让同类列表字号和行高一致。
- 降权或隐藏组织 ID、应用 ID、注册来源、余额、管理员/禁用/删除开关等低频详情字段，保留后端模型、详情页和既有查询契约。
- 为头像展示提供失败兜底，避免破图图标成为表格主视觉。
- 将只读状态从禁用 switch 调整为 scan-friendly 状态标签，减少误操作暗示。
- 保持新增、编辑、删除、移出群组、模拟登录、上传、下载模板、排序、分页和后端 `field + value` 查询语义兼容。

## Capabilities

### New Capabilities

- 无。

### Modified Capabilities

- `admin-enterprise-organization-identity-center`: 补充用户列表默认字段、表格密度、头像兜底、状态展示和横向滚动收敛要求。

## Impact

- 前端：`web-admin/src/UserListPage.tsx`、`web-admin/src/UserListPage.test.tsx`、`web-admin/src/App.less`、必要的 zh/en locale 文案。
- 共享组件：优先复用 `ListPageTable` 和 `EnterpriseListQueryToolbar`，不改变共享组件的后端查询语义。
- OpenSpec：新增本 change 的 delta spec，后续 archive 时同步到 `admin-enterprise-organization-identity-center` 主规格。
- 不新增后端 API、不改变 `UserBackend.getUsers` / `getGlobalUsers` / 上传 / 删除 / 模拟登录契约，不触发组织同步、认证刷新、授权刷新或 Gateway projection 操作。
