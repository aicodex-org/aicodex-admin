# admin-enterprise-organization-identity-center Specification

## Purpose
TBD - created by archiving change improve-admin-enterprise-organization-identity-center. Update Purpose after archive.
## Requirements
### Requirement: 组织与身份域工作台
Admin 管理员访问组织、用户、角色或权限相关列表页时，系统 SHALL 在既有列表上方展示企业认证中心风格的组织身份域工作台，帮助管理员理解当前组织身份治理状态和下一步入口。

#### Scenario: 管理员访问组织列表
- **WHEN** 已登录管理员访问 `/organizations`
- **THEN** 页面在组织表格上方展示组织身份域工作台
- **AND** 工作台展示当前视图的组织分页 total、当前页已加载行数和组织治理入口
- **AND** 原组织列表的新增、编辑、删除、筛选、排序和分页行为保持可用

#### Scenario: 管理员访问用户列表
- **WHEN** 已登录管理员访问 `/users` 或 `/organizations/:organizationName/users`
- **THEN** 页面在用户表格上方展示组织身份域工作台
- **AND** 工作台以当前组织/筛选视图口径展示用户 total 和已加载行数
- **AND** 页面继续保留原用户导入、新增、编辑、删除、模拟登录、筛选、排序和分页行为

#### Scenario: 管理员访问权限治理列表
- **WHEN** 已登录管理员访问 `/roles` 或 `/permissions`
- **THEN** 页面在角色或权限表格上方展示组织身份域工作台
- **AND** 工作台提供到角色、权限和目录质量/同步诊断相关既有入口的跳转
- **AND** 不改变角色或权限审批、创建、删除、上传和编辑语义

#### Scenario: 摘要口径不包装成全量事实
- **WHEN** 工作台展示数量、风险或提示
- **THEN** 文案 SHALL 明确这些摘要来自当前列表视图、分页 total、已加载表格行或既有只读前端状态
- **AND** 不声称已经完成跨租户、跨组织或后端全量治理统计

### Requirement: 组织身份入口与 IA 兼容
组织身份域工作台 SHALL 覆盖组织、用户、部门、角色/权限、目录质量和组织同步诊断入口，同时保持运行时侧栏与组织配置页导航树使用相同 IA 和稳定叶子 key。

#### Scenario: 工作台提供既有入口
- **WHEN** 管理员查看组织身份域工作台
- **THEN** 工作台提供到 `/organizations`、`/groups`、`/users`、`/organization-tree-operations`、`/organization-directory-quality`、`/roles`、`/permissions`、`/providers`、`/wecom-org-sync` 和 `/feishu-org-sync` 的既有入口
- **AND** 点击入口只导航到现有页面，不触发同步执行、授权刷新或 Gateway projection 操作

#### Scenario: 导航配置树复用运行时 IA
- **WHEN** 管理员在组织配置页编辑 `navItems` 或 `userNavItems`
- **THEN** 配置树展示与运行时侧栏一致的组织身份、身份认证和权限治理分组
- **AND** 配置值仍使用既有稳定叶子 key，不引入不兼容权限 key

#### Scenario: 权限过滤保持兼容
- **WHEN** 组织配置限制 `navItems` 或 `userNavItems`
- **THEN** 运行时侧栏仍按稳定叶子 key 过滤可见菜单
- **AND** 工作台只展示跳转到既有路由的入口，不绕过页面级登录和权限检查
