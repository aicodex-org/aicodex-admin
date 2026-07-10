## ADDED Requirements

### Requirement: 后台页面样式模块按职责维护

Admin 身份控制台 Shell SHALL 将全局 shell、身份控制台页面、列表页集合和大型编辑页集合的 Less 样式按职责模块化维护，同时保持现有页面 selector、DOM class、主题 token 和视觉行为稳定。

#### Scenario: App Less 只承担聚合入口
- **WHEN** 前端维护后台页面样式
- **THEN** `web-admin/src/App.less` SHALL 主要作为顶层样式聚合入口
- **AND** 全局后台 shell、身份控制台页面、列表页、编辑页、响应式规则和登录页样式 SHALL 通过具名 Less 模块引入
- **AND** import 顺序 SHALL 保持与模块化前等价的 cascade 顺序

#### Scenario: 列表页和编辑页保留聚合入口
- **WHEN** 前端维护列表页或大型编辑页样式
- **THEN** `web-admin/src/styles/list-pages.less` 和 `web-admin/src/styles/large-edit-pages.less` SHALL 保留为对应页面族的聚合入口
- **AND** 页面族内部 MAY 按公共壳、页面域或业务对象拆入子目录模块
- **AND** 已有 `.enterprise-list-*`、`.admin-large-edit-*`、`.organization-edit-*`、`.user-edit-*`、`.application-edit-*` 等 selector SHALL NOT 因文件拆分被重命名

#### Scenario: 身份控制台相关页面保留页面族入口
- **WHEN** 前端维护身份控制台总览、应用接入、认证源、审计治理、组织同步、系统信息或平台运维页面样式
- **THEN** `web-admin/src/styles/identity-console-pages.less` SHALL 保留为身份控制台相关页面样式的聚合入口
- **AND** 页面族内部 MAY 按连续页面域拆入 `web-admin/src/styles/identity/` 子模块
- **AND** 已有 `.enterprise-identity-*`、`.identity-console-*`、`.server-store-*`、`.organization-sync-*`、`.system-info-*` 等 selector SHALL NOT 因文件拆分被重命名

#### Scenario: 模块化不改变用户可见行为
- **WHEN** 样式文件完成模块化整理
- **THEN** 组织、用户、应用、群组、角色、权限等已改造编辑页 SHALL 保持原有编辑壳、表格密度、暗色主题和移动端行为
- **AND** 组织、群组、用户、应用、Provider 等已改造列表页 SHALL 保持原有列表壳、查询工具栏、表格密度、行操作和分页行为
- **AND** 本整理 SHALL NOT 修改后端 API、路由、权限、保存 payload、i18n 文案或业务运行时逻辑
