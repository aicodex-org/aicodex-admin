## Why

组织页当前把共享查询工具栏的 `advancedFilters` 传成一个“高级筛选”文本占位。管理员展开后只能看到空标题式内容，按钮状态会变成“收起筛选”，但没有任何可操作字段，也不会产生高级查询语义。

本 change 修正组织页高级筛选体验：基础查询仍保持单字段路径；高级筛选展开后列出组织页可查询属性，用户填写多个非空条件时按 AND 语义过滤，重置时一并清空基础查询和高级筛选。

## What Changes

- 在组织列表页的高级筛选区域渲染真实字段输入，字段来源复用组织页查询字段定义，避免基础查询和高级筛选字段漂移。
- 基础查询继续通过现有 `OrganizationBackend.getOrganizations` 的 `field + value` 参数执行单字段查询。
- 高级筛选存在非空条件时，先使用现有组织列表未分页请求路径获取当前组织 scope 下的候选列表，再在组织页前端按所有非空条件 AND 过滤；分页 total 和当前页数据按过滤后结果展示。
- 重置动作清空基础查询字段、基础关键词和所有高级筛选条件。
- 共享 `EnterpriseListQueryToolbar` 只有在存在真实高级筛选内容时才渲染“更多筛选”按钮。
- 补充组织页与共享工具栏聚焦测试、OpenSpec 验证和浏览器布局 smoke。

## Impact

- 主要前端文件：`web-admin/src/OrganizationListPage.tsx`、`web-admin/src/common/EnterpriseListQueryToolbar.tsx` 及其测试。
- 样式：仅补充高级筛选输入栅格和窄屏换行规则。
- OpenSpec：更新 `admin-enterprise-organization-identity-center` 的组织账号列表查询工具栏 requirement。
- 不新增后端 API，不修改组织同步、认证、授权、Gateway、Insight、Admin 服务凭据治理、workspace tabs 或 `test` 分支。
