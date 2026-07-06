## ADDED Requirements

### Requirement: 身份对象编辑页可使用单页固定操作栏

Admin 身份控制台 Shell SHALL 允许 Group、Role、Permission 或 Invitation 等身份对象编辑页按对象复杂度采用单页编辑壳和固定底部操作栏，并保持同一页面内只有一个主要编辑壳。

#### Scenario: 群组编辑页使用单页固定操作栏
- **WHEN** 管理员在桌面端访问 `/groups/:organizationName/:groupName`
- **THEN** 群组编辑页 SHALL 使用单个主编辑壳承载返回路径、基础信息表单和固定底部动作栏
- **AND** route scroll 容器与页面内部编辑壳 SHALL NOT 叠加出多套标题和保存动作
- **AND** 群组编辑页 SHALL 保留 `group-edit-page` 与 `group-edit-card` 或等价 scoped class 供测试、smoke 和后续局部修复定位

#### Scenario: 身份对象编辑页不制造页面级横向溢出
- **WHEN** 管理员在 `1280px` 或 `1920px` 桌面宽度访问群组编辑页
- **THEN** Shell 根文档 SHALL NOT 因表单 label gutter、长选择器或内部编辑壳产生不必要的页面级横向 overflow
- **AND** 长成员摘要或局部组件 SHALL 在自身容器内换行、截断或滚动

#### Scenario: 群组详情工作区标签可区分
- **WHEN** 管理员打开多个 `/groups/:organizationName/:groupName` 群组详情页
- **THEN** 工作区顶部标签 SHALL 使用群组标识或显示名称区分不同群组页
- **AND** 群组数据加载后 SHALL 能将当前标签从路由标识更新为群组显示名称

#### Scenario: 其它身份对象页可后续迁移
- **WHEN** Role、Permission 或 Invitation 编辑页尚未迁移到固定底部操作栏
- **THEN** 本 change SHALL NOT 要求同批改造这些页面
- **AND** 后续迁移 SHALL 保持各自保存 payload、路由语义和后端契约不变
