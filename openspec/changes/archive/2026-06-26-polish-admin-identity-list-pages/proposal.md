## Why

角色、权限和 Casbin 列表已经承载明确的对象管理任务，但此前顶部工作台和固定列视觉会重复侧栏已有入口、压低表格，并在桌面宽度足够时制造不必要的 sticky 分割线。现在需要把这批页面收敛到与组织账号列表一致的列表优先体验。

## What Changes

- 角色和权限页改为直接进入紧凑统一列表壳，不再渲染独立的对象工作台、风险矩阵或引用矩阵。
- 角色、权限、模型、适配器和执行器列表继续展示标题、搜索、更多筛选、表格、分页和行操作，保持既有查询、排序、分页、新增、编辑、删除语义不变。
- 模型、适配器和执行器列表在标准桌面列表宽度内不再配置左右固定列，避免固定列阴影或分割线成为视觉噪声。
- 不新增后端 API，不改变权限 key、路由、认证、授权发布、同步执行或 Gateway projection 行为。

## Capabilities

### New Capabilities

无。

### Modified Capabilities

- `admin-enterprise-organization-identity-center`: 调整角色和权限页的组织身份实体工作台契约，明确这两个页面使用列表优先壳而不是独立顶部工作台。
- `admin-enterprise-identity-application-access-center`: 扩展权限和 Casbin 列表页统一列表壳要求，约束桌面列宽可容纳时不得配置不必要固定列。

## Impact

- 前端代码：`web-admin/src/OrganizationIdentityCenter.tsx`、角色/权限列表页、模型/适配器/执行器列表页和相关样式。
- 前端测试：角色/权限、模型/适配器/执行器以及身份中心 wrapper 的聚焦测试。
- API / 数据库 / 权限：无变更。
