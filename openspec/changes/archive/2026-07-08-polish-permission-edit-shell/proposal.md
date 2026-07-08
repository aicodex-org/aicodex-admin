## Why

权限编辑页仍使用旧式 Card 标题按钮、正文底部重复按钮和单列长表单，和组织、群组、角色编辑页已经形成的编辑壳体验不一致。权限页字段量明显多于角色页，但可归纳为两个大配置域，适合用双 Tabs 加 tab 内区块标题提升扫描效率。

## What Changes

- 将权限编辑页迁移到大型编辑页壳：顶部返回路径、对象标题、未保存状态、tabs、独立滚动正文和底部固定操作栏。
- 顶层 tabs 控制为 `基础` 与 `规则` 两个大域；tab 内继续使用区块标题承载细分组。
- 移除旧 Card title 内保存按钮和正文底部重复按钮，统一按钮顺序为 `取消`、`保存`、`保存并返回`。
- 为权限 `名称`、`显示名称` 增加红色必填标识和保存前校验；保存前校验失败时阻止调用保存 API。
- 保留现有 PermissionBackend API、保存 payload、保存后路由更新、保存失败回滚权限名、新增取消删除临时权限和 `/permissions` 返回语义。
- 将权限详情路由纳入 cardless large edit page 路径，避免外层 content Card 破坏编辑壳高度和底部操作栏位置。
- 补充 zh/en locale 与聚焦测试，覆盖 tabs、固定操作栏、必填校验、dirty 取消确认和既有权限校验语义。
- 抽出大型编辑页正文公共结构和两行身份选项样式，并让权限/角色页的组织、模型选择展示显示名与内部标识。
- 不修改权限模型、资源/动作枚举、审批权限规则、权限列表页或后端 API。

## Capabilities

### New Capabilities

无。

### Modified Capabilities

- `admin-enterprise-identity-console-shell`: 增加权限编辑页双 Tabs、大型编辑壳、固定底部操作栏、必填校验和 cardless 路由要求。

## Impact

- Affected code: `web-admin/src/PermissionEditPage.tsx`, `web-admin/src/RoleEditPage.tsx`, `web-admin/src/common/LargeEditShell.tsx`, `web-admin/src/ManagementPage.tsx`, `web-admin/src/RolePermissionEditPages.test.tsx`, `web-admin/src/ManagementPage.shell.test.tsx`, `web-admin/src/App.less`, `web-admin/src/locales/en/data.json`, `web-admin/src/locales/zh/data.json`, `web-admin/src/styles/large-edit-pages.less`.
- Affected docs/specs: this OpenSpec change and `admin-enterprise-identity-console-shell` main spec after archive.
- Affected validation: OpenSpec strict validate, incremental TypeScript gate, `yarn typecheck`, focused permission edit tests, shell route tests, and browser smoke when local preview/login state is available.
