## ADDED Requirements

### Requirement: 身份源列表页应使用统一列表壳
Admin 身份源相关的标准分页列表页 SHALL 复用统一列表壳、查询工具栏、表格密度和分页视觉规则。

#### Scenario: 组织同步密钥列表迁移到统一列表壳
- **WHEN** 管理员打开 `/organization-sync-api-keys`
- **THEN** 页面 SHALL 使用统一的列表标题、右上动作区、查询工具栏、表格壳和分页布局
- **AND** 新增、编辑、删除、查询、排序和分页行为 SHALL 保持现有后端契约不变

#### Scenario: 同步器列表迁移到统一列表壳
- **WHEN** 管理员打开 `/syncers`
- **THEN** 页面 SHALL 使用统一的列表标题、右上动作区、查询工具栏、表格壳和分页布局
- **AND** 新增、编辑、删除、查询、排序和分页行为 SHALL 保持现有后端契约不变
