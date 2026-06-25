## ADDED Requirements

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
