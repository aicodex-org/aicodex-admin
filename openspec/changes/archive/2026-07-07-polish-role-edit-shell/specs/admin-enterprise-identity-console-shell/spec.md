## ADDED Requirements

### Requirement: 角色编辑页应使用轻量单页固定操作栏

Admin 身份控制台 Shell SHALL 允许角色编辑页使用共享编辑框架承载角色元信息与授权范围维护，使管理员能够稳定返回、取消、保存或保存并返回，同时避免把中等数量字段拆成空 Tabs。

#### Scenario: 角色编辑页使用单页分区而不是 Tabs
- **WHEN** 管理员打开 `/roles/:organizationName/:roleName`
- **THEN** 页面 SHALL 使用单个主编辑壳展示角色编辑内容
- **AND** 页面 SHALL 以 `基础信息` 和 `授权范围` 两个区块组织字段
- **AND** 页面 SHALL NOT 为当前字段量渲染页内 Tabs
- **AND** 页面 SHALL 保留 `role-edit-page` 与 `role-edit-card` 或等价 scoped class 供测试、smoke 和后续局部修复定位

#### Scenario: 角色编辑页返回路径和底部动作保持可达
- **WHEN** 管理员在角色编辑页滚动或编辑字段
- **THEN** 页面顶部 SHALL 提供返回入口、组织账号路径和角色编辑标题
- **AND** 页面底部 SHALL 保留固定操作栏
- **AND** 操作栏按钮顺序 SHALL 为 `取消`、`保存`、`保存并返回`
- **AND** 页面 SHALL 与组织编辑页共用同类头部和底部操作栏视觉规则
- **AND** 角色编辑路由 SHALL 使用无外层 content Card 的内部滚动容器，使底部操作栏固定在编辑区域底部
- **AND** 页面 SHALL NOT 同时保留旧 Card 标题内保存按钮和正文底部重复保存按钮

#### Scenario: 角色编辑页保存语义保持兼容
- **WHEN** 管理员点击 `保存`
- **THEN** 页面 SHALL 使用现有 `RoleBackend.updateRole` 保存角色并停留在当前角色编辑页
- **AND** 页面 SHALL 保持现有保存 payload、角色名路由更新和错误回滚语义
- **WHEN** 管理员点击 `保存并返回`
- **THEN** 页面 SHALL 保存角色并返回 `/roles`

#### Scenario: 角色编辑页取消和返回保护未保存修改
- **WHEN** 管理员修改角色字段后点击返回或取消
- **THEN** 页面 SHALL 在离开前要求确认未保存修改
- **AND** 新增模式点击取消并确认离开后 SHALL 保留既有删除临时角色对象语义

#### Scenario: 角色编辑页必填字段保存前校验
- **WHEN** 管理员清空角色 `名称` 或 `显示名称` 后点击保存类按钮
- **THEN** 页面 SHALL 阻止提交到角色保存 API
- **AND** 缺失字段 SHALL 展示红色 `*` 和可读错误提示
- **AND** 页面 SHALL 展示本地化错误消息说明需补齐必填字段
