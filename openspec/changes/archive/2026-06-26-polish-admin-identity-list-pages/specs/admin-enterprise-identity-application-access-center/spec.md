## MODIFIED Requirements

### Requirement: 权限和 Casbin 列表页应使用统一列表壳
Admin 权限角色和 Casbin 相关标准分页列表页 SHALL 复用统一列表壳、查询工具栏、表格密度和分页视觉规则。

#### Scenario: 角色和权限列表迁移到统一列表壳
- **WHEN** 管理员打开 `/roles` 或 `/permissions`
- **THEN** 页面 SHALL 使用统一的列表标题、右上动作区、查询工具栏、表格壳和分页布局
- **AND** 新增、编辑、删除、查询、排序和分页行为 SHALL 保持现有后端契约不变

#### Scenario: Casbin 模型、适配器和执行器列表迁移到统一列表壳
- **WHEN** 管理员打开 `/models`、`/adapters` 或 `/enforcers`
- **THEN** 页面 SHALL 使用统一的列表标题、右上动作区、查询工具栏、表格壳和分页布局
- **AND** 新增、编辑、删除、查询、排序和分页行为 SHALL 保持现有后端契约不变

#### Scenario: 桌面可容纳时不配置固定列
- **WHEN** 管理员在标准桌面列表宽度访问 `/roles`、`/permissions`、`/models`、`/adapters` 或 `/enforcers`
- **THEN** 表格列若能在列表容器内展示核心字段和操作列，页面 SHALL NOT 配置 AntD 左右固定列
- **AND** 页面 SHALL NOT 因不必要的 fixed column 产生长期可见的 sticky 分割线、阴影或额外横向滚动依赖
- **AND** 行级操作 SHALL 作为普通操作列保持可见和可点击
- **AND** 窄屏、移动端或极小容器 MAY 使用表格内部横向滚动作为兜底
