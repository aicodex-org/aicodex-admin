## ADDED Requirements

### Requirement: 组织账号列表页应使用统一列表壳
Admin 组织账号列表页 SHALL 对标准分页列表复用统一列表壳、查询工具栏、表格密度和分页视觉规则。

#### Scenario: 邀请码列表迁移到统一列表壳
- **WHEN** 管理员打开 `/invitations`
- **THEN** 页面 SHALL 使用统一的列表标题、右上动作区、查询工具栏、表格壳和分页布局
- **AND** 新增、编辑、删除、查询、排序和分页行为 SHALL 保持现有后端契约不变

#### Scenario: 授权关系与证据暂不纳入本次迁移
- **WHEN** 管理员打开 `/identity-assets`
- **THEN** 本 change SHALL NOT 强制迁移该页面到标准查询分页列表壳
- **AND** 授权关系与证据页面 SHALL 保留后续单独评估空间
