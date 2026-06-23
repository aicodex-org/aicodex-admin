## Why

群组列表已经完成表格密度、查询工具栏和横向滚动降噪优化，组织列表仍保留过多低频技术列和独立的顶部操作位置，导致相似列表页体验不一致。现在需要把已验收的列表页模式复用到组织页，同时保留组织页自己的筛选字段、目录健康上下文和既有后端契约。

## What Changes

- 组织列表默认列收敛到核心识别、访问、密码策略、软删除状态和行级操作，默认隐藏 `Salt`、头像、余额、额度和币种等低频详情字段。
- 组织列表复用共享 `ListPageTable` 表格壳，继承统一密度、边框、排序提示和固定布局策略。
- 组织列表复用共享查询工具栏动作区，将 `添加` 放入工具栏 action 区并继续遵守管理员权限。
- 桌面端组织表格优先使用表格内部纵向滚动，使标签页、搜索头和上下文保持稳定；移动端保留横向滚动兜底。
- 保留组织页专属高级筛选字段、目录健康辅助上下文、群组/用户跳转、编辑、删除和既有 `OrganizationBackend` 查询/排序/分页语义。
- 本 change 不改后端 API、不新增组织同步/修复动作、不强制改造用户、应用接入等其它列表页。

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `admin-enterprise-organization-identity-center`: 收敛组织列表默认字段，并要求组织列表复用共享列表表格与查询工具栏模式，同时保持组织页专属字段和既有业务语义兼容。

## Impact

- Affected code: `web-admin/src/OrganizationListPage.tsx`, `web-admin/src/OrganizationListPage.test.tsx`
- Reused code: `web-admin/src/common/ListPageTable.tsx`, `web-admin/src/common/EnterpriseListQueryToolbar.tsx`
- Affected UI: `/organizations`
- No backend API, database, dependency, authentication, authorization, sync, Gateway projection, or external-system execution changes.
